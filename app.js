/**
 * Space Hulk Tracker - JavaScript Application
 * Tracks game state for Space Hulk board game
 */

// ============================================
// State Management
// ============================================

const state = {
    timer: {
        minutes: 3,
        seconds: 0,
        isRunning: false,
        intervalId: null,
        defaultMinutes: 3
    },
    psychicPoints: 20,
    cannonPoints: 10,
    commandPoints: 0,
    customTrackers: [],
    nextTrackerId: 1,
    visibility: {
        librarian: true,
        cannon: true,
        command: true
    }
};

// ============================================
// Timer Functions
// ============================================

/**
 * Updates the timer display with current time
 */
function updateTimerDisplay() {
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    const timerDisplay = document.querySelector('.timer-display');
    
    minutesEl.textContent = String(state.timer.minutes).padStart(2, '0');
    secondsEl.textContent = String(state.timer.seconds).padStart(2, '0');
    
    // Update timer styling based on time remaining
    const totalSeconds = state.timer.minutes * 60 + state.timer.seconds;
    timerDisplay.classList.remove('warning', 'danger');
    
    if (totalSeconds <= 30 && totalSeconds > 10) {
        timerDisplay.classList.add('warning');
    } else if (totalSeconds <= 10) {
        timerDisplay.classList.add('danger');
    }
}

/**
 * Starts the countdown timer
 */
function startTimer() {
    if (state.timer.isRunning) return;
    
    state.timer.isRunning = true;
    state.timer.intervalId = setInterval(() => {
        if (state.timer.seconds === 0) {
            if (state.timer.minutes === 0) {
                // Timer finished
                stopTimer();
                playTimerEndSound();
                return;
            }
            state.timer.minutes--;
            state.timer.seconds = 59;
        } else {
            state.timer.seconds--;
        }
        updateTimerDisplay();
        saveState();
    }, 1000);
}

/**
 * Pauses the countdown timer
 */
function pauseTimer() {
    if (!state.timer.isRunning) return;
    
    state.timer.isRunning = false;
    if (state.timer.intervalId) {
        clearInterval(state.timer.intervalId);
        state.timer.intervalId = null;
    }
}

/**
 * Stops the countdown timer
 */
function stopTimer() {
    pauseTimer();
}

/**
 * Resets the timer to the default value
 */
function resetTimer() {
    pauseTimer();
    state.timer.minutes = state.timer.defaultMinutes;
    state.timer.seconds = 0;
    updateTimerDisplay();
    saveState();
}

/**
 * Sets the default timer minutes
 * @param {number} minutes - Number of minutes to set
 */
function setTimerMinutes(minutes) {
    const mins = Math.max(1, Math.min(60, parseInt(minutes) || 3));
    state.timer.defaultMinutes = mins;
    if (!state.timer.isRunning) {
        state.timer.minutes = mins;
        state.timer.seconds = 0;
        updateTimerDisplay();
    }
    saveState();
}

/**
 * Plays a sound when timer ends (visual feedback since we can't use audio API simply)
 */
function playTimerEndSound() {
    // Flash the timer display
    const timerDisplay = document.querySelector('.timer-display');
    timerDisplay.classList.add('danger');
    
    // Play alarm sound
    playAlarmSound();
    
    // Vibrate if supported (mobile devices)
    if ('vibrate' in navigator) {
        try {
            navigator.vibrate([200, 100, 200, 100, 200]);
        } catch (e) {
            // Vibration may fail due to permissions or other issues
        }
    }
}

/**
 * Plays an alarm sound using Web Audio API
 */
function playAlarmSound() {
    try {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Play multiple beeps for alarm effect
        const beepCount = 5;
        const beepDuration = 0.2; // seconds
        const beepInterval = 0.3; // seconds
        
        for (let i = 0; i < beepCount; i++) {
            const startTime = audioContext.currentTime + (i * beepInterval);
            
            // Create oscillator for beep sound
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // Configure oscillator
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, startTime); // A5 note
            
            // Configure gain (volume envelope)
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + beepDuration);
            
            // Connect nodes
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Play the beep
            oscillator.start(startTime);
            oscillator.stop(startTime + beepDuration);
        }
    } catch (e) {
        console.warn('Failed to play alarm sound:', e);
    }
}

// ============================================
// Points Management
// ============================================

/**
 * Adjusts points for a tracker
 * @param {string} type - Type of tracker (psychic, cannon, command, or custom-{id})
 * @param {number} delta - Amount to change (+1 or -1)
 */
function adjustPoints(type, delta) {
    let element;
    let newValue;
    
    switch(type) {
        case 'psychic':
            state.psychicPoints = Math.max(0, state.psychicPoints + delta);
            newValue = state.psychicPoints;
            element = document.getElementById('psychicPoints');
            break;
        case 'cannon':
            state.cannonPoints = Math.max(0, state.cannonPoints + delta);
            newValue = state.cannonPoints;
            element = document.getElementById('cannonPoints');
            break;
        case 'command':
            state.commandPoints = Math.max(0, state.commandPoints + delta);
            newValue = state.commandPoints;
            element = document.getElementById('commandPoints');
            break;
        default:
            // Custom tracker
            if (type.startsWith('custom-')) {
                const id = parseInt(type.replace('custom-', ''));
                const tracker = state.customTrackers.find(t => t.id === id);
                if (tracker) {
                    tracker.value = Math.max(0, tracker.value + delta);
                    newValue = tracker.value;
                    element = document.getElementById(`customPoints-${id}`);
                }
            }
    }
    
    if (element) {
        element.textContent = newValue;
        updatePointsStyle(element, newValue);
    }
    
    saveState();
}

/**
 * Resets points for a tracker to default value
 * @param {string} type - Type of tracker
 * @param {number} defaultValue - Value to reset to
 */
function resetPoints(type, defaultValue) {
    let element;
    
    switch(type) {
        case 'psychic':
            state.psychicPoints = defaultValue;
            element = document.getElementById('psychicPoints');
            break;
        case 'cannon':
            state.cannonPoints = defaultValue;
            element = document.getElementById('cannonPoints');
            break;
        case 'command':
            state.commandPoints = defaultValue;
            element = document.getElementById('commandPoints');
            break;
    }
    
    if (element) {
        element.textContent = defaultValue;
        updatePointsStyle(element, defaultValue);
    }
    
    saveState();
}

/**
 * Resets command points
 */
function resetCommandPoints() {
    state.commandPoints = 0;
    const pointsEl = document.getElementById('commandPoints');
    pointsEl.textContent = 0;
    updatePointsStyle(pointsEl, 0);
    saveState();
}

/**
 * Updates visual style based on points value
 * @param {HTMLElement} element - Points display element
 * @param {number} value - Current value
 */
function updatePointsStyle(element, value) {
    if (value <= 3 && value > 0) {
        element.classList.add('low');
    } else {
        element.classList.remove('low');
    }
}

// ============================================
// Custom Trackers
// ============================================

/**
 * Adds a new custom tracker
 */
function addCustomTracker() {
    const nameInput = document.getElementById('customName');
    const defaultInput = document.getElementById('customDefault');
    
    const name = nameInput.value.trim();
    const defaultValue = Math.max(0, parseInt(defaultInput.value) || 10);
    
    if (!name) {
        nameInput.focus();
        return;
    }
    
    const tracker = {
        id: state.nextTrackerId++,
        name: name,
        defaultValue: defaultValue,
        value: defaultValue
    };
    
    state.customTrackers.push(tracker);
    state.visibility[`custom-${tracker.id}`] = true;
    renderCustomTracker(tracker);
    addCustomTrackerMenuItem(tracker);
    
    // Clear inputs
    nameInput.value = '';
    defaultInput.value = '10';
    
    saveState();
}

/**
 * Renders a custom tracker to the DOM
 * @param {Object} tracker - Tracker object
 */
function renderCustomTracker(tracker) {
    const container = document.getElementById('customTrackersContainer');
    
    const trackerEl = document.createElement('section');
    trackerEl.className = 'tracker-section custom-section';
    trackerEl.id = `tracker-${tracker.id}`;
    trackerEl.innerHTML = `
        <div class="section-header">
            <h3>${escapeHtml(tracker.name)}</h3>
            <button class="btn-visibility" onclick="toggleTrackerVisibility('custom-${tracker.id}')" aria-label="Hide tracker">
                <span class="material-symbols-outlined">visibility_off</span>
            </button>
        </div>
        <div class="tracker-content" id="customContent-${tracker.id}">
            <div class="custom-tracker">
                <div class="custom-tracker-header">
                    <button class="btn-remove" onclick="removeCustomTracker(${tracker.id})" aria-label="Remove tracker">✕</button>
                </div>
                <div class="points-display">
                    <button class="btn btn-adjust" onclick="adjustPoints('custom-${tracker.id}', -1)">−</button>
                    <div class="points-value" id="customPoints-${tracker.id}">${tracker.value}</div>
                    <button class="btn btn-adjust" onclick="adjustPoints('custom-${tracker.id}', 1)">+</button>
                </div>
                <div class="points-reset">
                    <button class="btn btn-small" onclick="resetCustomTracker(${tracker.id})">Reset to ${tracker.defaultValue}</button>
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(trackerEl);
}

/**
 * Resets a custom tracker to its default value
 * @param {number} id - Tracker ID
 */
function resetCustomTracker(id) {
    const tracker = state.customTrackers.find(t => t.id === id);
    if (tracker) {
        tracker.value = tracker.defaultValue;
        const element = document.getElementById(`customPoints-${id}`);
        if (element) {
            element.textContent = tracker.value;
            updatePointsStyle(element, tracker.value);
        }
        saveState();
    }
}

/**
 * Removes a custom tracker
 * @param {number} id - Tracker ID
 */
function removeCustomTracker(id) {
    state.customTrackers = state.customTrackers.filter(t => t.id !== id);
    const element = document.getElementById(`tracker-${id}`);
    if (element) {
        element.remove();
    }
    removeCustomTrackerMenuItem(id);
    delete state.visibility[`custom-${id}`];
    saveState();
}

/**
 * Adds a menu item for a custom tracker
 * @param {Object} tracker - Tracker object
 */
function addCustomTrackerMenuItem(tracker) {
    const menuItems = document.getElementById('menuItems');
    
    const menuItem = document.createElement('label');
    menuItem.className = 'menu-item';
    menuItem.id = `menuItem-custom-${tracker.id}`;
    menuItem.innerHTML = `
        <input type="checkbox" id="menuCustom-${tracker.id}" checked>
        <span>${escapeHtml(tracker.name)}</span>
    `;
    
    menuItems.appendChild(menuItem);
    
    // Add event listener
    document.getElementById(`menuCustom-${tracker.id}`).addEventListener('change', () => {
        handleMenuCheckboxChange(`custom-${tracker.id}`);
    });
}

/**
 * Removes a menu item for a custom tracker
 * @param {number} id - Tracker ID
 */
function removeCustomTrackerMenuItem(id) {
    const menuItem = document.getElementById(`menuItem-custom-${id}`);
    if (menuItem) {
        menuItem.remove();
    }
}

// ============================================
// Tracker Visibility
// ============================================

/**
 * Toggles visibility of a tracker section
 * @param {string} tracker - Tracker name (librarian, cannon, command, or custom-{id})
 */
function toggleTrackerVisibility(tracker) {
    state.visibility[tracker] = !state.visibility[tracker];
    updateTrackerVisibility(tracker);
    updateMenuCheckbox(tracker);
    saveState();
}

/**
 * Updates the visibility of a tracker section in the DOM
 * @param {string} tracker - Tracker name
 */
function updateTrackerVisibility(tracker) {
    const sectionMap = {
        librarian: 'librarianSection',
        cannon: 'cannonSection',
        command: 'commandSection'
    };
    
    let section;
    if (tracker.startsWith('custom-')) {
        const id = tracker.replace('custom-', '');
        section = document.getElementById(`tracker-${id}`);
    } else {
        section = document.getElementById(sectionMap[tracker]);
    }
    
    if (section) {
        if (state.visibility[tracker]) {
            section.classList.remove('hidden-tracker');
        } else {
            section.classList.add('hidden-tracker');
        }
    }
}

/**
 * Updates the menu checkbox to reflect visibility state
 * @param {string} tracker - Tracker name
 */
function updateMenuCheckbox(tracker) {
    const checkboxMap = {
        librarian: 'menuLibrarian',
        cannon: 'menuCannon',
        command: 'menuCommand'
    };
    
    let checkbox;
    if (tracker.startsWith('custom-')) {
        checkbox = document.getElementById(`menuCustom-${tracker.replace('custom-', '')}`);
    } else {
        checkbox = document.getElementById(checkboxMap[tracker]);
    }
    
    if (checkbox) {
        checkbox.checked = state.visibility[tracker];
    }
}

/**
 * Handles menu checkbox change
 * @param {string} tracker - Tracker name
 */
function handleMenuCheckboxChange(tracker) {
    const checkboxMap = {
        librarian: 'menuLibrarian',
        cannon: 'menuCannon',
        command: 'menuCommand'
    };
    
    let checkbox;
    if (tracker.startsWith('custom-')) {
        checkbox = document.getElementById(`menuCustom-${tracker.replace('custom-', '')}`);
    } else {
        checkbox = document.getElementById(checkboxMap[tracker]);
    }
    
    if (checkbox) {
        state.visibility[tracker] = checkbox.checked;
        updateTrackerVisibility(tracker);
        saveState();
    }
}

/**
 * Opens the tracker menu
 */
function openMenu() {
    document.getElementById('trackerMenu').classList.add('open');
    document.getElementById('menuOverlay').classList.add('open');
}

/**
 * Closes the tracker menu
 */
function closeMenu() {
    document.getElementById('trackerMenu').classList.remove('open');
    document.getElementById('menuOverlay').classList.remove('open');
}

// ============================================
// State Persistence
// ============================================

/**
 * Saves current state to localStorage
 */
function saveState() {
    const saveData = {
        timer: {
            minutes: state.timer.minutes,
            seconds: state.timer.seconds,
            defaultMinutes: state.timer.defaultMinutes
        },
        psychicPoints: state.psychicPoints,
        cannonPoints: state.cannonPoints,
        commandPoints: state.commandPoints,
        customTrackers: state.customTrackers,
        nextTrackerId: state.nextTrackerId,
        visibility: state.visibility
    };
    
    try {
        localStorage.setItem('spaceHulkTracker', JSON.stringify(saveData));
    } catch (e) {
        console.warn('Failed to save state:', e);
    }
}

/**
 * Loads state from localStorage
 */
function loadState() {
    try {
        const saved = localStorage.getItem('spaceHulkTracker');
        if (saved) {
            const data = JSON.parse(saved);
            
            // Restore timer
            if (data.timer) {
                state.timer.minutes = data.timer.minutes ?? 3;
                state.timer.seconds = data.timer.seconds ?? 0;
                state.timer.defaultMinutes = data.timer.defaultMinutes ?? 3;
                document.getElementById('timerMinutes').value = state.timer.defaultMinutes;
            }
            
            // Restore points
            state.psychicPoints = data.psychicPoints ?? 20;
            state.cannonPoints = data.cannonPoints ?? 10;
            state.commandPoints = data.commandPoints ?? 0;
            
            // Restore custom trackers
            if (data.customTrackers) {
                state.customTrackers = data.customTrackers;
                state.nextTrackerId = data.nextTrackerId || 1;
                state.customTrackers.forEach(tracker => {
                    renderCustomTracker(tracker);
                    addCustomTrackerMenuItem(tracker);
                });
            }
            
            // Restore visibility settings
            if (data.visibility) {
                state.visibility = { ...state.visibility, ...data.visibility };
            }
            // Handle legacy showLibrarian setting
            if (data.showLibrarian !== undefined && data.visibility === undefined) {
                state.visibility.librarian = data.showLibrarian;
            }
            // Remove obsolete visibility keys
            delete state.visibility.timer;
            delete state.visibility.custom;
            
            // Apply visibility to all trackers
            Object.keys(state.visibility).forEach(tracker => {
                updateTrackerVisibility(tracker);
                updateMenuCheckbox(tracker);
            });
            
            // Update displays
            updateTimerDisplay();
            document.getElementById('psychicPoints').textContent = state.psychicPoints;
            document.getElementById('cannonPoints').textContent = state.cannonPoints;
            document.getElementById('commandPoints').textContent = state.commandPoints;
            
            // Update styles
            updatePointsStyle(document.getElementById('psychicPoints'), state.psychicPoints);
            updatePointsStyle(document.getElementById('cannonPoints'), state.cannonPoints);
            updatePointsStyle(document.getElementById('commandPoints'), state.commandPoints);
        }
    } catch (e) {
        console.warn('Failed to load state:', e);
    }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Escapes HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return String(text).replace(/[&<>"']/g, char => htmlEscapes[char]);
}

// ============================================
// Event Listeners & Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Load saved state
    loadState();
    
    // Timer controls
    document.getElementById('startTimer').addEventListener('click', startTimer);
    document.getElementById('pauseTimer').addEventListener('click', pauseTimer);
    document.getElementById('resetTimer').addEventListener('click', resetTimer);
    
    // Timer minutes input
    document.getElementById('timerMinutes').addEventListener('change', (e) => {
        setTimerMinutes(e.target.value);
    });
    
    // Menu controls
    document.getElementById('menuBtn').addEventListener('click', openMenu);
    document.getElementById('menuClose').addEventListener('click', closeMenu);
    document.getElementById('menuOverlay').addEventListener('click', closeMenu);
    
    // Menu checkboxes
    document.getElementById('menuLibrarian').addEventListener('change', () => handleMenuCheckboxChange('librarian'));
    document.getElementById('menuCannon').addEventListener('change', () => handleMenuCheckboxChange('cannon'));
    document.getElementById('menuCommand').addEventListener('change', () => handleMenuCheckboxChange('command'));
    
    // Initialize timer display
    updateTimerDisplay();

});

// Handle page visibility to pause timer when hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.timer.isRunning) {
        // Keep running but save state
        saveState();
    }
});

// Save state before page unload
window.addEventListener('beforeunload', () => {
    saveState();
});
