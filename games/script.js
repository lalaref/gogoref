// Google Sheets Configuration
const SHEET_CONFIG = {
    // Your Google Sheets ID from the URL
    SHEET_ID: '1lsP6VImpOraHe8g-Apgc86R8se4Dfpe5gBLHbKuPFT0',
    // The sheet name/tab (default is 'Sheet1', change if different)
    SHEET_NAME: 'Sheet1',
    // Google Sheets API endpoint
    API_BASE: 'https://docs.google.com/spreadsheets/d/'
};

// Global variables
let allGames = [];
let filteredGames = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadGames();
});

// Load games from Google Sheets
async function loadGames() {
    showLoading();
    
    try {
        // Construct the CSV export URL
        const csvUrl = `${SHEET_CONFIG.API_BASE}${SHEET_CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_CONFIG.SHEET_NAME}`;
        
        // Fetch the data
        const response = await fetch(csvUrl);
        
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        
        const csvText = await response.text();
        
        // Parse CSV data
        allGames = parseCSV(csvText);
        
        // Sort games by date (newest first)
        allGames.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Initialize filters
        initializeFilters();
        
        // Display games
        filteredGames = [...allGames];
        displayGames();
        
        // Show filter section
        document.getElementById('filterSection').style.display = 'flex';
        
        // Update last update time
        updateLastUpdateTime();
        
        // Track successful load
        if (typeof gtag !== 'undefined') {
            gtag('event', 'games_loaded', {
                event_category: 'data',
                event_label: 'success',
                value: allGames.length
            });
        }
        
    } catch (error) {
        console.error('Error loading games:', error);
        showError();
        
        // Track error
        if (typeof gtag !== 'undefined') {
            gtag('event', 'games_load_error', {
                event_category: 'data',
                event_label: error.message
            });
        }
    }
}

// Parse CSV data
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const games = [];
    
    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parse CSV line (handle quoted fields)
        const fields = parseCSVLine(line);
        
        if (fields.length >= 6) {
            games.push({
                date: cleanField(fields[0]),
                time: cleanField(fields[1]),
                venue: cleanField(fields[2]),
                gameType: cleanField(fields[3]),
                referees: cleanField(fields[4]),
                notes: cleanField(fields[5] || '')
            });
        }
    }
    
    return games;
}

// Parse a single CSV line (handles quoted fields)
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

// Clean field (remove quotes and trim)
function cleanField(field) {
    return field.replace(/^"|"$/g, '').trim();
}

// Initialize filter dropdowns
function initializeFilters() {
    const dateFilter = document.getElementById('dateFilter');
    const venueFilter = document.getElementById('venueFilter');
    
    // Get unique dates
    const dates = [...new Set(allGames.map(game => game.date))].sort();
    dates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = formatDate(date);
        dateFilter.appendChild(option);
    });
    
    // Get unique venues
    const venues = [...new Set(allGames.map(game => game.venue))].sort();
    venues.forEach(venue => {
        const option = document.createElement('option');
        option.value = venue;
        option.textContent = venue;
        venueFilter.appendChild(option);
    });
}

// Filter games based on selected filters
function filterGames() {
    const dateFilter = document.getElementById('dateFilter').value;
    const venueFilter = document.getElementById('venueFilter').value;
    
    filteredGames = allGames.filter(game => {
        const dateMatch = dateFilter === 'all' || game.date === dateFilter;
        const venueMatch = venueFilter === 'all' || game.venue === venueFilter;
        return dateMatch && venueMatch;
    });
    
    displayGames();
    
    // Track filter usage
    if (typeof gtag !== 'undefined') {
        gtag('event', 'games_filtered', {
            event_category: 'user_interaction',
            event_label: `date:${dateFilter},venue:${venueFilter}`,
            value: filteredGames.length
        });
    }
}

// Reset all filters
function resetFilters() {
    document.getElementById('dateFilter').value = 'all';
    document.getElementById('venueFilter').value = 'all';
    filteredGames = [...allGames];
    displayGames();
    
    // Track reset
    if (typeof gtag !== 'undefined') {
        gtag('event', 'filters_reset', {
            event_category: 'user_interaction'
        });
    }
}

// Display games
function displayGames() {
    const gamesList = document.getElementById('gamesList');
    const noResults = document.getElementById('noResults');
    
    if (filteredGames.length === 0) {
        gamesList.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }
    
    gamesList.innerHTML = '';
    gamesList.style.display = 'grid';
    noResults.style.display = 'none';
    
    filteredGames.forEach(game => {
        const gameCard = createGameCard(game);
        gamesList.appendChild(gameCard);
    });
}

// Create a game card element
function createGameCard(game) {
    const card = document.createElement('div');
    card.className = 'game-card';
    
    const status = getGameStatus(game.date);
    const statusClass = status === '今日' ? 'status-today' : 
                       status === '即將舉行' ? 'status-upcoming' : 'status-past';
    
    card.innerHTML = `
        <div class="game-header">
            <div class="game-date">
                <i class="fas fa-calendar-day"></i>
                ${formatDate(game.date)}
            </div>
            <span class="game-status ${statusClass}">${status}</span>
        </div>
        
        <div class="game-details">
            <div class="detail-row">
                <i class="fas fa-clock detail-icon"></i>
                <span class="detail-label">時間：</span>
                <span class="detail-value">${game.time}</span>
            </div>
            
            <div class="detail-row">
                <i class="fas fa-map-marker-alt detail-icon"></i>
                <span class="detail-label">場地：</span>
                <span class="detail-value">${game.venue}</span>
            </div>
            
            ${game.notes ? `
            <div class="detail-row">
                <i class="fas fa-info-circle detail-icon"></i>
                <span class="detail-label">備註：</span>
                <span class="detail-value">${game.notes}</span>
            </div>
            ` : ''}
        </div>
        
        <div class="game-footer">
            <div class="game-type">
                <i class="fas fa-basketball-ball"></i>
                ${game.gameType}
            </div>
            <div class="referee-count">
                <i class="fas fa-whistle"></i>
                球證：${game.referees}
            </div>
        </div>
    `;
    
    return card;
}

// Get game status based on date
function getGameStatus(dateString) {
    const gameDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    gameDate.setHours(0, 0, 0, 0);
    
    const diffTime = gameDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今日';
    if (diffDays > 0) return '即將舉行';
    return '已完成';
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    return date.toLocaleDateString('zh-HK', options);
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

// Show loading state
function showLoading() {
    document.getElementById('loadingIndicator').style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('filterSection').style.display = 'none';
    document.getElementById('gamesList').style.display = 'none';
    document.getElementById('noResults').style.display = 'none';
}

// Show error state
function showError() {
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'block';
    document.getElementById('filterSection').style.display = 'none';
    document.getElementById('gamesList').style.display = 'none';
    document.getElementById('noResults').style.display = 'none';
}

// Auto-refresh every 5 minutes
setInterval(() => {
    loadGames();
}, 5 * 60 * 1000);
