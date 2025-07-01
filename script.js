// Theme management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('theme-icon');
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
}
// Global variables
let habits = JSON.parse(localStorage.getItem('dailyHabits')) || [];
let habitHistory = JSON.parse(localStorage.getItem('habitHistory')) || {};
let currentFilter = '';

// Category icons mapping
const categoryIcons = {
    'health': '🏃',
    'productivity': '💼',
    'learning': '📚',
    'mindfulness': '🧘',
    'social': '👥',
    'creative': '🎨',
    'personal': '⭐'
};

// Achievement definitions
const achievements = [
    {
        id: 'first_habit',
        title: 'Getting Started',
        description: 'Add your first habit',
        icon: '🌱',
        condition: () => habits.length >= 1
    },
    {
        id: 'streak_3',
        title: 'Building Momentum',
        description: '3-day streak on any habit',
        icon: '🔥',
        condition: () => habits.some(h => h.streak >= 3)
    },
    {
        id: 'streak_7',
        title: 'Week Warrior',
        description: '7-day streak on any habit',
        icon: '⚡',
        condition: () => habits.some(h => h.streak >= 7)
    },
    {
        id: 'streak_30',
        title: 'Monthly Master',
        description: '30-day streak on any habit',
        icon: '👑',
        condition: () => habits.some(h => h.streak >= 30)
    },
    {
        id: 'perfect_day',
        title: 'Perfect Day',
        description: 'Complete all habits in one day',
        icon: '⭐',
        condition: () => habits.length > 0 && habits.every(h => h.completed)
    },
    {
        id: 'habit_collector',
        title: 'Habit Collector',
        description: 'Have 10 different habits',
        icon: '📚',
        condition: () => habits.length >= 10
    },
    {
        id: 'category_master',
        title: 'Well Rounded',
        description: 'Have habits in 5 different categories',
        icon: '🎯',
        condition: () => {
            const categories = new Set(habits.map(h => h.category));
            return categories.size >= 5;
        }
    },
    {
        id: 'note_taker',
        title: 'Reflective Soul',
        description: 'Add notes to 5 different habits',
        icon: '📝',
        condition: () => habits.filter(h => h.notes && h.notes.trim()).length >= 5
    }
];

// Calendar and reminder variables
let currentWeekOffset = 0;
let reminderIntervals = [];
let unlockedAchievements = JSON.parse(localStorage.getItem('unlockedAchievements')) || [];

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    updateCurrentDate();
    loadHabits();
    updateSummary();
    initializeHistory();
    initializeCalendar();
    initializeAchievements();
    initializeReminders();
    checkAchievements();
    
    // Initialize analytics after a short delay to ensure DOM is ready
    setTimeout(() => {
        initializeAnalytics();
    }, 100);
});
// Update current date display
function updateCurrentDate() {
    const today = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    document.getElementById('current-date').textContent = today.toLocaleDateString('en-US', options);
}

// Add new habit
function addHabit() {
    const habitInput = document.getElementById('habit-input');
    const categorySelect = document.getElementById('category-select');
    const habitText = habitInput.value.trim();
    const category = categorySelect.value;
    
    if (habitText === '') {
        alert('Please enter a habit!');
        return;
    }
    
    const newHabit = {
        id: Date.now(),
        text: habitText,
        category: category || 'personal',
        completed: false,
        streak: 0,
        bestStreak: 0,
        notes: '',
        createdAt: new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        }),
        lastCompleted: null
    };
    
    habits.push(newHabit);
    saveHabits();
    loadHabits();
    updateSummary();
    checkAchievements();
    
    habitInput.value = '';
    categorySelect.value = '';
    habitInput.focus();
}

// Load and display habits
function loadHabits() {
    const container = document.getElementById('habits-container');
    
    // Filter habits based on current filter
    const filteredHabits = currentFilter ? 
        habits.filter(habit => habit.category === currentFilter) : habits;
    
    if (filteredHabits.length === 0) {
        const message = currentFilter ? 
            `No habits in this category yet!` : 
            `No habits yet!`;
        container.innerHTML = `
            <div class="empty-state">
                <h3>${message}</h3>
                <p>Add your first habit above to start tracking your daily routine.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    filteredHabits.forEach(habit => {
        const habitElement = createHabitElement(habit);
        container.appendChild(habitElement);
    });
}

// Create habit element
function createHabitElement(habit) {
    const habitDiv = document.createElement('div');
    habitDiv.className = `habit-item ${habit.completed ? 'completed' : ''}`;
    
    const categoryIcon = categoryIcons[habit.category] || '⭐';
    const streakDisplay = habit.streak > 0 ? 
        `<span class="streak-counter ${habit.streak >= 7 ? 'high-streak' : ''}">🔥 ${habit.streak} day${habit.streak > 1 ? 's' : ''}</span>` : '';
    
    habitDiv.innerHTML = `
        <div class="habit-content">
            <input type="checkbox" class="habit-checkbox" ${habit.completed ? 'checked' : ''} 
                   onchange="toggleHabit(${habit.id})">
            <span class="habit-text">${habit.text}</span>
            <span class="category-badge">${categoryIcon} ${habit.category}</span>
            ${streakDisplay}
        </div>
        <div class="habit-actions">
            <button class="notes-btn" onclick="toggleNotes(${habit.id})" title="Add notes">📝</button>
            <button class="delete-btn" onclick="deleteHabit(${habit.id})">Delete</button>
        </div>
        <div class="habit-notes" id="notes-${habit.id}" style="display: ${habit.notes ? 'block' : 'none'}">
            ${habit.notes ? `<div>${habit.notes}</div>` : ''}
            <input type="text" class="notes-input" placeholder="Add a note..." 
                   value="${habit.notes || ''}" onchange="updateNotes(${habit.id}, this.value)">
        </div>
    `;
    
    return habitDiv;
}

// Template functions
function toggleTemplates() {
    const container = document.getElementById('templates-container');
    const isHidden = container.classList.contains('templates-hidden');
    
    if (isHidden) {
        container.classList.remove('templates-hidden');
        container.classList.add('templates-visible');
    } else {
        container.classList.remove('templates-visible');
        container.classList.add('templates-hidden');
    }
}

function addTemplateHabit(text, category) {
    document.getElementById('habit-input').value = text;
    document.getElementById('category-select').value = category;
    toggleTemplates(); // Hide templates after selection
}

// Filter functions
function filterHabits() {
    const filterSelect = document.getElementById('category-filter');
    currentFilter = filterSelect.value;
    loadHabits();
}

// Toggle habit completion
function toggleHabit(habitId) {
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
        const wasCompleted = habit.completed;
        habit.completed = !habit.completed;
        
        // Update streak
        updateStreak(habit, habit.completed);
        
        // Save to history
        const today = new Date().toDateString();
        if (!habitHistory[today]) {
            habitHistory[today] = {};
        }
        habitHistory[today][habitId] = habit.completed;
        
        saveHabits();
        saveHistory();
        loadHabits();
        updateSummary();
        updateCalendarView();
        checkAchievements();
    }
}

// Delete habit
function deleteHabit(habitId) {
    if (confirm('Are you sure you want to delete this habit?')) {
        habits = habits.filter(h => h.id !== habitId);
        saveHabits();
        loadHabits();
        updateSummary();
    }
}

// Notes functions
function toggleNotes(habitId) {
    const notesDiv = document.getElementById(`notes-${habitId}`);
    const isVisible = notesDiv.style.display === 'block';
    notesDiv.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        const input = notesDiv.querySelector('.notes-input');
        input.focus();
    }
}

function updateNotes(habitId, notes) {
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
        habit.notes = notes;
        saveHabits();
    }
}

// Streak management
function updateStreak(habit, completed) {
    const today = new Date().toDateString();
    
    if (completed) {
        // If completing for the first time today
        if (habit.lastCompleted !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            // If completed yesterday, continue streak, otherwise start new
            if (habit.lastCompleted === yesterday.toDateString()) {
                habit.streak += 1;
            } else {
                habit.streak = 1;
            }
            
            habit.lastCompleted = today;
            
            // Update best streak
            if (habit.streak > habit.bestStreak) {
                habit.bestStreak = habit.streak;
            }
        }
    } else {
        // If uncompleting today's habit
        if (habit.lastCompleted === today) {
            habit.streak = Math.max(0, habit.streak - 1);
            habit.lastCompleted = null;
        }
    }
}

// Initialize history tracking
function initializeHistory() {
    const today = new Date().toDateString();
    if (!habitHistory[today]) {
        habitHistory[today] = {};
    }
}

// Weekly Calendar Functions
function initializeCalendar() {
    updateCalendarView();
}

function updateCalendarView() {
    const calendarContainer = document.getElementById('weekly-calendar');
    const weekRangeElement = document.getElementById('current-week-range');
    
    // Calculate the week dates
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (currentWeekOffset * 7));
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    // Update week range display
    const formatOptions = { month: 'short', day: 'numeric' };
    weekRangeElement.textContent = `${startOfWeek.toLocaleDateString('en-US', formatOptions)} - ${endOfWeek.toLocaleDateString('en-US', formatOptions)}`;
    
    // Generate calendar days
    calendarContainer.innerHTML = '';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(startOfWeek.getDate() + i);
        
        const dayElement = createCalendarDay(dayDate, dayNames[i]);
        calendarContainer.appendChild(dayElement);
    }
}

function createCalendarDay(date, dayName) {
    const dayDiv = document.createElement('div');
    const dateString = date.toDateString();
    const isToday = dateString === new Date().toDateString();
    
    // Calculate completion rate for this day
    const dayHabits = habitHistory[dateString] || {};
    const completedCount = Object.values(dayHabits).filter(Boolean).length;
    const totalCount = Math.max(Object.keys(dayHabits).length, habits.length);
    const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    
    // Determine day class based on completion rate
    let dayClass = 'calendar-day';
    if (isToday) dayClass += ' today';
    
    if (completionRate === 100) dayClass += ' perfect';
    else if (completionRate >= 75) dayClass += ' good';
    else if (completionRate >= 50) dayClass += ' okay';
    else if (completionRate > 0) dayClass += ' missed';
    
    dayDiv.className = dayClass;
    dayDiv.onclick = () => showDayDetails(date, dayHabits);
    
    dayDiv.innerHTML = `
        <div class="day-name">${dayName}</div>
        <div class="day-number">${date.getDate()}</div>
        <div class="day-progress">${Math.round(completionRate)}%</div>
    `;
    
    return dayDiv;
}

function changeWeek(direction) {
    currentWeekOffset += direction;
    updateCalendarView();
}

function showDayDetails(date, dayHabits) {
    const dateString = date.toDateString();
    const habitNames = habits.reduce((acc, habit) => {
        acc[habit.id] = habit.text;
        return acc;
    }, {});
    
    const completedHabits = Object.entries(dayHabits)
        .filter(([_, completed]) => completed)
        .map(([habitId]) => habitNames[habitId] || 'Unknown habit')
        .join(', ');
    
    const message = completedHabits ? 
        `✅ Completed: ${completedHabits}` : 
        'No habits completed this day';
    
    alert(`${date.toDateString()}\n${message}`);
}

// Achievement System Functions
function initializeAchievements() {
    displayAchievements();
}

function displayAchievements() {
    const container = document.getElementById('achievements-container');
    container.innerHTML = '';
    
    achievements.forEach(achievement => {
        const isUnlocked = unlockedAchievements.includes(achievement.id);
        const achievementElement = createAchievementElement(achievement, isUnlocked);
        container.appendChild(achievementElement);
    });
}

function createAchievementElement(achievement, isUnlocked) {
    const div = document.createElement('div');
    div.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
    
    div.innerHTML = `
        <span class="achievement-icon">${achievement.icon}</span>
        <div class="achievement-title">${achievement.title}</div>
        <div class="achievement-description">${achievement.description}</div>
    `;
    
    return div;
}

function checkAchievements() {
    const newlyUnlocked = [];
    
    achievements.forEach(achievement => {
        if (!unlockedAchievements.includes(achievement.id) && achievement.condition()) {
            unlockedAchievements.push(achievement.id);
            newlyUnlocked.push(achievement);
        }
    });
    
    if (newlyUnlocked.length > 0) {
        localStorage.setItem('unlockedAchievements', JSON.stringify(unlockedAchievements));
        displayAchievements();
        
        // Show popup for first new achievement
        showAchievementPopup(newlyUnlocked[0]);
    }
}

function showAchievementPopup(achievement) {
    const popup = document.getElementById('achievement-popup');
    const title = document.getElementById('popup-achievement-title');
    const description = document.getElementById('popup-achievement-description');
    
    // Set content
    title.textContent = `${achievement.icon} ${achievement.title}`;
    description.textContent = achievement.description;
    
    // Ensure popup is properly displayed
    popup.classList.remove('hidden', 'closing');
    
    // Prevent background scrolling while popup is open
    document.body.style.overflow = 'hidden';
    
    // Ensure event listeners are active (reinitialize to be safe)
    initializePersistentPopupListeners();
    
    // Add confetti effect
    createConfetti();
}

// Persistent Event Listeners for Achievement Popup
function initializePersistentPopupListeners() {
    // Remove any existing listeners to prevent duplicates
    const existingCloseBtn = document.getElementById('achievement-close-btn');
    const existingAwesomeBtn = document.getElementById('achievement-awesome-btn');
    const existingPopup = document.getElementById('achievement-popup');
    
    if (existingCloseBtn) {
        // Clone node to remove all event listeners
        const newCloseBtn = existingCloseBtn.cloneNode(true);
        existingCloseBtn.parentNode.replaceChild(newCloseBtn, existingCloseBtn);
        
        // Add fresh event listener
        newCloseBtn.addEventListener('click', handlePopupClose, { passive: false });
    }
    
    if (existingAwesomeBtn) {
        // Clone node to remove all event listeners
        const newAwesomeBtn = existingAwesomeBtn.cloneNode(true);
        existingAwesomeBtn.parentNode.replaceChild(newAwesomeBtn, existingAwesomeBtn);
        
        // Add fresh event listener
        newAwesomeBtn.addEventListener('click', handlePopupClose, { passive: false });
    }
    
    if (existingPopup) {
        // Add backdrop click listener (replace existing)
        existingPopup.removeEventListener('click', handleBackdropClick);
        existingPopup.addEventListener('click', handleBackdropClick, { passive: false });
    }
    
    // Global escape key listener (remove and re-add to ensure single listener)
    document.removeEventListener('keydown', handleGlobalEscape);
    document.addEventListener('keydown', handleGlobalEscape, { passive: false });
}

// Centralized popup close handler
function handlePopupClose(event) {
    event.preventDefault();
    event.stopPropagation();
    closeAchievementPopup();
}

// Backdrop click handler
function handleBackdropClick(event) {
    if (event.target.id === 'achievement-popup') {
        event.preventDefault();
        closeAchievementPopup();
    }
}

// Global escape key handler
function handleGlobalEscape(event) {
    if (event.key === 'Escape') {
        const popup = document.getElementById('achievement-popup');
        if (popup && !popup.classList.contains('hidden')) {
            event.preventDefault();
            closeAchievementPopup();
        }
    }
}

// Enhanced initialization that's resistant to DOM changes
function reinitializePopupListeners() {
    // Use MutationObserver to detect when Chart.js or other components modify DOM
    const observer = new MutationObserver((mutations) => {
        let shouldReinitialize = false;
        
        mutations.forEach((mutation) => {
            // Check if popup elements were modified
            if (mutation.type === 'childList') {
                const addedNodes = Array.from(mutation.addedNodes);
                const removedNodes = Array.from(mutation.removedNodes);
                
                // Check if any popup-related elements were affected
                const popupRelated = [...addedNodes, ...removedNodes].some(node => {
                    return node.nodeType === 1 && (
                        node.id?.includes('achievement') ||
                        node.className?.includes('popup') ||
                        node.querySelector?.('#achievement-popup')
                    );
                });
                
                if (popupRelated) {
                    shouldReinitialize = true;
                }
            }
        });
        
        if (shouldReinitialize) {
            // Debounce the reinitialization
            clearTimeout(window.popupReinitTimeout);
            window.popupReinitTimeout = setTimeout(() => {
                initializePersistentPopupListeners();
            }, 100);
        }
    });
    
    // Observe the document for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
    });
    
    // Store observer reference for cleanup if needed
    window.popupObserver = observer;
}

// Initialize on DOM content loaded
function initializePopupSystem() {
    initializePersistentPopupListeners();
    reinitializePopupListeners();
}

// Call initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePopupSystem);
} else {
    initializePopupSystem();
}

// Smart Reminders Functions
function initializeReminders() {
    loadReminderSettings();
    setupReminderIntervals();
}

function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            const button = document.getElementById('enable-notifications');
            if (permission === 'granted') {
                button.textContent = '✅ Notifications Enabled';
                button.style.background = '#4CAF50';
                showSmartSuggestions();
            } else {
                button.textContent = '❌ Permission Denied';
                button.style.background = '#f44336';
            }
        });
    } else {
        alert('Your browser does not support notifications');
    }
}

function toggleRemindersPanel() {
    const panel = document.getElementById('reminders-panel');
    panel.classList.toggle('hidden');
    
    if (!panel.classList.contains('hidden')) {
        showSmartSuggestions();
    }
}

function setupReminderIntervals() {
    // Clear existing intervals
    reminderIntervals.forEach(interval => clearInterval(interval));
    reminderIntervals = [];
    
    // Set up new intervals
    const now = new Date();
    const reminderTimes = [
        { id: 'morning', enabled: document.getElementById('morning-enabled')?.checked },
        { id: 'afternoon', enabled: document.getElementById('afternoon-enabled')?.checked },
        { id: 'evening', enabled: document.getElementById('evening-enabled')?.checked }
    ];
    
    reminderTimes.forEach(reminder => {
        if (reminder.enabled) {
            const timeInput = document.getElementById(`${reminder.id}-time`);
            if (timeInput) {
                scheduleReminder(reminder.id, timeInput.value);
            }
        }
    });
}

function scheduleReminder(type, time) {
    const [hours, minutes] = time.split(':').map(Number);
    
    const checkTime = () => {
        const now = new Date();
        if (now.getHours() === hours && now.getMinutes() === minutes) {
            showNotification(type);
        }
    };
    
    // Check every minute
    const interval = setInterval(checkTime, 60000);
    reminderIntervals.push(interval);
}

function showNotification(type) {
    if (Notification.permission === 'granted') {
        const incompleteHabits = habits.filter(h => !h.completed);
        const messages = {
            morning: `🌅 Good morning! You have ${incompleteHabits.length} habits to complete today.`,
            afternoon: `☀️ Afternoon check-in! ${incompleteHabits.length} habits remaining.`,
            evening: `🌙 Evening reminder! Don't forget your ${incompleteHabits.length} remaining habits.`
        };
        
        new Notification('Daily Habits Tracker', {
            body: messages[type],
            icon: '/favicon.ico',
            badge: '/favicon.ico'
        });
    }
}

function showSmartSuggestions() {
    const suggestionsContainer = document.getElementById('smart-suggestions');
    const now = new Date();
    const hour = now.getHours();
    
    let suggestions = [];
    
    // Time-based suggestions
    if (hour < 10) {
        suggestions.push('💡 Morning is great for exercise and meditation habits!');
    } else if (hour < 16) {
        suggestions.push('💡 Afternoon is perfect for learning and productivity habits!');
    } else {
        suggestions.push('💡 Evening is ideal for reflection and relaxation habits!');
    }
    
    // Habit-based suggestions
    const categories = habits.map(h => h.category);
    if (categories.includes('health') && !categories.includes('mindfulness')) {
        suggestions.push('💡 Consider adding meditation to complement your fitness routine!');
    }
    
    if (habits.length > 5) {
        suggestions.push('💡 You have many habits! Consider setting specific times for better consistency.');
    }
    
    suggestionsContainer.innerHTML = `
        <h4>💡 Smart Suggestions</h4>
        ${suggestions.map(s => `<div class="suggestion-item">${s}</div>`).join('')}
    `;
}

function loadReminderSettings() {
    const settings = JSON.parse(localStorage.getItem('reminderSettings')) || {};
    
    Object.entries(settings).forEach(([key, value]) => {
        const element = document.getElementById(key);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = value;
            } else {
                element.value = value;
            }
        }
    });
}

function saveReminderSettings() {
    const settings = {
        'morning-time': document.getElementById('morning-time')?.value,
        'morning-enabled': document.getElementById('morning-enabled')?.checked,
        'afternoon-time': document.getElementById('afternoon-time')?.value,
        'afternoon-enabled': document.getElementById('afternoon-enabled')?.checked,
        'evening-time': document.getElementById('evening-time')?.value,
        'evening-enabled': document.getElementById('evening-enabled')?.checked
    };
    
    localStorage.setItem('reminderSettings', JSON.stringify(settings));
    setupReminderIntervals();
}

// Save habits to localStorage
function saveHabits() {
    localStorage.setItem('dailyHabits', JSON.stringify(habits));
}

function saveHistory() {
    localStorage.setItem('habitHistory', JSON.stringify(habitHistory));
}

// Allow Enter key to add habit
document.getElementById('habit-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addHabit();
    }
});

// Add event listeners for reminder settings
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners for reminder inputs
    ['morning', 'afternoon', 'evening'].forEach(type => {
        const timeInput = document.getElementById(`${type}-time`);
        const enabledInput = document.getElementById(`${type}-enabled`);
        
        if (timeInput) timeInput.addEventListener('change', saveReminderSettings);
        if (enabledInput) enabledInput.addEventListener('change', saveReminderSettings);
    });
});

// Analytics Dashboard Variables
let analyticsCharts = {};
let currentTimeframe = 30;
let currentRankingType = 'consistency';

// Initialize analytics dashboard
function initializeAnalytics() {
    currentTimeframe = parseInt(document.getElementById('analytics-timeframe')?.value || 30);
    updateAnalytics();
}

// Main analytics update function
function updateAnalytics() {
    currentTimeframe = parseInt(document.getElementById('analytics-timeframe').value);
    
    updateMetricsCards();
    updateProgressChart();
    updateCategoryChart();
    updateHabitPerformance();
    updateWeeklyPatternChart();
    updateInsights();
    updateRankings();
}

// Update metrics cards
function updateMetricsCards() {
    const analytics = calculateAnalytics(currentTimeframe);
    
    document.getElementById('overall-completion').textContent = `${analytics.overallCompletion}%`;
    document.getElementById('active-streaks').textContent = analytics.activeStreaks;
    document.getElementById('best-category').textContent = analytics.topCategory || 'None';
    document.getElementById('perfect-days').textContent = analytics.perfectDays;
    
    // Update trends
    updateTrendIndicators(analytics);
}

// Calculate comprehensive analytics
function calculateAnalytics(days) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    let totalCompletions = 0;
    let totalPossible = 0;
    let perfectDays = 0;
    const categoryStats = {};
    const dailyCompletions = [];
    const weeklyPattern = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    
    // Initialize category stats
    const uniqueCategories = [...new Set(habits.map(h => h.category))];
    uniqueCategories.forEach(cat => {
        categoryStats[cat] = { completed: 0, total: 0 };
    });
    
    // Analyze each day in the timeframe
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateString = d.toDateString();
        const dayHabits = habitHistory[dateString] || {};
        
        const dayCompleted = Object.values(dayHabits).filter(Boolean).length;
        const dayTotal = Math.max(Object.keys(dayHabits).length, habits.length);
        
        totalCompletions += dayCompleted;
        totalPossible += dayTotal;
        
        if (dayCompleted === dayTotal && dayTotal > 0) {
            perfectDays++;
        }
        
        dailyCompletions.push({
            date: new Date(d),
            completed: dayCompleted,
            total: dayTotal,
            percentage: dayTotal > 0 ? (dayCompleted / dayTotal) * 100 : 0
        });
        
        // Weekly pattern (0 = Sunday)
        weeklyPattern[d.getDay()] += dayTotal > 0 ? (dayCompleted / dayTotal) * 100 : 0;
        
        // Category analysis
        Object.entries(dayHabits).forEach(([habitId, completed]) => {
            const habit = habits.find(h => h.id == habitId);
            if (habit && categoryStats[habit.category]) {
                categoryStats[habit.category].total++;
                if (completed) {
                    categoryStats[habit.category].completed++;
                }
            }
        });
    }
    
    // Calculate metrics
    const overallCompletion = totalPossible > 0 ? Math.round((totalCompletions / totalPossible) * 100) : 0;
    const activeStreaks = habits.filter(h => h.streak > 0).length;
    
    // Find top category
    let topCategory = null;
    let topCategoryRate = 0;
    Object.entries(categoryStats).forEach(([category, stats]) => {
        if (stats.total > 0) {
            const rate = stats.completed / stats.total;
            if (rate > topCategoryRate) {
                topCategoryRate = rate;
                topCategory = category;
            }
        }
    });
    
    // Normalize weekly pattern
    const daysInTimeframe = Math.min(days, Math.ceil(days / 7));
    weeklyPattern.forEach((total, index) => {
        weeklyPattern[index] = daysInTimeframe > 0 ? total / daysInTimeframe : 0;
    });
    
    return {
        overallCompletion,
        activeStreaks,
        topCategory,
        perfectDays,
        dailyCompletions,
        categoryStats,
        weeklyPattern,
        totalCompletions,
        totalPossible
    };
}

// Update trend indicators
function updateTrendIndicators(analytics) {
    const previousPeriodAnalytics = calculateAnalytics(currentTimeframe * 2);
    
    const completionTrend = analytics.overallCompletion - (previousPeriodAnalytics.overallCompletion || 0);
    const streakTrend = analytics.activeStreaks - (previousPeriodAnalytics.activeStreaks || 0);
    
    document.getElementById('completion-trend').textContent = 
        completionTrend > 0 ? `📈 +${completionTrend.toFixed(1)}%` : 
        completionTrend < 0 ? `📉 ${completionTrend.toFixed(1)}%` : '➡️ No change';
    
    document.getElementById('streak-trend').textContent = 
        streakTrend > 0 ? `📈 +${streakTrend}` : 
        streakTrend < 0 ? `📉 ${streakTrend}` : '➡️ Same';
}

// Update progress chart
function updateProgressChart() {
    const ctx = document.getElementById('progress-chart').getContext('2d');
    const analytics = calculateAnalytics(currentTimeframe);
    
    if (analyticsCharts.progress) {
        analyticsCharts.progress.destroy();
    }
    
    const labels = analytics.dailyCompletions.map(d => 
        d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );
    const data = analytics.dailyCompletions.map(d => d.percentage);
    
    analyticsCharts.progress = createResponsiveChart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Completion Rate',
                data: data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Update category chart
function updateCategoryChart() {
    const ctx = document.getElementById('category-chart').getContext('2d');
    const analytics = calculateAnalytics(currentTimeframe);
    
    if (analyticsCharts.category) {
        analyticsCharts.category.destroy();
    }
    
    const categoryData = Object.entries(analytics.categoryStats)
        .filter(([_, stats]) => stats.total > 0)
        .map(([category, stats]) => ({
            category,
            percentage: (stats.completed / stats.total) * 100
        }));
    
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
    ];
    
    analyticsCharts.category = createResponsiveChart(ctx, {
        type: 'doughnut',
        data: {
            labels: categoryData.map(d => d.category),
            datasets: [{
                data: categoryData.map(d => d.percentage),
                backgroundColor: colors.slice(0, categoryData.length),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Update habit performance
function updateHabitPerformance() {
    const container = document.getElementById('habit-performance-list');
    const analytics = calculateAnalytics(currentTimeframe);
    
    const habitPerformance = habits.map(habit => {
        const habitDays = Object.entries(habitHistory).filter(([date, dayHabits]) => {
            const d = new Date(date);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - currentTimeframe);
            return d >= cutoff && dayHabits[habit.id] !== undefined;
        });
        
        const completed = habitDays.filter(([_, dayHabits]) => dayHabits[habit.id]).length;
        const total = habitDays.length;
        const percentage = total > 0 ? (completed / total) * 100 : 0;
        
        return {
            habit: habit.text,
            percentage: percentage,
            completed,
            total
        };
    }).sort((a, b) => b.percentage - a.percentage);
    
    container.innerHTML = habitPerformance.map(item => `
        <div class="performance-item">
            <div class="performance-habit">${item.habit}</div>
            <div class="performance-bar">
                <div class="performance-fill" style="width: ${item.percentage}%"></div>
            </div>
            <div class="performance-percentage">${Math.round(item.percentage)}%</div>
        </div>
    `).join('');
}

// Update weekly pattern chart
function updateWeeklyPatternChart() {
    const ctx = document.getElementById('weekly-pattern-chart').getContext('2d');
    const analytics = calculateAnalytics(currentTimeframe);
    
    if (analyticsCharts.weekly) {
        analyticsCharts.weekly.destroy();
    }
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    analyticsCharts.weekly = createResponsiveChart(ctx, {
        type: 'bar',
        data: {
            labels: dayNames,
            datasets: [{
                label: 'Average Completion',
                data: analytics.weeklyPattern,
                backgroundColor: 'rgba(102, 126, 234, 0.6)',
                borderColor: '#667eea',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Generate smart insights
function updateInsights() {
    const container = document.getElementById('insights-container');
    const analytics = calculateAnalytics(currentTimeframe);
    const insights = [];
    
    // Completion rate insight
    if (analytics.overallCompletion >= 80) {
        insights.push({
            icon: '🌟',
            title: 'Excellent Progress!',
            description: `You're maintaining an ${analytics.overallCompletion}% completion rate. Keep up the amazing work!`
        });
    } else if (analytics.overallCompletion >= 60) {
        insights.push({
            icon: '👍',
            title: 'Good Momentum',
            description: `Your ${analytics.overallCompletion}% completion rate shows solid progress. Consider focusing on consistency.`
        });
    } else {
        insights.push({
            icon: '💪',
            title: 'Room for Growth',
            description: `Your ${analytics.overallCompletion}% completion rate suggests opportunities for improvement. Start with your easiest habits!`
        });
    }
    
    // Best day insight
    const bestDayIndex = analytics.weeklyPattern.indexOf(Math.max(...analytics.weeklyPattern));
    const bestDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][bestDayIndex];
    if (analytics.weeklyPattern[bestDayIndex] > 70) {
        insights.push({
            icon: '📅',
            title: 'Peak Performance Day',
            description: `${bestDay} is your most productive day with ${Math.round(analytics.weeklyPattern[bestDayIndex])}% completion. Try scheduling important habits then!`
        });
    }
    
    // Streak insight
    if (analytics.activeStreaks > 0) {
        insights.push({
            icon: '🔥',
            title: 'Streak Master',
            description: `You have ${analytics.activeStreaks} active streak${analytics.activeStreaks > 1 ? 's' : ''}! Consistency is your superpower.`
        });
    }
    
    // Perfect days insight
    if (analytics.perfectDays > 0) {
        insights.push({
            icon: '⭐',
            title: 'Perfect Days',
            description: `You've achieved ${analytics.perfectDays} perfect day${analytics.perfectDays > 1 ? 's' : ''} recently. Aim for more!`
        });
    }
    
    container.innerHTML = insights.map(insight => `
        <div class="insight-card">
            <span class="insight-icon">${insight.icon}</span>
            <div class="insight-title">${insight.title}</div>
            <div class="insight-description">${insight.description}</div>
        </div>
    `).join('');
}

// Update rankings
function updateRankings() {
    showRanking(currentRankingType);
}

// Show specific ranking type
function showRanking(type) {
    currentRankingType = type;
    
    // Update tab states
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event?.target?.classList.add('active') || 
    document.querySelector(`[onclick="showRanking('${type}')"]`)?.classList.add('active');
    
    const container = document.getElementById('rankings-content');
    let rankingData = [];
    
    switch(type) {
        case 'consistency':
            rankingData = getConsistencyRanking();
            break;
        case 'improving':
            rankingData = getImprovingRanking();
            break;
        case 'challenging':
            rankingData = getChallengingRanking();
            break;
    }
    
    container.innerHTML = rankingData.map((item, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        return `
            <div class="ranking-item">
                <div class="ranking-position">${index + 1}</div>
                <div class="ranking-medal">${medal}</div>
                <div class="ranking-content">
                    <div class="ranking-habit">${item.name}</div>
                    <div class="ranking-stats">${item.stats}</div>
                </div>
                <div class="ranking-score">${item.score}</div>
            </div>
        `;
    }).join('');
}

// Calculate consistency ranking
function getConsistencyRanking() {
    return habits.map(habit => {
        const analytics = calculateAnalytics(currentTimeframe);
        const habitDays = Object.entries(habitHistory).filter(([date, dayHabits]) => {
            const d = new Date(date);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - currentTimeframe);
            return d >= cutoff && dayHabits[habit.id] !== undefined;
        });
        
        const completed = habitDays.filter(([_, dayHabits]) => dayHabits[habit.id]).length;
        const total = habitDays.length;
        const percentage = total > 0 ? (completed / total) * 100 : 0;
        
        return {
            name: habit.text,
            score: `${Math.round(percentage)}%`,
            stats: `${completed}/${total} days completed`,
            value: percentage
        };
    }).sort((a, b) => b.value - a.value);
}

// Calculate improving ranking
function getImprovingRanking() {
    return habits.map(habit => {
        const recent = calculateHabitPerformance(habit, Math.floor(currentTimeframe / 2));
        const previous = calculateHabitPerformance(habit, currentTimeframe, Math.floor(currentTimeframe / 2));
        const improvement = recent - previous;
        
        return {
            name: habit.text,
            score: improvement > 0 ? `+${Math.round(improvement)}%` : `${Math.round(improvement)}%`,
            stats: `Current: ${Math.round(recent)}%, Previous: ${Math.round(previous)}%`,
            value: improvement
        };
    }).sort((a, b) => b.value - a.value);
}

// Calculate challenging ranking
function getChallengingRanking() {
    return habits.map(habit => {
        const analytics = calculateAnalytics(currentTimeframe);
        const habitDays = Object.entries(habitHistory).filter(([date, dayHabits]) => {
            const d = new Date(date);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - currentTimeframe);
            return d >= cutoff && dayHabits[habit.id] !== undefined;
        });
        
        const completed = habitDays.filter(([_, dayHabits]) => dayHabits[habit.id]).length;
        const total = habitDays.length;
        const percentage = total > 0 ? (completed / total) * 100 : 0;
        
        return {
            name: habit.text,
            score: `${Math.round(percentage)}%`,
            stats: `Needs attention - ${total - completed} missed days`,
            value: 100 - percentage // Invert for challenging (lower completion = higher challenge)
        };
    }).sort((a, b) => b.value - a.value);
}

// Helper function to calculate habit performance for a period
function calculateHabitPerformance(habit, days, offset = 0) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - offset);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - days);
    
    let completed = 0;
    let total = 0;
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateString = d.toDateString();
        const dayHabits = habitHistory[dateString];
        
        if (dayHabits && dayHabits[habit.id] !== undefined) {
            total++;
            if (dayHabits[habit.id]) completed++;
        }
    }
    
    return total > 0 ? (completed / total) * 100 : 0;
}

// Export analytics report
function exportAnalytics() {
    const analytics = calculateAnalytics(currentTimeframe);
    const reportData = {
        generatedAt: new Date().toISOString(),
        timeframe: `${currentTimeframe} days`,
        metrics: {
            overallCompletion: analytics.overallCompletion,
            activeStreaks: analytics.activeStreaks,
            perfectDays: analytics.perfectDays,
            topCategory: analytics.topCategory
        },
        habits: habits.map(habit => ({
            name: habit.text,
            category: habit.category,
            streak: habit.streak,
            bestStreak: habit.bestStreak
        }))
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Initialize analytics when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    // ... existing initialization ...
    
    setTimeout(() => {
        initializeAnalytics();
    }, 100);
});

// Chart resize handler for responsive behavior
function handleChartResize() {
    const newIsMobile = window.innerWidth <= 480;
    const newIsTablet = window.innerWidth > 480 && window.innerWidth <= 768;
    
    // Check if we've crossed mobile/tablet/desktop boundaries
    const currentIsMobile = document.body.getAttribute('data-is-mobile') === 'true';
    const currentIsTablet = document.body.getAttribute('data-is-tablet') === 'true';
    
    if (newIsMobile !== currentIsMobile || newIsTablet !== currentIsTablet) {
        // Update data attributes
        document.body.setAttribute('data-is-mobile', newIsMobile);
        document.body.setAttribute('data-is-tablet', newIsTablet);
        
        // Recreate charts with new responsive settings
        if (typeof updateProgressChart === 'function') updateProgressChart();
        if (typeof updateCategoryChart === 'function') updateCategoryChart();
        if (typeof updateWeeklyPatternChart === 'function') updateWeeklyPatternChart();
    } else {
        // Just resize existing charts
        Object.values(analyticsCharts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }
}

// Add window resize listener for charts
window.addEventListener('resize', debounce(handleChartResize, 250));

// Debounce utility for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Enhanced chart update functions with better responsiveness
function createResponsiveChart(ctx, config) {
    // Ensure responsive options are set
    if (!config.options) config.options = {};
    config.options.responsive = true;
    config.options.maintainAspectRatio = false;
    
    // Add aspect ratio control for mobile
    const isMobile = window.innerWidth <= 480;
    const isTablet = window.innerWidth > 480 && window.innerWidth <= 768;
    
    if (isMobile) {
        // Fixed aspect ratio for mobile to prevent stretching
        config.options.aspectRatio = 1.8; // Width:Height ratio
        config.options.maintainAspectRatio = true;
    } else if (isTablet) {
        config.options.aspectRatio = 2.0;
        config.options.maintainAspectRatio = true;
    }
    
    // Add layout padding for better mobile display
    if (!config.options.layout) config.options.layout = {};
    config.options.layout.padding = isMobile ? 10 : 15;
    
    // Add responsive font sizes
    if (!config.options.plugins) config.options.plugins = {};
    if (!config.options.plugins.legend) config.options.plugins.legend = {};
    
    // Responsive font sizing based on screen width
    const baseSize = isMobile ? 9 : (isTablet ? 10 : 12);
    config.options.plugins.legend.labels = {
        ...config.options.plugins.legend.labels,
        font: { size: baseSize },
        padding: isMobile ? 8 : 12
    };
    
    if (config.options.scales) {
        Object.keys(config.options.scales).forEach(axis => {
            if (!config.options.scales[axis].ticks) {
                config.options.scales[axis].ticks = {};
            }
            config.options.scales[axis].ticks.font = { size: baseSize - 1 };
            // Reduce tick padding on mobile
            config.options.scales[axis].ticks.padding = isMobile ? 4 : 8;
        });
    }
    
    return new Chart(ctx, config);
}
