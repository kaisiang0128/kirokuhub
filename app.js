/**
 * KirokuHub - Enhanced Cloud Version
 * Fixed Settings & I18n Engine
 */

const firebaseConfig = {
    apiKey: "AIzaSyAAk2hfkIpIwFyg8BG9XAYx98OGCBn1yds",
    authDomain: "kirokuhub.firebaseapp.com",
    projectId: "kirokuhub",
    storageBucket: "kirokuhub.firebasestorage.app",
    messagingSenderId: "470629468332",
    appId: "1:470629468332:web:0a11ef8c0158ce32d1b709"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial State with Defaults
    const state = {
        transactions: [],
        inventory: [],
        settings: {
            language: 'en',
            currency: 'MYR',
            theme: 'dark',
            glassOpacity: 0.8
        }
    };

    const translations = {
        en: {
            'nav-dashboard': 'Dashboard',
            'nav-inventory': 'Inventory',
            'nav-finance': 'Finance',
            'nav-settings': 'Settings',
            'total-profit': 'Total Profit',
            'total-expense': 'Total Expense',
            'low-stock': 'Low Stock',
            'inventory-count': 'Inventory Items',
            'recent-activity': 'Recent Activity',
            'settings-profile': 'User Profile',
            'settings-localization': 'Localization',
            'settings-appearance': 'Appearance',
            'settings-data': 'Data Center',
            'label-name': 'Display Name',
            'label-password': 'New Password',
            'label-lang': 'System Language',
            'label-currency': 'Currency',
            'label-theme': 'Theme Mode',
            'label-glass': 'Glass Depth',
            'btn-update': 'Update Profile',
            'btn-export': 'Export Backup',
            'btn-import': 'Import Backup',
            'theme-dark': 'Dark Mode',
            'theme-light': 'Light Mode',
            'theme-system': 'System Default',
            'search-placeholder': 'Search SKU or Product...',
            'sku': 'SKU', 'product': 'Product', 'stock': 'Stock', 'price': 'Price', 'action': 'Action', 'date': 'Date', 'amount': 'Amount', 'desc': 'Description'
        },
        cn: {
            'nav-dashboard': '仪表盘',
            'nav-inventory': '库存管理',
            'nav-finance': '收支记录',
            'nav-settings': '系统设置',
            'total-profit': '总利润',
            'total-expense': '总支出',
            'low-stock': '低库存预警',
            'inventory-count': '产品种类',
            'recent-activity': '最近活动',
            'settings-profile': '个人资料',
            'settings-localization': '语言与货币',
            'settings-appearance': '界面外观',
            'settings-data': '数据中心',
            'label-name': '显示名称',
            'label-password': '修改密码',
            'label-lang': '系统语言',
            'label-currency': '货币单位',
            'label-theme': '主题模式',
            'label-glass': '毛玻璃深度',
            'btn-update': '更新资料',
            'btn-export': '导出备份',
            'btn-import': '导入数据',
            'theme-dark': '深色模式',
            'theme-light': '浅色模式',
            'theme-system': '跟随系统',
            'search-placeholder': '搜SKU或产品名...',
            'sku': 'SKU', 'product': '产品', 'stock': '库存', 'price': '单价', 'action': '操作', 'date': '日期', 'amount': '金额', 'desc': '描述'
        }
    };

    const pageState = { dashboard: 0, inventory: 0, finance: 0, settings: 0, search: 0, filtered: 0 };
    let currentUser = null;
    let filterType = 'profit';
    let searchQuery = '';
    const ITEMS_PER_PAGE = 10;

    // 2. Helper Functions
    function t(key) {
        return translations[state.settings.language][key] || key;
    }

    function formatCurrency(amount) {
        return `${state.settings.currency} ${parseFloat(amount || 0).toFixed(2)}`;
    }

    function updateI18nUI() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.innerText = t(key);
        });
        const si = document.getElementById('search-input');
        if (si) si.placeholder = t('search-placeholder');
    }

    function applyTheme(theme) {
        document.body.classList.remove('light-mode');
        if (theme === 'light' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches)) {
            document.body.classList.add('light-mode');
        }
    }

    function applyGlass(val) {
        document.documentElement.style.setProperty('--glass-opacity', val);
    }

    async function saveData() {
        if (!currentUser) return;
        try {
            await db.collection('users').doc(currentUser.uid).set({
                inventory: state.inventory,
                transactions: state.transactions,
                settings: state.settings
            });
        } catch (e) { console.error("Save error:", e); }
    }

    async function loadUserData() {
        if (!currentUser) return;
        try {
            const doc = await db.collection('users').doc(currentUser.uid).get();
            if (doc.exists) {
                const data = doc.data();
                state.inventory = data.inventory || [];
                state.transactions = data.transactions || [];
                if (data.settings) state.settings = { ...state.settings, ...data.settings };
            }
        } catch (e) { console.error("Load error:", e); }
    }

    // 3. Page Rendering Logic
    function renderPage(page) {
        const area = document.getElementById('content-area');
        if (!area) return;

        if (page === 'dashboard') {
            area.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card ocean-gradient">
                        <div class="stat-info"><h3 data-i18n="total-profit">${t('total-profit')}</h3><p class="value" id="stat-profit">...</p></div>
                        <div class="stat-icon" onclick="window.activeApp.showFiltered('profit')"><i data-lucide="wallet"></i></div>
                    </div>
                    <div class="stat-card sunset-gradient">
                        <div class="stat-info"><h3 data-i18n="total-expense">${t('total-expense')}</h3><p class="value" id="stat-expense">...</p></div>
                        <div class="stat-icon" onclick="window.activeApp.showFiltered('expense')"><i data-lucide="credit-card"></i></div>
                    </div>
                    <div class="stat-card berry-gradient">
                        <div class="stat-info"><h3 data-i18n="low-stock">${t('low-stock')}</h3><p class="value" id="stat-low">0</p></div>
                        <div class="stat-icon" onclick="window.activeApp.showFiltered('low-stock')"><i data-lucide="package"></i></div>
                    </div>
                    <div class="stat-card forest-gradient">
                        <div class="stat-info"><h3 data-i18n="inventory-count">${t('inventory-count')}</h3><p class="value" id="stat-count">0</p></div>
                        <div class="stat-icon"><i data-lucide="database"></i></div>
                    </div>
                </div>
                <div class="chart-section glass-card mb-2">
                    <h2 data-i18n="recent-activity">📊 ${t('recent-activity')}</h2>
                    <div class="chart-container"><canvas id="mainChart"></canvas></div>
                </div>
                <div class="glass-card">
                    <h2 data-i18n="recent-activity" class="mb-1">${t('recent-activity')}</h2>
                    <table class="data-table">
                        <thead><tr><th>${t('date')}</th><th>${t('desc')}</th><th>${t('amount')}</th></tr></thead>
                        <tbody id="dash-list"></tbody>
                    </table>
                    <div id="dash-pagination"></div>
                </div>
            `;
            updateDashboard();
        }
        else if (page === 'inventory') {
            area.innerHTML = `
                <div class="glass-card mb-2">
                    <h2 data-i18n="nav-inventory">${t('nav-inventory')}</h2>
                    <form id="add-item-form" class="automation-flex mt-2">
                        <input type="text" id="in-sku" placeholder="SKU" required class="flex-grow">
                        <input type="text" id="in-name" placeholder="Name" required class="flex-grow">
                        <input type="number" id="in-stock" placeholder="Stock" style="width:80px">
                        <input type="number" id="in-cost" placeholder="Cost" style="width:80px">
                        <input type="number" id="in-price" placeholder="Price" style="width:80px">
                        <button class="btn-primary">Add</button>
                    </form>
                </div>
                <div class="glass-card">
                    <table class="data-table">
                        <thead><tr><th>SKU</th><th>Name</th><th>Stock</th><th>Price</th><th>Action</th></tr></thead>
                        <tbody id="inv-list"></tbody>
                    </table>
                    <div id="inv-pagination"></div>
                </div>
            `;
            updateInventoryList();
        }
        else if (page === 'settings') {
            area.innerHTML = `
                <div class="settings-grid">
                    <!-- 1. Profile Section -->
                    <div class="settings-section">
                        <h3><i data-lucide="user"></i> ${t('settings-profile')}</h3>
                        <div class="settings-option">
                            <label>${t('label-name')}</label>
                            <input type="text" id="set-name" class="settings-input" value="${currentUser.displayName || ''}">
                        </div>
                        <div class="settings-option">
                            <label>${t('label-password')}</label>
                            <input type="password" id="set-pass" class="settings-input" placeholder="New Password">
                        </div>
                        <button class="btn-primary w-full" onclick="window.activeApp.updateProfile()">${t('btn-update')}</button>
                    </div>

                    <!-- 2. Localization Section -->
                    <div class="settings-section">
                        <h3><i data-lucide="globe"></i> ${t('settings-localization')}</h3>
                        <div class="settings-option">
                            <label>${t('label-lang')}</label>
                            <select id="set-lang" class="settings-select" onchange="window.activeApp.changeLang(this.value)">
                                <option value="en" ${state.settings.language === 'en' ? 'selected' : ''}>English</option>
                                <option value="cn" ${state.settings.language === 'cn' ? 'selected' : ''}>简体中文</option>
                            </select>
                        </div>
                        <div class="settings-option">
                            <label>${t('label-currency')}</label>
                            <select id="set-currency" class="settings-select" onchange="window.activeApp.changeCurrency(this.value)">
                                ${['MYR', 'PHP', 'USD', 'SGD', 'IDR', 'THB', 'EUR', 'GBP', 'JPY', 'KRW'].map(c =>
                `<option value="${c}" ${state.settings.currency === c ? 'selected' : ''}>${c}</option>`
            ).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- 3. Appearance Section -->
                    <div class="settings-section">
                        <h3><i data-lucide="palette"></i> ${t('settings-appearance')}</h3>
                        <div class="settings-option">
                            <label>${t('label-theme')}</label>
                            <div class="theme-selector">
                                <button class="theme-btn ${state.settings.theme === 'dark' ? 'active' : ''}" onclick="window.activeApp.changeTheme('dark')">Dark</button>
                                <button class="theme-btn ${state.settings.theme === 'light' ? 'active' : ''}" onclick="window.activeApp.changeTheme('light')">Light</button>
                                <button class="theme-btn ${state.settings.theme === 'system' ? 'active' : ''}" onclick="window.activeApp.changeTheme('system')">Auto</button>
                            </div>
                        </div>
                        <div class="settings-option">
                            <label>${t('label-glass')} (${(state.settings.glassOpacity * 100).toFixed(0)}%)</label>
                            <input type="range" min="0.1" max="1" step="0.1" value="${state.settings.glassOpacity}" 
                                oninput="window.activeApp.changeGlass(this.value)" class="w-full">
                        </div>
                    </div>

                    <!-- 4. Data Center -->
                    <div class="settings-section">
                        <h3><i data-lucide="database"></i> ${t('settings-data')}</h3>
                        <div class="data-stats mb-1">
                            <div class="stat-box"><span>${state.inventory.length}</span><small>SKU</small></div>
                            <div class="stat-box"><span>${state.transactions.length}</span><small>Log</small></div>
                        </div>
                        <button class="btn-primary mb-1 w-full" onclick="window.activeApp.exportData()">${t('btn-export')}</button>
                        <button class="btn-danger-outline" onclick="document.getElementById('import-input').click()">${t('btn-import')}</button>
                        <input type="file" id="import-input" style="display:none" onchange="window.activeApp.importData(this)">
                    </div>
                </div>
            `;
        }
        lucide.createIcons();
    }

    // 4. Update Functions
    function updateDashboard() {
        let p = 0;
        state.transactions.forEach(t => { if (t.type === 'profit') p += t.amount; });
        let e = 0;
        state.inventory.forEach(i => {
            const soldQty = state.transactions.filter(t => t.sku === i.sku && t.type === 'profit').reduce((s, t) => s + (t.qty || 0), 0);
            e += (parseFloat(i.cost || 0) * ((i.stock || 0) + soldQty));
        });

        const ep = document.getElementById('stat-profit'); if (ep) ep.innerText = formatCurrency(p);
        const ee = document.getElementById('stat-expense'); if (ee) ee.innerText = formatCurrency(e);
        const el = document.getElementById('stat-low'); if (el) el.innerText = state.inventory.filter(i => i.stock < 5).length;
        const ec = document.getElementById('stat-count'); if (ec) ec.innerText = state.inventory.length;

        const list = document.getElementById('dash-list');
        if (list) {
            const paginated = state.transactions.slice(0, 10);
            list.innerHTML = paginated.map(item => `
                <tr><td>${item.date}</td><td>${item.desc}</td><td style="color:${item.type === 'profit' ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(item.amount)}</td></tr>
            `).join('');
        }
        renderMainChart();
    }

    function renderMainChart() {
        const canvas = document.getElementById('mainChart'); if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const groups = {};
        state.transactions.forEach(t => {
            const key = t.date.split('/')[0] + '/' + t.date.split('/')[2];
            if (!groups[key]) groups[key] = { p: 0, e: 0 };
            if (t.type === 'profit') groups[key].p += t.amount;
            else if (t.type === 'stock-in') groups[key].e += t.amount;
        });
        const labels = Object.keys(groups).sort().slice(-6);
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Profit', data: labels.map(l => groups[l].p), backgroundColor: '#10b981' },
                    { label: 'Expense', data: labels.map(l => groups[l].e), backgroundColor: '#ef4444' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 5. Auth State & Nav
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('auth-screen').classList.add('hidden');
            await loadUserData();
            applyTheme(state.settings.theme);
            applyGlass(state.settings.glassOpacity);
            updateI18nUI();

            const name = user.displayName || user.email.split('@')[0];
            document.getElementById('display-name').innerText = name;
            document.getElementById('user-avatar').innerText = name.charAt(0).toUpperCase();

            renderPage('dashboard');
        } else {
            document.getElementById('auth-screen').classList.remove('hidden');
            lucide.createIcons();
        }
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            renderPage(item.getAttribute('data-page'));
        };
    });

    // 6. Global Actions
    window.activeApp = {
        changeLang: (v) => { state.settings.language = v; updateI18nUI(); saveData(); renderPage('settings'); },
        changeCurrency: (v) => { state.settings.currency = v; saveData(); renderPage('settings'); },
        changeTheme: (v) => { state.settings.theme = v; applyTheme(v); saveData(); renderPage('settings'); },
        changeGlass: (v) => { state.settings.glassOpacity = v; applyGlass(v); saveData(); renderPage('settings'); },
        updateProfile: async () => {
            const n = document.getElementById('set-name').value;
            const p = document.getElementById('set-pass').value;
            try {
                if (n) await currentUser.updateProfile({ displayName: n });
                if (p) await currentUser.updatePassword(p);
                alert("Success!"); saveData();
            } catch (e) { alert(e.message); }
        },
        exportData: () => {
            const blob = new Blob([JSON.stringify(state)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = "kirokuhub_data.json"; a.click();
        },
        importData: (input) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = JSON.parse(e.target.result);
                if (data.inventory) {
                    state.inventory = data.inventory;
                    state.transactions = data.transactions;
                    if (data.settings) state.settings = data.settings;
                    await saveData(); location.reload();
                }
            };
            reader.readAsText(input.files[0]);
        },
        logout: () => auth.signOut()
    };
});
