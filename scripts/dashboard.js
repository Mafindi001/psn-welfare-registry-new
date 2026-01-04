/**
 * Dashboard Functionality for PSN Welfare Registry - Vercel Compatible
 */

// Dashboard State
const DashboardState = {
    currentSection: 'dashboard',
    specialDates: [],
    nextOfKin: [],
    userData: {},
    isLoading: false,
    isEditing: false,
    currentEditId: null
};

// DOM Elements cache
const DashboardElements = {
    sidebar: null,
    mobileMenuToggle: null,
    logoutBtn: null,
    navItems: null,
    pageTitle: null,
    pageSubtitle: null,
    sections: {},
    modals: {},
    buttons: {}
};

/**
 * Initialize Dashboard
 */
async function initDashboard() {
    try {
        console.log('🚀 Initializing dashboard...');

        // Check authentication
        if (!requireAuth()) {
            return;
        }

        // Cache DOM elements
        cacheElements();

        // Load user data
        await loadUserData();

        // Set up event listeners
        setupEventListeners();

        // Show dashboard by default
        showSection('dashboard');

        // Load initial data
        await Promise.all([
            loadSpecialDates(),
            loadNextOfKin()
        ]);

        // Update stats
        updateStats();

        // Initialize any chart if needed
        if (typeof chartManager !== 'undefined') {
            initializeDashboardCharts();
        }

        console.log('✅ Dashboard initialized successfully');

    } catch (error) {
        console.error('❌ Dashboard initialization failed:', error);
        showNotification('Failed to initialize dashboard', 'error');
    }
}

/**
 * Cache DOM elements for better performance
 */
function cacheElements() {
    // Main elements
    DashboardElements.sidebar = document.getElementById('sidebar');
    DashboardElements.mobileMenuToggle = document.getElementById('mobileMenuToggle');
    DashboardElements.logoutBtn = document.getElementById('logoutBtn');
    DashboardElements.navItems = document.querySelectorAll('.nav-item');
    DashboardElements.pageTitle = document.getElementById('pageTitle');
    DashboardElements.pageSubtitle = document.getElementById('pageSubtitle');

    // Section elements
    DashboardElements.sections = {
        'dashboard': document.getElementById('dashboardSection'),
        'profile': document.getElementById('profileSection'),
        'special-dates': document.getElementById('specialDatesSection'),
        'next-of-kin': document.getElementById('nextOfKinSection'),
        'reminders': document.getElementById('remindersSection'),
        'settings': document.getElementById('settingsSection')
    };

    // Modal elements
    DashboardElements.modals = {
        'addDate': document.getElementById('addDateModal'),
        'addKin': document.getElementById('addKinModal'),
        'editDate': document.getElementById('editDateModal'),
        'editKin': document.getElementById('editKinModal')
    };

    // Button elements
    DashboardElements.buttons = {
        'addDateBtn': document.getElementById('addDateBtn'),
        'addNextKinBtn': document.getElementById('addNextKinBtn'),
        'saveDateBtn': document.getElementById('saveDateBtn'),
        'saveKinBtn': document.getElementById('saveKinBtn'),
        'cancelDateBtn': document.getElementById('cancelDateBtn'),
        'cancelKinBtn': document.getElementById('cancelKinBtn'),
        'editProfileBtn': document.getElementById('editProfileBtn'),
        'changePasswordBtn': document.getElementById('changePasswordBtn'),
        'addNewDateBtn': document.getElementById('addNewDateBtn'),
        'addFirstDateBtn': document.getElementById('addFirstDateBtn'),
        'addKinBtn': document.getElementById('addKinBtn'),
        'viewAllEvents': document.getElementById('viewAllEvents')
    };

    // Modal close buttons
    DashboardElements.modalCloses = document.querySelectorAll('.modal-close');
}

/**
 * Load user data from localStorage or API
 */
async function loadUserData() {
    try {
        const user = getCurrentUser();

        if (!user) {
            showNotification('User data not found. Please login again.', 'error');
            setTimeout(() => {
                window.location.href = '/pages/login.html';
            }, 2000);
            return;
        }

        DashboardState.userData = user;

        // Update UI with user data
        updateUserUI(user);

        // Calculate profile completion
        calculateProfileCompletion();

        // Try to fetch fresh user data from API
        if (typeof ApiService !== 'undefined') {
            try {
                const freshData = await ApiService.getCurrentUserProfile();
                DashboardState.userData = { ...user, ...freshData };
                updateUserUI(DashboardState.userData);
            } catch (apiError) {
                console.warn('Could not fetch fresh user data:', apiError);
                // Continue with cached data
            }
        }

    } catch (error) {
        console.error('Error loading user data:', error);
        throw error;
    }
}

/**
 * Update UI with user data
 */
function updateUserUI(user) {
    // Update sidebar
    const userNameEl = document.getElementById('userName');
    const userPsnEl = document.getElementById('userPsn');

    if (userNameEl) userNameEl.textContent = user.fullName || 'Pharmacist';
    if (userPsnEl) userPsnEl.textContent = user.psnNumber || 'PSN Member';

    // Update profile section
    const profileNameEl = document.getElementById('profileName');
    const profilePsnEl = document.getElementById('profilePsn');
    const profileEmailEl = document.getElementById('profileEmail');
    const profilePhoneEl = document.getElementById('profilePhone');
    const profileDobEl = document.getElementById('profileDob');
    const profileWeddingEl = document.getElementById('profileWedding');

    if (profileNameEl) profileNameEl.textContent = user.fullName || 'Not set';
    if (profilePsnEl) profilePsnEl.textContent = user.psnNumber || 'Not set';
    if (profileEmailEl) profileEmailEl.textContent = user.email || 'Not set';
    if (profilePhoneEl) profilePhoneEl.textContent = user.phone || 'Not set';
    if (profileDobEl) profileDobEl.textContent = user.dateOfBirth ? formatDate(user.dateOfBirth) : 'Not set';
    if (profileWeddingEl) profileWeddingEl.textContent = user.weddingDate ? formatDate(user.weddingDate) : 'Not set';
}

/**
 * Calculate and update profile completion
 */
function calculateProfileCompletion() {
    const user = DashboardState.userData;
    let completion = 20; // Base score for registration

    const fields = [
        user.fullName,
        user.phone,
        user.email,
        user.dateOfBirth,
        user.weddingDate
    ];

    // Add points for each filled field
    fields.forEach(field => {
        if (field && field.trim() !== '') completion += 16; // 16% per field
    });

    // Cap at 100%
    completion = Math.min(completion, 100);

    const profileCompleteEl = document.getElementById('profileComplete');
    if (profileCompleteEl) {
        profileCompleteEl.textContent = `${completion}%`;

        // Update progress bar if exists
        const progressBar = document.querySelector('.profile-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${completion}%`;
        }
    }
}

/**
 * Load special dates from API
 */
async function loadSpecialDates() {
    try {
        DashboardState.isLoading = true;

        if (typeof ApiService !== 'undefined') {
            // Try to fetch from API
            const response = await ApiService.getSpecialDates();
            DashboardState.specialDates = response.data || [];
        } else {
            // Fallback to mock data for demo
            DashboardState.specialDates = generateMockSpecialDates();
        }

        updateSpecialDatesUI();

    } catch (error) {
        console.error('Error loading special dates:', error);
        showNotification('Failed to load special dates', 'error');
        DashboardState.specialDates = [];
    } finally {
        DashboardState.isLoading = false;
    }
}

/**
 * Generate mock special dates for demo
 */
function generateMockSpecialDates() {
    return [
        {
            id: '1',
            label: 'Birthday',
            date: '1985-05-15',
            isAnnual: true,
            reminderEnabled: true,
            recipients: ['member', 'primary_kin'],
            notes: ''
        },
        {
            id: '2',
            label: 'Wedding Anniversary',
            date: '2015-06-22',
            isAnnual: true,
            reminderEnabled: true,
            recipients: ['member', 'primary_kin'],
            notes: ''
        },
        {
            id: '3',
            label: 'Child\'s Birthday',
            date: '2018-03-10',
            isAnnual: true,
            reminderEnabled: true,
            recipients: ['member'],
            notes: ''
        }
    ];
}

/**
 * Load next of kin from API
 */
async function loadNextOfKin() {
    try {
        DashboardState.isLoading = true;

        if (typeof ApiService !== 'undefined') {
            // Try to fetch from API
            const response = await ApiService.getNextOfKin();
            DashboardState.nextOfKin = response.data || [];
        } else {
            // Fallback to mock data for demo
            DashboardState.nextOfKin = generateMockNextOfKin();
        }

        updateNextOfKinUI();

    } catch (error) {
        console.error('Error loading next of kin:', error);
        showNotification('Failed to load next of kin', 'error');
        DashboardState.nextOfKin = [];
    } finally {
        DashboardState.isLoading = false;
    }
}

/**
 * Generate mock next of kin for demo
 */
function generateMockNextOfKin() {
    return [
        {
            id: '1',
            fullName: 'Jane Pharmacist',
            relationship: 'Spouse',
            phone: '0803 987 6543',
            email: 'jane@example.com',
            isPrimary: true,
            address: '',
            notes: ''
        },
        {
            id: '2',
            fullName: 'Dr. James Parent',
            relationship: 'Parent',
            phone: '0802 123 4567',
            email: 'james@example.com',
            isPrimary: false,
            address: '',
            notes: ''
        }
    ];
}

/**
 * Update special dates in UI
 */
function updateSpecialDatesUI() {
    const datesTableBody = document.getElementById('datesTableBody');
    const noDatesMessage = document.getElementById('noDatesMessage');
    const datesTable = document.getElementById('datesTable');

    if (!datesTableBody || !noDatesMessage || !datesTable) return;

    if (DashboardState.specialDates.length === 0) {
        noDatesMessage.style.display = 'block';
        datesTable.style.display = 'none';
        return;
    }

    noDatesMessage.style.display = 'none';
    datesTable.style.display = 'table';

    // Clear existing rows
    datesTableBody.innerHTML = '';

    // Add rows for each date
    DashboardState.specialDates.forEach(date => {
        const row = document.createElement('tr');
        const daysUntil = getDaysUntil(date.date);

        let statusClass = 'status-active';
        let statusText = 'Active';

        if (!date.reminderEnabled) {
            statusClass = 'status-inactive';
            statusText = 'Inactive';
        } else if (daysUntil <= 0) {
            statusClass = 'status-warning';
            statusText = 'Today/Past';
        }

        row.innerHTML = `
            <td class="date-label">
                <strong>${date.label}</strong>
                ${date.isAnnual ? '<span class="badge annual-badge">Annual</span>' : ''}
            </td>
            <td class="date-value">${formatDate(date.date, 'long')}</td>
            <td>
                <i class="fas ${date.isAnnual ? 'fa-check text-success' : 'fa-times text-muted'}"></i>
            </td>
            <td>${getRecipientsText(date.recipients)}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${statusText}
                </span>
                ${daysUntil > 0 ? `<br><small>In ${daysUntil} days</small>` : ''}
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-outline btn-sm" onclick="editDate('${date.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline btn-sm btn-danger" onclick="deleteDate('${date.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        datesTableBody.appendChild(row);
    });
}

/**
 * Update next of kin in UI
 */
function updateNextOfKinUI() {
    const nextkinGrid = document.getElementById('nextkinGrid');

    if (!nextkinGrid) return;

    // Clear existing cards
    nextkinGrid.innerHTML = '';

    if (DashboardState.nextOfKin.length === 0) {
        nextkinGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No next of kin added</h3>
                <p>Add your emergency contacts for welfare purposes</p>
                <button class="btn btn-primary" onclick="openAddKinModal()">
                    <i class="fas fa-user-plus"></i> Add First Contact
                </button>
            </div>
        `;
        return;
    }

    // Add cards for each next of kin
    DashboardState.nextOfKin.forEach(kin => {
        const card = document.createElement('div');
        card.className = 'nextkin-card';

        if (kin.isPrimary) {
            card.classList.add('primary-card');
        }

        card.innerHTML = `
            ${kin.isPrimary ? '<span class="primary-badge">Primary Contact</span>' : ''}
            <div class="nextkin-header">
                <h3 class="nextkin-name">${kin.fullName}</h3>
                <span class="nextkin-relationship">${kin.relationship}</span>
            </div>
            <div class="nextkin-details">
                <div class="nextkin-detail">
                    <i class="fas fa-phone"></i>
                    <span>${kin.phone}</span>
                </div>
                ${kin.email ? `
                <div class="nextkin-detail">
                    <i class="fas fa-envelope"></i>
                    <span>${kin.email}</span>
                </div>
                ` : ''}
                ${kin.address ? `
                <div class="nextkin-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${kin.address}</span>
                </div>
                ` : ''}
            </div>
            <div class="event-actions">
                <button class="btn btn-outline btn-sm" onclick="editKin('${kin.id}')" title="Edit">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-outline btn-sm btn-danger" onclick="deleteKin('${kin.id}')" title="Remove">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;

        nextkinGrid.appendChild(card);
    });
}

/**
 * Update dashboard stats
 */
function updateStats() {
    const birthdays = DashboardState.specialDates.filter(d =>
        d.label.toLowerCase().includes('birthday')).length;
    const anniversaries = DashboardState.specialDates.filter(d =>
        d.label.toLowerCase().includes('anniversary')).length;

    // Count upcoming events (within next 60 days)
    const today = new Date();
    const upcoming = DashboardState.specialDates.filter(date => {
        const daysUntil = getDaysUntil(date.date);
        return daysUntil >= 0 && daysUntil <= 60;
    }).length;

    const birthdayCountEl = document.getElementById('birthdayCount');
    const anniversaryCountEl = document.getElementById('anniversaryCount');
    const upcomingCountEl = document.getElementById('upcomingCount');

    if (birthdayCountEl) birthdayCountEl.textContent = birthdays;
    if (anniversaryCountEl) anniversaryCountEl.textContent = anniversaries;
    if (upcomingCountEl) upcomingCountEl.textContent = upcoming;
}

/**
 * Show a specific section
 */
function showSection(section) {
    if (!section || !DashboardElements.sections[section]) {
        console.error(`Section "${section}" not found`);
        return;
    }

    // Hide all sections
    Object.values(DashboardElements.sections).forEach(sec => {
        if (sec) {
            sec.style.display = 'none';
            sec.classList.remove('active-section');
        }
    });

    // Update navigation
    DashboardElements.navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === section) {
            item.classList.add('active');
        }
    });

    // Show selected section
    DashboardState.currentSection = section;
    const targetSection = DashboardElements.sections[section];

    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active-section');

        // Update page title
        const sectionTitles = {
            'dashboard': 'Dashboard Overview',
            'profile': 'My Profile',
            'special-dates': 'Special Dates',
            'next-of-kin': 'Next of Kin',
            'reminders': 'Reminders',
            'settings': 'Settings'
        };

        const user = getCurrentUser();
        const sectionSubtitles = {
            'dashboard': `Welcome ${user?.fullName?.split(' ')[0] || 'Pharmacist'}, to your welfare management dashboard`,
            'profile': 'Manage your personal information',
            'special-dates': 'Manage your important dates and reminders',
            'next-of-kin': 'Manage your emergency contacts',
            'reminders': 'Configure your notification settings',
            'settings': 'Manage your account preferences'
        };

        if (DashboardElements.pageTitle) {
            DashboardElements.pageTitle.textContent = sectionTitles[section] || 'Dashboard';
        }

        if (DashboardElements.pageSubtitle) {
            DashboardElements.pageSubtitle.textContent = sectionSubtitles[section] || 'Welfare Management Dashboard';
        }
    }

    // Close mobile menu on selection
    if (window.innerWidth <= 992 && DashboardElements.sidebar) {
        DashboardElements.sidebar.classList.remove('open');
    }
}

/**
 * Open add date modal
 */
function openAddDateModal() {
    const modal = DashboardElements.modals.addDate;
    if (!modal) return;

    DashboardState.isEditing = false;
    DashboardState.currentEditId = null;

    // Reset form
    const form = modal.querySelector('#addDateForm');
    if (form) form.reset();

    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = document.getElementById('eventDate');
    if (dateInput) {
        dateInput.value = tomorrow.toISOString().split('T')[0];
        dateInput.min = new Date().toISOString().split('T')[0];
    }

    // Update modal title
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) modalTitle.textContent = 'Add Special Date';

    modal.style.display = 'flex';
}

/**
 * Open add next of kin modal
 */
function openAddKinModal() {
    const modal = DashboardElements.modals.addKin;
    if (!modal) return;

    DashboardState.isEditing = false;
    DashboardState.currentEditId = null;

    // Reset form
    const form = modal.querySelector('#addKinForm');
    if (form) form.reset();

    // Update modal title
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) modalTitle.textContent = 'Add Next of Kin';

    modal.style.display = 'flex';
}

/**
 * Save new special date
 */
async function saveNewDate() {
    try {
        const label = document.getElementById('dateLabel')?.value.trim();
        const date = document.getElementById('eventDate')?.value;
        const isAnnual = document.getElementById('isAnnual')?.checked || false;
        const remindMember = document.getElementById('remindMember')?.checked || false;
        const remindNextKin = document.getElementById('remindNextKin')?.checked || false;
        const notes = document.getElementById('dateNotes')?.value.trim() || '';

        if (!label || !date) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Prepare date object
        const dateObj = {
            label,
            date,
            isAnnual,
            reminderEnabled: true,
            recipients: [],
            notes
        };

        if (remindMember) dateObj.recipients.push('member');
        if (remindNextKin) dateObj.recipients.push('primary_kin');

        // Check if editing or adding new
        if (DashboardState.isEditing && DashboardState.currentEditId) {
            // Update existing date
            dateObj.id = DashboardState.currentEditId;

            if (typeof ApiService !== 'undefined') {
                await ApiService.updateSpecialDate(dateObj.id, dateObj);
            }

            const index = DashboardState.specialDates.findIndex(d => d.id === dateObj.id);
            if (index !== -1) {
                DashboardState.specialDates[index] = dateObj;
            }

            showNotification('Special date updated successfully', 'success');
        } else {
            // Add new date
            dateObj.id = generateId();

            if (typeof ApiService !== 'undefined') {
                await ApiService.addSpecialDate(dateObj);
            }

            DashboardState.specialDates.push(dateObj);
            showNotification('Special date added successfully', 'success');
        }

        // Update UI
        updateSpecialDatesUI();
        updateStats();

        // Close modal
        const modal = DashboardElements.modals.addDate;
        if (modal) modal.style.display = 'none';

        // Reset state
        DashboardState.isEditing = false;
        DashboardState.currentEditId = null;

    } catch (error) {
        console.error('Error saving date:', error);
        showNotification('Failed to save date: ' + error.message, 'error');
    }
}

/**
 * Save new next of kin
 */
async function saveNewKin() {
    try {
        const name = document.getElementById('kinName')?.value.trim();
        const relationship = document.getElementById('kinRelationship')?.value.trim();
        const phone = document.getElementById('kinPhone')?.value.trim();
        const email = document.getElementById('kinEmail')?.value.trim() || '';
        const address = document.getElementById('kinAddress')?.value.trim() || '';
        const isPrimary = document.getElementById('isPrimaryKin')?.checked || false;
        const notes = document.getElementById('kinNotes')?.value.trim() || '';

        if (!name || !relationship || !phone) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        if (!isValidNigerianPhone(phone)) {
            showNotification('Please enter a valid Nigerian phone number', 'error');
            return;
        }

        if (email && !isValidEmail(email)) {
            showNotification('Please enter a valid email address', 'error');
            return;
        }

        // Prepare kin object
        const kinObj = {
            fullName: name,
            relationship,
            phone,
            email,
            address,
            isPrimary,
            notes
        };

        // If setting as primary, remove primary from others
        if (isPrimary) {
            DashboardState.nextOfKin.forEach(kin => kin.isPrimary = false);
        }

        // Check if editing or adding new
        if (DashboardState.isEditing && DashboardState.currentEditId) {
            // Update existing kin
            kinObj.id = DashboardState.currentEditId;

            if (typeof ApiService !== 'undefined') {
                await ApiService.updateNextOfKin(kinObj.id, kinObj);
            }

            const index = DashboardState.nextOfKin.findIndex(k => k.id === kinObj.id);
            if (index !== -1) {
                DashboardState.nextOfKin[index] = kinObj;
            }

            showNotification('Next of kin updated successfully', 'success');
        } else {
            // Add new kin
            kinObj.id = generateId();

            if (typeof ApiService !== 'undefined') {
                await ApiService.addNextOfKin(kinObj);
            }

            DashboardState.nextOfKin.push(kinObj);
            showNotification('Next of kin added successfully', 'success');
        }

        // Update UI
        updateNextOfKinUI();

        // Close modal
        const modal = DashboardElements.modals.addKin;
        if (modal) modal.style.display = 'none';

        // Reset state
        DashboardState.isEditing = false;
        DashboardState.currentEditId = null;

    } catch (error) {
        console.error('Error saving next of kin:', error);
        showNotification('Failed to save next of kin: ' + error.message, 'error');
    }
}

/**
 * Edit a special date
 */
function editDate(dateId) {
    const date = DashboardState.specialDates.find(d => d.id === dateId);
    if (!date) return;

    DashboardState.isEditing = true;
    DashboardState.currentEditId = dateId;

    const modal = DashboardElements.modals.addDate;
    if (!modal) return;

    // Fill form with date data
    document.getElementById('dateLabel').value = date.label || '';
    document.getElementById('eventDate').value = date.date || '';
    document.getElementById('isAnnual').checked = date.isAnnual || false;
    document.getElementById('remindMember').checked = date.recipients?.includes('member') || false;
    document.getElementById('remindNextKin').checked = date.recipients?.includes('primary_kin') || false;
    document.getElementById('dateNotes').value = date.notes || '';

    // Update modal title
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) modalTitle.textContent = 'Edit Special Date';

    modal.style.display = 'flex';
}

/**
 * Delete a special date
 */
async function deleteDate(dateId) {
    if (!confirm('Are you sure you want to delete this special date?')) {
        return;
    }

    try {
        if (typeof ApiService !== 'undefined') {
            await ApiService.deleteSpecialDate(dateId);
        }

        DashboardState.specialDates = DashboardState.specialDates.filter(d => d.id !== dateId);
        updateSpecialDatesUI();
        updateStats();
        showNotification('Special date deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting date:', error);
        showNotification('Failed to delete date: ' + error.message, 'error');
    }
}

/**
 * Edit next of kin
 */
function editKin(kinId) {
    const kin = DashboardState.nextOfKin.find(k => k.id === kinId);
    if (!kin) return;

    DashboardState.isEditing = true;
    DashboardState.currentEditId = kinId;

    const modal = DashboardElements.modals.addKin;
    if (!modal) return;

    // Fill form with kin data
    document.getElementById('kinName').value = kin.fullName || '';
    document.getElementById('kinRelationship').value = kin.relationship || '';
    document.getElementById('kinPhone').value = kin.phone || '';
    document.getElementById('kinEmail').value = kin.email || '';
    document.getElementById('kinAddress').value = kin.address || '';
    document.getElementById('isPrimaryKin').checked = kin.isPrimary || false;
    document.getElementById('kinNotes').value = kin.notes || '';

    // Update modal title
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) modalTitle.textContent = 'Edit Next of Kin';

    modal.style.display = 'flex';
}

/**
 * Delete next of kin
 */
async function deleteKin(kinId) {
    if (!confirm('Are you sure you want to remove this next of kin?')) {
        return;
    }

    try {
        if (typeof ApiService !== 'undefined') {
            await ApiService.deleteNextOfKin(kinId);
        }

        DashboardState.nextOfKin = DashboardState.nextOfKin.filter(k => k.id !== kinId);
        updateNextOfKinUI();
        showNotification('Next of kin removed successfully', 'success');
    } catch (error) {
        console.error('Error deleting next of kin:', error);
        showNotification('Failed to remove next of kin: ' + error.message, 'error');
    }
}

/**
 * Get text representation of recipients
 */
function getRecipientsText(recipients) {
    if (!recipients || recipients.length === 0) {
        return 'None';
    }

    const texts = recipients.map(r => {
        switch (r) {
            case 'member': return 'You';
            case 'primary_kin': return 'Primary Kin';
            case 'all_kin': return 'All Kin';
            default: return r.replace('_', ' ');
        }
    });

    return texts.join(', ');
}

/**
 * Initialize dashboard charts
 */
function initializeDashboardCharts() {
    // This would initialize charts on the dashboard
    // For example:
    // chartManager.createDashboardCharts('dashboardChartsContainer', DashboardState.userData);
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Mobile menu toggle
    if (DashboardElements.mobileMenuToggle && DashboardElements.sidebar) {
        DashboardElements.mobileMenuToggle.addEventListener('click', () => {
            DashboardElements.sidebar.classList.toggle('open');
        });
    }

    // Navigation items
    DashboardElements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            showSection(section);
        });
    });

    // Logout
    if (DashboardElements.logoutBtn) {
        DashboardElements.logoutBtn.addEventListener('click', logout);
    }

    // Modal buttons
    if (DashboardElements.buttons.addDateBtn) {
        DashboardElements.buttons.addDateBtn.addEventListener('click', openAddDateModal);
    }

    if (DashboardElements.buttons.addNextKinBtn) {
        DashboardElements.buttons.addNextKinBtn.addEventListener('click', openAddKinModal);
    }

    // Save buttons
    if (DashboardElements.buttons.saveDateBtn) {
        DashboardElements.buttons.saveDateBtn.addEventListener('click', saveNewDate);
    }

    if (DashboardElements.buttons.saveKinBtn) {
        DashboardElements.buttons.saveKinBtn.addEventListener('click', saveNewKin);
    }

    // Cancel buttons
    if (DashboardElements.buttons.cancelDateBtn) {
        DashboardElements.buttons.cancelDateBtn.addEventListener('click', () => {
            const modal = DashboardElements.modals.addDate;
            if (modal) modal.style.display = 'none';
            DashboardState.isEditing = false;
            DashboardState.currentEditId = null;
        });
    }

    if (DashboardElements.buttons.cancelKinBtn) {
        DashboardElements.buttons.cancelKinBtn.addEventListener('click', () => {
            const modal = DashboardElements.modals.addKin;
            if (modal) modal.style.display = 'none';
            DashboardState.isEditing = false;
            DashboardState.currentEditId = null;
        });
    }

    // Other buttons
    const buttons = ['addNewDateBtn', 'addFirstDateBtn', 'addKinBtn'];
    buttons.forEach(btnId => {
        const btn = DashboardElements.buttons[btnId];
        if (btn) {
            if (btnId.includes('Date')) {
                btn.addEventListener('click', openAddDateModal);
            } else if (btnId.includes('Kin')) {
                btn.addEventListener('click', openAddKinModal);
            }
        }
    });

    if (DashboardElements.buttons.viewAllEvents) {
        DashboardElements.buttons.viewAllEvents.addEventListener('click', () => {
            showSection('special-dates');
        });
    }

    // Modal close buttons
    DashboardElements.modalCloses.forEach(btn => {
        btn.addEventListener('click', () => {
            Object.values(DashboardElements.modals).forEach(modal => {
                if (modal) modal.style.display = 'none';
            });
            DashboardState.isEditing = false;
            DashboardState.currentEditId = null;
        });
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        Object.values(DashboardElements.modals).forEach(modal => {
            if (modal && e.target === modal) {
                modal.style.display = 'none';
                DashboardState.isEditing = false;
                DashboardState.currentEditId = null;
            }
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape key closes modals
        if (e.key === 'Escape') {
            Object.values(DashboardElements.modals).forEach(modal => {
                if (modal && modal.style.display === 'flex') {
                    modal.style.display = 'none';
                    DashboardState.isEditing = false;
                    DashboardState.currentEditId = null;
                }
            });
        }
    });
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', initDashboard);

// Export functions for use in other modules
window.showSection = showSection;
window.openAddDateModal = openAddDateModal;
window.openAddKinModal = openAddKinModal;
window.saveNewDate = saveNewDate;
window.saveNewKin = saveNewKin;
window.editDate = editDate;
window.deleteDate = deleteDate;
window.editKin = editKin;
window.deleteKin = deleteKin;

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initDashboard,
        showSection,
        openAddDateModal,
        openAddKinModal,
        saveNewDate,
        saveNewKin,
        editDate,
        deleteDate,
        editKin,
        deleteKin
    };
}