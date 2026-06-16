import os
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Cache for release notes to avoid hitting Google feed on every single click
# Simple in-memory cache
cache = {
    "data": None,
    "last_fetched": None
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_text(text):
    # Normalize spaces and remove excessive newlines
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return " ".join(lines)

def parse_feed():
    try:
        response = requests.get(FEED_URL, timeout=10)
        if response.status_code != 200:
            return None, f"Failed to fetch feed, status code: {response.status_code}"
            
        feed = feedparser.parse(response.content)
        
        parsed_entries = []
        for index, entry in enumerate(feed.entries):
            title = entry.get('title', 'Unknown Date')
            updated = entry.get('updated', entry.get('published', ''))
            link = entry.get('link', '')
            
            # Use id from feed, fallback to slugified title
            entry_id = entry.get('id', title.replace(' ', '_').replace(',', ''))
            
            # Content value
            content_val = ""
            if 'content' in entry and len(entry.content) > 0:
                content_val = entry.content[0].value
            elif 'summary' in entry:
                content_val = entry.summary
                
            items = []
            if content_val:
                soup = BeautifulSoup(content_val, 'html.parser')
                h3_tags = soup.find_all('h3')
                
                if not h3_tags:
                    # Fallback to single item if no h3 structure is found
                    text_content = clean_text(soup.get_text())
                    items.append({
                        "id": f"{entry_id}-0",
                        "type": "Update",
                        "content": content_val,
                        "raw_text": text_content
                    })
                else:
                    current_type = None
                    current_nodes = []
                    item_counter = 0
                    
                    # Group sibling nodes between h3 tags
                    for child in soup.children:
                        if child.name == 'h3':
                            if current_type and current_nodes:
                                html_str = "".join(str(node) for node in current_nodes).strip()
                                text_str = clean_text(BeautifulSoup(html_str, 'html.parser').get_text())
                                items.append({
                                    "id": f"{entry_id}-{item_counter}",
                                    "type": current_type,
                                    "content": html_str,
                                    "raw_text": text_str
                                })
                                item_counter += 1
                            current_type = child.get_text().strip()
                            current_nodes = []
                        elif child.name is not None:
                            if current_type is None:
                                # Content before any h3 tag
                                current_type = "Update"
                            current_nodes.append(child)
                            
                    # Add last item
                    if current_type and current_nodes:
                        html_str = "".join(str(node) for node in current_nodes).strip()
                        text_str = clean_text(BeautifulSoup(html_str, 'html.parser').get_text())
                        items.append({
                            "id": f"{entry_id}-{item_counter}",
                            "type": current_type,
                            "content": html_str,
                            "raw_text": text_str
                        })
            
            parsed_entries.append({
                "id": entry_id,
                "title": title,
                "date": updated[:10] if len(updated) >= 10 else updated,
                "updated": updated,
                "link": link,
                "items": items
            })
            
        return {
            "title": feed.feed.get('title', 'BigQuery Release Notes'),
            "link": feed.feed.get('link', 'https://cloud.google.com/bigquery/docs/release-notes'),
            "entries": parsed_entries
        }, None
        
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if force_refresh or cache["data"] is None:
        data, err = parse_feed()
        if err:
            return jsonify({"error": err}), 500
        cache["data"] = data
        from datetime import datetime
        cache["last_fetched"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
    return jsonify({
        "data": cache["data"],
        "last_fetched": cache["last_fetched"]
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
