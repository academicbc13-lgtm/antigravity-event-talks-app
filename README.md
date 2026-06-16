# BigQuery Release Notes Explorer & Tweet Composer

An elegant, modern single-page web application built with Python Flask, vanilla HTML5, CSS3, and JavaScript. It fetches the official Google Cloud BigQuery release notes Atom feed, decompenses daily releases into individual selectable cards, and compiles custom, styled drafts to share instantly on X (Twitter).

---

## ✨ Features

- **Granular Feed Decomposition**: Automatically extracts and divides individual updates (Features, Issues, Deprecations, Changes) within a single day's release notes into standalone, selectable items.
- **Modern Dark Aesthetic**: Fully responsive, high-fidelity dark slate and deep indigo theme featuring glassmorphism cards, micro-animations, and custom scrollbars.
- **Dynamic Live Search**: Filter release updates instantly by category types or by keyword queries in real-time.
- **Tweet Composer Suite**:
  - **Multi-Selection**: Compile tweets from single or multiple selected release updates.
  - **Styles & Templates**: Choose from different styling formats: Standard, Bullet highlights, Hype (impact-focused), or Short.
  - **References**: Custom toggles to append reference links and hashtags (`#BigQuery #GoogleCloud`).
  - **Interactive Character Counter**: Visual SVG countdown progress ring that alerts you as you approach the standard 280-character post limit.
- **X/Twitter Integration**: Direct sharing through X's Web Intent helper.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.13, Flask 3.1, `beautifulsoup4` (HTML traversal), `feedparser` (Atom/RSS validation)
- **Frontend**: Plain Semantic HTML5, Vanilla CSS3 (Custom design system), Vanilla JavaScript (ES6+ State management and UI rendering)

---

## 📁 Project Structure

```
├── app.py                  # Flask application server & feed parser
├── templates/
│   └── index.html          # HTML structural layout & layout containers
├── static/
│   ├── css/
│   │   └── styles.css      # Core styles, glassmorphism, responsive grid
│   └── js/
│       └── app.js          # Selection, compiler, character ring, client filter
└── .gitignore              # Files ignored by version control
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Python 3.x installed.

### 1. Clone the repository
```bash
git clone https://github.com/academicbc13-lgtm/antigravity-event-talks-app.git
cd antigravity-event-talks-app
```

### 2. Install dependencies
```bash
pip install flask requests feedparser beautifulsoup4
```

### 3. Run the development server
```bash
python app.py
```

The application will launch locally at **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## 🔄 Request-Response Lifecycle
1. **Fetch**: The client requests `/api/release-notes`.
2. **Retrieve**: The server checks the cache; if expired or forced by refresh, it downloads the Atom feed from `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`.
3. **Parse**: BeautifulSoup identifies `<h3>` tags in the HTML body to extract separate updates, returning structured JSON items to the browser.
4. **Render**: The frontend renders the timeline and filters items on the fly.
5. **Draft**: Checking cards compiles a tweet template in real-time, validating length before opening X's Web Intent interface.
