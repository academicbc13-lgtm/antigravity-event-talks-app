// Global state
let releaseData = null;
let selectedItems = new Map(); // id -> item object
let isTextareaDirty = false;
let currentStyle = 'standard';

// DOM Elements
const notesTimeline = document.getElementById('notesTimeline');
const feedLoading = document.getElementById('feedLoading');
const feedError = document.getElementById('feedError');
const errorMessage = document.getElementById('errorMessage');
const feedEmpty = document.getElementById('feedEmpty');

const searchInput = document.getElementById('searchInput');
const typeFilters = document.getElementById('typeFilters');
const lastUpdatedTime = document.getElementById('lastUpdatedTime');
const refreshBtn = document.getElementById('refreshBtn');
const btnSpinner = document.getElementById('btnSpinner');
const errorRetryBtn = document.getElementById('errorRetryBtn');

const selectionStatus = document.getElementById('selectionStatus');
const composerPlaceholder = document.getElementById('composerPlaceholder');
const composerActive = document.getElementById('composerActive');
const composerSelectionCount = document.getElementById('composerSelectionCount');
const tweetTextarea = document.getElementById('tweetTextarea');
const charProgress = document.getElementById('charProgress');
const charCounter = document.getElementById('charCounter');
const tweetPostBtn = document.getElementById('tweetPostBtn');

const styleChips = document.querySelectorAll('.template-chip');
const includeLinkToggle = document.getElementById('includeLinkToggle');
const includeHashtagsToggle = document.getElementById('includeHashtagsToggle');
const toastNotification = document.getElementById('toastNotification');
const toastMessage = document.getElementById('toastMessage');

// Progress ring circumference
const CIRCUMFERENCE = 2 * Math.PI * 14; // r=14, approx 87.96
charProgress.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Setup Events
function setupEventListeners() {
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    errorRetryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search & Filtering
    searchInput.addEventListener('input', filterTimeline);
    
    typeFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-tag')) {
            document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
            e.target.classList.add('active');
            filterTimeline();
        }
    });

    // Tweet Composer Toggles & Styles
    includeLinkToggle.addEventListener('change', regenerateTweet);
    includeHashtagsToggle.addEventListener('change', regenerateTweet);
    
    styleChips.forEach(chip => {
        chip.addEventListener('click', () => {
            styleChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentStyle = chip.dataset.style;
            isTextareaDirty = false; // Reset dirty flag to allow styling overwrite
            regenerateTweet();
        });
    });

    tweetTextarea.addEventListener('input', () => {
        isTextareaDirty = true;
        updateCharCount();
    });

    tweetPostBtn.addEventListener('click', postTweet);
}

// Fetch Data from Server API
async function fetchReleaseNotes(forceRefresh = false) {
    showLoading(true);
    showError(false);
    
    try {
        const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Server error occurred');
        }
        
        const res = await response.json();
        releaseData = res.data;
        lastUpdatedTime.textContent = res.last_fetched || 'Just now';
        
        renderTimeline();
        showLoading(false);
        if (forceRefresh) {
            showToast('Feed refreshed successfully');
        }
    } catch (err) {
        showLoading(false);
        showError(true, err.message);
    }
}

// UI State Toggles
function showLoading(isLoading) {
    if (isLoading) {
        feedLoading.classList.remove('hide');
        notesTimeline.classList.add('hide');
        refreshBtn.disabled = true;
        btnSpinner.classList.remove('hide');
    } else {
        feedLoading.classList.add('hide');
        notesTimeline.classList.remove('hide');
        refreshBtn.disabled = false;
        btnSpinner.classList.add('hide');
    }
}

function showError(hasError, msg = '') {
    if (hasError) {
        errorMessage.textContent = msg;
        feedError.classList.remove('hide');
        notesTimeline.classList.add('hide');
    } else {
        feedError.classList.add('hide');
    }
}

function showToast(message) {
    toastMessage.textContent = message;
    toastNotification.classList.remove('hide');
    setTimeout(() => {
        toastNotification.classList.add('hide');
    }, 3000);
}

// Render Timeline to DOM
function renderTimeline() {
    notesTimeline.innerHTML = '';
    
    if (!releaseData || !releaseData.entries || releaseData.entries.length === 0) {
        feedEmpty.classList.remove('hide');
        return;
    }
    
    feedEmpty.classList.add('hide');
    
    releaseData.entries.forEach(entry => {
        if (!entry.items || entry.items.length === 0) return;
        
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        dateGroup.dataset.date = entry.date;
        
        // Date Header
        dateGroup.innerHTML = `
            <div class="date-header">
                <div class="date-marker"></div>
                <div class="date-title">${entry.title}</div>
                <div class="date-badge">Release</div>
            </div>
            <div class="update-items-list"></div>
        `;
        
        const itemsList = dateGroup.querySelector('.update-items-list');
        
        entry.items.forEach(item => {
            const card = document.createElement('div');
            card.className = `update-card ${selectedItems.has(item.id) ? 'selected' : ''}`;
            card.dataset.id = item.id;
            card.dataset.type = item.type;
            card.dataset.search = (item.type + ' ' + item.raw_text).toLowerCase();
            
            // Check if selected
            const isChecked = selectedItems.has(item.id) ? 'checked' : '';
            
            card.innerHTML = `
                <!-- Selector Checkbox -->
                <div class="card-selector-area">
                    <label class="card-selector">
                        <input type="checkbox" class="update-checkbox" data-id="${item.id}" ${isChecked}>
                        <span class="custom-checkbox"></span>
                    </label>
                </div>
                
                <!-- Main Details -->
                <div class="card-content-area">
                    <div class="card-meta">
                        <span class="type-badge ${item.type.toLowerCase()}">${item.type}</span>
                    </div>
                    <div class="card-body">
                        ${item.content}
                    </div>
                </div>
                
                <!-- Direct Tweet Button -->
                <div class="card-actions-area">
                    <button class="tweet-action-btn" title="Tweet only this update">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                    </button>
                </div>
            `;
            
            // Register card events
            const checkbox = card.querySelector('.update-checkbox');
            checkbox.addEventListener('change', (e) => toggleItemSelection(item, entry, e.target.checked));
            
            // Clicking card (except links and checkboxes) selects it
            card.addEventListener('click', (e) => {
                if (e.target.tagName !== 'A' && e.target.tagName !== 'INPUT' && !e.target.closest('.card-selector') && !e.target.closest('.tweet-action-btn') && !e.target.closest('a')) {
                    checkbox.checked = !checkbox.checked;
                    toggleItemSelection(item, entry, checkbox.checked);
                }
            });
            
            // Direct Tweet Button
            const directTweetBtn = card.querySelector('.tweet-action-btn');
            directTweetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Select only this item
                clearAllSelections();
                checkbox.checked = true;
                toggleItemSelection(item, entry, true);
                
                // Scroll to composer on mobile/tablets
                if (window.innerWidth <= 1200) {
                    composerActive.scrollIntoView({ behavior: 'smooth' });
                }
                
                // Focus textarea
                setTimeout(() => tweetTextarea.focus(), 300);
            });
            
            itemsList.appendChild(card);
        });
        
        notesTimeline.appendChild(dateGroup);
    });
    
    // Run initial filter in case inputs have values
    filterTimeline();
}

// Search and Filter logic
function filterTimeline() {
    const query = searchInput.value.toLowerCase().trim();
    const activeFilterTag = document.querySelector('.filter-tag.active');
    const selectedType = activeFilterTag ? activeFilterTag.dataset.type : 'all';
    
    let visibleGroups = 0;
    let totalVisibleCards = 0;
    
    const dateGroups = document.querySelectorAll('.date-group');
    
    dateGroups.forEach(group => {
        const cards = group.querySelectorAll('.update-card');
        let visibleCardsInGroup = 0;
        
        cards.forEach(card => {
            const cardType = card.dataset.type;
            const searchText = card.dataset.search;
            
            const matchesType = (selectedType === 'all' || cardType.toLowerCase() === selectedType.toLowerCase());
            const matchesSearch = (!query || searchText.includes(query));
            
            if (matchesType && matchesSearch) {
                card.classList.remove('hide');
                visibleCardsInGroup++;
                totalVisibleCards++;
            } else {
                card.classList.add('hide');
            }
        });
        
        if (visibleCardsInGroup > 0) {
            group.classList.remove('hide');
            visibleGroups++;
        } else {
            group.classList.add('hide');
        }
    });
    
    // Empty state visibility
    if (totalVisibleCards === 0 && releaseData && releaseData.entries.length > 0) {
        feedEmpty.classList.remove('hide');
    } else {
        feedEmpty.classList.add('hide');
    }
}

// Clear all selections
function clearAllSelections() {
    selectedItems.clear();
    document.querySelectorAll('.update-card').forEach(card => {
        card.classList.remove('selected');
        const cb = card.querySelector('.update-checkbox');
        if (cb) cb.checked = false;
    });
    isTextareaDirty = false;
    updateSelectionUI();
}

// Selection Manager
function toggleItemSelection(item, entry, isChecked) {
    const card = document.querySelector(`.update-card[data-id="${item.id}"]`);
    
    if (isChecked) {
        selectedItems.set(item.id, {
            ...item,
            entryDate: entry.date,
            entryTitle: entry.title,
            entryLink: entry.link
        });
        if (card) card.classList.add('selected');
    } else {
        selectedItems.delete(item.id);
        if (card) card.classList.remove('selected');
    }
    
    // If user changes selection, we regenerate tweet (unless dirty, but for selections we usually regenerate)
    isTextareaDirty = false; 
    updateSelectionUI();
}

// Update Selection Count and Composer visibility
function updateSelectionUI() {
    const count = selectedItems.size;
    
    // Status text in content header
    selectionStatus.textContent = `${count} update${count !== 1 ? 's' : ''} selected`;
    
    if (count > 0) {
        composerPlaceholder.classList.add('hide');
        composerActive.classList.remove('hide');
        composerSelectionCount.textContent = `${count} item${count !== 1 ? 's' : ''} selected`;
        regenerateTweet();
    } else {
        composerPlaceholder.classList.remove('hide');
        composerActive.classList.add('hide');
        tweetTextarea.value = '';
    }
}

// Auto-compile Tweet Draft
function regenerateTweet() {
    if (isTextareaDirty) return; // Don't overwrite manual edits
    
    const count = selectedItems.size;
    if (count === 0) {
        tweetTextarea.value = '';
        updateCharCount();
        return;
    }
    
    // Sort selected items chronologically (latest first, just as they are in Map)
    const items = Array.from(selectedItems.values());
    
    // Options
    const includeLink = includeLinkToggle.checked;
    const includeHashtags = includeHashtagsToggle.checked;
    
    let tweetText = '';
    
    if (currentStyle === 'standard') {
        if (items.length === 1) {
            const item = items[0];
            const cleanText = truncateString(item.raw_text, 180);
            tweetText = `BigQuery Update (${item.entryTitle}) 🚀\n\n📢 ${item.type}: ${cleanText}`;
        } else {
            tweetText = `Latest BigQuery Updates 🛠️\n\n`;
            items.forEach((item, index) => {
                const prefix = `${index + 1}. [${item.type}] `;
                const snippet = truncateString(item.raw_text, 180 / items.length);
                tweetText += `${prefix}${snippet}\n`;
            });
        }
    } else if (currentStyle === 'bullet') {
        tweetText = `New in BigQuery 🔹\n\n`;
        items.forEach(item => {
            const snippet = truncateString(item.raw_text, 150 / items.length);
            tweetText += `⚡ ${item.type}: ${snippet}\n`;
        });
    } else if (currentStyle === 'hype') {
        if (items.length === 1) {
            const item = items[0];
            tweetText = `BigQuery just dropped a game-changing update! 🔥\n\n👉 ${item.type}: ${truncateString(item.raw_text, 160)}\n\nCheck it out! 👇`;
        } else {
            tweetText = `BigQuery is cooking! 🧑‍🍳 Massive updates just released:\n\n`;
            items.forEach(item => {
                tweetText += `🚀 ${item.type}: ${truncateString(item.raw_text, 70)}\n`;
            });
            tweetText += `\nRead details below! 👇`;
        }
    } else if (currentStyle === 'short') {
        const item = items[0];
        const snippet = truncateString(item.raw_text, 120);
        if (items.length === 1) {
            tweetText = `BigQuery: ${snippet}`;
        } else {
            tweetText = `Multiple BigQuery updates released including: ${truncateString(items[0].raw_text, 100)}`;
        }
    }
    
    // Append link if checked
    if (includeLink) {
        // Use link of the first entry, or the general release notes page
        const link = items[0].entryLink || "https://cloud.google.com/bigquery/docs/release-notes";
        tweetText += `\n\n🔗 ${link}`;
    }
    
    // Append hashtags if checked
    if (includeHashtags) {
        tweetText += `\n\n#BigQuery #GoogleCloud`;
    }
    
    tweetTextarea.value = tweetText;
    updateCharCount();
}

// Text Helper
function truncateString(str, num) {
    if (str.length <= num) {
        return str;
    }
    return str.slice(0, num) + '...';
}

// Update Character Count progress ring & count indicator
function updateCharCount() {
    const text = tweetTextarea.value;
    const length = text.length;
    const limit = 280;
    const remaining = limit - length;
    
    charCounter.textContent = remaining;
    
    // Colors based on length
    if (remaining < 0) {
        charCounter.className = 'char-count-text error';
        charProgress.style.stroke = 'var(--color-issue)';
    } else if (remaining <= 40) {
        charCounter.className = 'char-count-text warning';
        charProgress.style.stroke = 'var(--color-change)';
    } else {
        charCounter.className = 'char-count-text';
        charProgress.style.stroke = 'var(--accent-blue)';
    }
    
    // Progress Ring offset
    const progress = Math.min(length / limit, 1.0);
    const strokeDashoffset = CIRCUMFERENCE - (progress * CIRCUMFERENCE);
    charProgress.style.strokeDashoffset = strokeDashoffset;
}

// Open X / Twitter Web Intent to Post
function postTweet() {
    const text = tweetTextarea.value.trim();
    if (!text) {
        showToast('Please select updates or enter some text first');
        return;
    }
    
    const limit = 280;
    if (text.length > limit) {
        showToast('Post exceeds the standard character limit of 280!');
    }
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    showToast('Redirected to X/Twitter!');
}
