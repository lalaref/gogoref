// Google Sheets Configuration
const SHEET_CONFIG = {
    SHEET_ID: '1lsP6VImpOraHe8g-Apgc86R8se4Dfpe5gBLHbKuPFT0',
    SHEETS: {
        saturday: 'SAT, Nov 8 Timetable',
        sunday: 'SUN, Nov 9 Timetable'
    },
    API_BASE: 'https://docs.google.com/spreadsheets/d/'
};

// Category colors based on your image
const CATEGORY_COLORS = {
    'U8': '#ffb6c1',
    'U10': '#87ceeb',
    'U12': '#98d8c8',
    'U14': '#f4d03f',
    'default': '#667eea'
};

let allSchedules = {
    saturday: [],
    sunday: []
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadTimetable();
    setupTabListeners();
});

// Setup tab listeners
function setupTabListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const day = this.getAttribute('data-day');
            showDay(day);
        });
    });
}

// Load timetable from Google Sheets
async function loadTimetable() {
    showLoading();
    
    try {
        // Load both sheets
        const saturdayData = await fetchSheet(SHEET_CONFIG.SHEETS.saturday);
        const sundayData = await fetchSheet(SHEET_CONFIG.SHEETS.sunday);
        
        // Parse data
        allSchedules.saturday = parseSchedule(saturdayData);
        allSchedules.sunday = parseSchedule(sundayData);
        
        // Display schedules
        displaySchedule('saturday', allSchedules.saturday);
        displaySchedule('sunday', allSchedules.sunday);
        
        // Show tabs
        document.getElementById('dayTabs').style.display = 'flex';
        document.getElementById('loadingIndicator').style.display = 'none';
        
        // Update last update time
        updateLastUpdateTime();
        
        // Track success
        if (typeof gtag !== 'undefined') {
            gtag('event', 'timetable_loaded', {
                event_category: 'data',
                event_label: 'success'
            });
        }
        
    } catch (error) {
        console.error('Error loading timetable:', error);
        showError();
        
        if (typeof gtag !== 'undefined') {
            gtag('event', 'timetable_error', {
                event_category: 'data',
                event_label: error.message
            });
        }
    }
}

// Fetch sheet data
async function fetchSheet(sheetName) {
    const csvUrl = `${SHEET_CONFIG.API_BASE}${SHEET_CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
        throw new Error('Failed to fetch data');
    }
    
    return await response.text();
}

// Parse schedule data
function parseSchedule(csvText) {
    const lines = csvText.split('\n');
    const events = [];
    let currentCategory = '';
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const fields = parseCSVLine(line);
        
        if (fields.length >= 2) {
            const time = cleanField(fields[0]);
            const activity = cleanField(fields[1]);
            const category = cleanField(fields[2] || currentCategory);
            
            // Update current category if found
            if (category) {
                currentCategory = category;
            }
            
            // Determine if this is a special event
            const isHighlight = activity.includes('Ceremony') || 
                              activity.includes('AXA Family') ||
                              activity.includes('Grand');
            
            events.push({
                time: time,
                activity: activity,
                category: category,
                highlight: isHighlight
            });
        }
    }
    
    return events;
}

// Parse CSV line
function parseCSVLine(line) {
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(currentField);
            currentField = '';
        } else {
            currentField += char;
        }
    }
    
    fields.push(currentField);
    return fields;
}

// Clean field
function cleanField(field) {
    return field.replace(/^"|"$/g, '').trim();
}

// Display schedule
function displaySchedule(day, events) {
    const container = document.getElementById(`${day}-schedule`);
    container.innerHTML = '';
    
    if (events.length === 0) {
        container.innerHTML = '<p class="no-events">暫無活動安排</p>';
        return;
    }
    
    events.forEach(event => {
        const eventCard = createEventCard(event);
        container.appendChild(eventCard);
    });
}

// Create event card
function createEventCard(event) {
    const card = document.createElement('div');
    card.className = `event-card ${event.highlight ? 'highlight' : ''}`;
    
    // Get category color
    const categoryColor = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.default;
    
    card.innerHTML = `
        <div class="event-header" style="border-left: 5px solid ${categoryColor}">
            <div class="event-time">
                <i class="fas fa-clock"></i>
                ${event.time}
            </div>
            ${event.category ? `
            <span class="event-category" style="background: ${categoryColor}">
                ${event.category}
            </span>
            ` : ''}
        </div>
        
        <div class="event-content">
            <h3 class="event-title">${event.activity}</h3>
        </div>
    `;
    
    return card;
}

// Show day
function showDay(day) {
    // Hide all schedules
    document.querySelectorAll('.schedule-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected schedule
    document.getElementById(`${day}-schedule`).classList.add('active');
    
    // Mark selected tab
    document.querySelector(`[data-day="${day}"]`).classList.add('active');
    
    // Track tab change
    if (typeof gtag !== 'undefined') {
        gtag('event', 'tab_changed', {
            event_category: 'user_interaction',
            event_label: day
        });
    }
}

// Update last update time
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleString('zh-HK', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('lastUpdate').textContent = timeString;
}

// Show loading
function showLoading() {
    document.getElementById('loadingIndicator').style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('dayTabs').style.display = 'none';
}

// Show error
function showError() {
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'block';
    document.getElementById('dayTabs').style.display = 'none';
}

// Auto-refresh every 5 minutes
setInterval(() => {
    loadTimetable();
}, 5 * 60 * 1000);
