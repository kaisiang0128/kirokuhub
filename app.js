/**
 * KirokuHub Cloud Edition
 * Integrated with Firebase Auth and Firestore
 */

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyAAk2hfkIpIwFyg8BG9XAYx98OGCBn1yds",
    authDomain: "kirokuhub.firebaseapp.com",
    projectId: "kirokuhub",
    storageBucket: "kirokuhub.firebasestorage.app",
    messagingSenderId: "470629468332",
    appId: "1:470629468332:web:0a11ef8c0158ce32d1b709"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    // App State
    const state = {
        transactions: [],
        inventory: [],
        settings: {
            language: 'en',
            currency: 'MYR',
            theme: 'dark', // 'dark', 'light', 'system'
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
            'btn-export': 'Export Backup (JSON)',
            'btn-import': 'Import Data',
            'theme-dark': 'Dark',
            'theme-light': 'Light',
            'theme-system': 'System',
            'search-placeholder': 'Search SKU or Product Name...',
            'add-product': 'Add Product',
            'add-sale': 'Add Sale',
            'add-expense': 'Add Expense',
            'sku': 'SKU',
            'product': 'Product',
            'stock': 'Stock',
            'price': 'Price',
            'status': 'Status',
            'action': 'Action',
            'amount': 'Amount',
            'date': 'Date',
            'type': 'Type',
            'description': 'Description'
        },
        cn: {
            'nav-dashboard': '仪表盘',
            'nav-inventory': '库存管理',
            'nav-finance': '财务报表',
            'nav-settings': '系统设置',
            'total-profit': '总利润',
            'total-expense': '总支出',
            'low-stock': '低库存预警',
            'inventory-count': '库存种类',
            'recent-activity': '最近活动',
            'settings-profile': '个人资料',
            'settings-localization': '语言与货币',
            'settings-appearance': '界面外观',
            'settings-data': '数据中心',
            'label-name': '显示名称',
            'label-password': '新密码',
            'label-lang': '系统语言',
            'label-currency': '货币单位',
            'label-theme': '主题模式',
            'label-glass': '背景深度',
            'btn-update': '更新资料',
            'btn-export': '导出备份 (JSON)',
            'btn-import': '导入数据',
            'theme-dark': '深色',
            'theme-light': '浅色',
            'theme-system': '跟随系统',
            'search-placeholder': '搜索 SKU 或 产品名称...',
            'add-product': '添加产品',
            'add-sale': '记录销售',
            'add-expense': '记录支出',
            'sku': 'SKU',
            'product': '产品',
            'stock': '库存',
            'price': '价格',
            'status': '状态',
            'action': '操作',
            'amount': '金额',
            'date': '日期',
            'type': '类型',
            'description': '描述'
        }
    };

    function t(key) {
        return translations[state.settings.language][key] || key;
    }

    function updateI18n() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.innerText = t(key);
        });
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.placeholder = t('search-placeholder');
    }

    const pageState = {
        dashboard: 0,
        inventory: 0,
        finance: 0,
        search: 0,
        settings: 0,
        filtered: 0
    };

    let searchQuery = '';
    let filterType = 'profit';
    let currentUser = null;
    const ITEMS_PER_PAGE = 10;

    // --- UI Elements ---
    const authScreen = document.getElementById('auth-screen');
    const appContainer = document.querySelector('.app-container');
    const authForm = document.getElementById('auth-form');
    const authEmail = document.getElementById('auth-email');
    const authPass = document.getElementById('auth-password');
    const authBtn = document.getElementById('auth-btn');
    const authSubtitle = document.getElementById('auth-subtitle');
    const authSwitch = document.getElementById('switch-auth');
    const authError = document.getElementById('auth-error');
    const displayNameEl = document.getElementById('display-name');
    const userAvatarEl = document.getElementById('user-avatar');

    let isLoginMode = true;

    // --- AUTHENTICATION LOGIC ---
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            if (authScreen) authScreen.classList.add('hidden');
            if (appContainer) appContainer.classList.remove('hidden');

            const name = user.displayName || user.email.split('@')[0].toUpperCase();
            if (displayNameEl) displayNameEl.innerText = name;
            if (userAvatarEl) userAvatarEl.innerText = name.charAt(0);

            await loadUserData();
            applyTheme(state.settings.theme);
            applyGlass(state.settings.glassOpacity);
            updateI18n();
            renderPage('dashboard');
        } else {
            currentUser = null;
            if (appContainer) appContainer.classList.add('hidden');
            if (authScreen) authScreen.classList.remove('hidden');
            updateI18n();
            if (window.lucide) lucide.createIcons();
        }
    });

    if (authSwitch) {
        authSwitch.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            authBtn.innerText = isLoginMode ? 'Login' : 'Sign Up';
            authSubtitle.innerText = isLoginMode ? 'Welcome back! Please login to your account.' : 'Create a new account to sync your data.';
            authSwitch.innerHTML = isLoginMode ? "Don't have an account? <a href='#'>Sign Up</a>" : "Already have an account? <a href='#'>Login</a>";
            authError.classList.add('hidden');
        });
    }

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = authEmail.value;
            const pass = authPass.value;
            authError.classList.add('hidden');
            authBtn.disabled = true;
            authBtn.innerText = 'Processing...';

            try {
                if (isLoginMode) {
                    await auth.signInWithEmailAndPassword(email, pass);
                } else {
                    const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
                    await db.collection('users').doc(userCredential.user.uid).set({
                        inventory: [],
                        transactions: [],
                        settings: state.settings
                    });
                }
            } catch (error) {
                authError.innerText = error.message;
                authError.classList.remove('hidden');
                authBtn.innerText = isLoginMode ? 'Login' : 'Sign Up';
            }
            authBtn.disabled = false;
        });
    }

    const googleBtn = document.getElementById('google-btn');
    if (googleBtn) {
        googleBtn.onclick = async () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                await auth.signInWithPopup(provider);
            } catch (error) {
                authError.innerText = error.message;
                authError.classList.remove('hidden');
            }
        };
    }

    function applyTheme(theme) {
        state.settings.theme = theme;
        document.body.classList.remove('light-mode');
        if (theme === 'light') {
            document.body.classList.add('light-mode');
        } else if (theme === 'system') {
            if (window.matchMedia('(prefers-color-scheme: light)').matches) {
                document.body.classList.add('light-mode');
            }
        }
        saveData();
    }

    function applyGlass(opacity) {
        state.settings.glassOpacity = opacity;
        document.documentElement.style.setProperty('--glass-opacity', opacity);
        saveData();
    }

    async function loadUserData() {
        if (!currentUser) return;
        try {
            const doc = await db.collection('users').doc(currentUser.uid).get();
            if (doc.exists) {
                const data = doc.data();
                state.inventory = data.inventory || [];
                state.transactions = data.transactions || [];
                if (data.settings) {
                    state.settings = { ...state.settings, ...data.settings };
                }
            }
        } catch (error) {
            console.error("Error loading data:", error);
        }
    }

    async function saveData() {
        if (!currentUser) return;
        try {
            await db.collection('users').doc(currentUser.uid).set(state);
        } catch (error) {
            console.error("Error saving data:", error);
        }
    }

    function formatCurrency(amount) {
        return `${state.settings.currency} ${parseFloat(amount).toFixed(2)}`;
    }

    function updateStats() {
        let totalProfit = 0;
        state.transactions.forEach(t => { if (t.type === 'profit') totalProfit += t.amount; });

        let totalExpense = 0;
        state.inventory.forEach(i => {
            const soldQty = state.transactions
                .filter(t => t.sku === i.sku && t.type === 'profit')
                .reduce((sum, t) => sum + (t.qty || 0), 0);
            const totalPurchased = (i.stock || 0) + soldQty;
            totalExpense += (parseFloat(i.cost || 0) * totalPurchased);
        });

        const profitEl = document.querySelector('.ocean-gradient .value');
        const expenseEl = document.querySelector('.sunset-gradient .value');
        const lowStockEl = document.querySelector('.berry-gradient .value');
        const invCountEl = document.querySelector('.forest-gradient .value');

        if (profitEl) profitEl.innerText = formatCurrency(totalProfit);
        if (expenseEl) expenseEl.innerText = formatCurrency(totalExpense);
        if (lowStockEl) lowStockEl.innerText = state.inventory.filter(i => i.stock < 5).length;
        if (invCountEl) invCountEl.innerText = state.inventory.length;
    }

    function renderPaginationControls(containerId, totalItems, currentPage, targetPageKey) {
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        if (totalPages <= 1) return '';
        return `
            <div class="pagination">
                <span class="page-info">Page ${currentPage + 1} / ${totalPages}</span>
                <button class="pagination-btn" ${currentPage === 0 ? 'disabled' : ''} 
                    onclick="window.activeApp.changePage('${targetPageKey}', ${currentPage - 1})">Prev</button>
                <button class="pagination-btn" ${currentPage >= totalPages - 1 ? 'disabled' : ''} 
                    onclick="window.activeApp.changePage('${targetPageKey}', ${currentPage + 1})">Next</button>
            </div>
        `;
    }

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            window.activeApp.renderPage(page);
        });
    });

    function renderPage(page) {
        const contentArea = document.getElementById('content-area');
        if (!contentArea) return;

        if (page === 'dashboard') {
            contentArea.innerHTML = `
                <section class="page dashboard active">
                    <div class="stats-grid">
                        <div class="stat-card ocean-gradient">
                            <div class="stat-info">
                                <h3 data-i18n="total-profit">${t('total-profit')}</h3>
                                <p class="value">${formatCurrency(0)}</p>
                                <span class="trend up"><i data-lucide="trending-up"></i> +12.5%</span>
                            </div>
                            <div class="stat-icon clickable" onclick="window.activeApp.showFilteredList('profit')" title="View all">
                                <i data-lucide="wallet"></i>
                            </div>
                        </div>
                        <div class="stat-card sunset-gradient">
                            <div class="stat-info">
                                <h3 data-i18n="total-expense">${t('total-expense')}</h3>
                                <p class="value">${formatCurrency(0)}</p>
                                <span class="trend down"><i data-lucide="trending-down"></i> Based on Cost</span>
                            </div>
                            <div class="stat-icon clickable" onclick="window.activeApp.showFilteredList('expense')" title="View all">
                                <i data-lucide="credit-card"></i>
                            </div>
                        </div>
                        <div class="stat-card berry-gradient">
                            <div class="stat-info">
                                <h3 data-i18n="low-stock">${t('low-stock')}</h3>
                                <p class="value">0</p>
                                <span class="trend warn"><i data-lucide="alert-circle"></i> Requires attention</span>
                            </div>
                            <div class="stat-icon clickable" onclick="window.activeApp.showFilteredList('low-stock')" title="View all">
                                <i data-lucide="package"></i>
                            </div>
                        </div>
                        <div class="stat-card forest-gradient">
                            <div class="stat-info">
                                <h3 data-i18n="inventory-count">${t('inventory-count')}</h3>
                                <p class="value">0</p>
                                <span class="trend up"><i data-lucide="box"></i> Active items</span>
                            </div>
                            <div class="stat-icon">
                                <i data-lucide="database"></i>
                            </div>
                        </div>
                    </div>
                    <div class="chart-section glass-card">
                        <div class="chart-header">
                            <h2 data-i18n="recent-activity">📊 ${t('recent-activity')}</h2>
                        </div>
                        <div class="chart-container">
                            <canvas id="profitExpenseChart"></canvas>
                        </div>
                    </div>
                    <div class="recent-activity glass-card">
                        <div class="card-header"><h2 data-i18n="recent-activity">${t('recent-activity')}</h2></div>
                        <table class="data-table">
                            <thead><tr><th data-i18n="date">${t('date')}</th><th data-i18n="description">${t('description')}</th><th data-i18n="type">${t('type')}</th><th data-i18n="amount">${t('amount')}</th><th data-i18n="status">${t('status')}</th></tr></thead>
                            <tbody id="recent-transactions"></tbody>
                        </table>
                        <div id="dash-pagination"></div>
                    </div>
                </section>
            `;
            setTimeout(() => {
                renderTransactions();
                updateStats();
                renderDashboardChart();
                if (window.lucide) lucide.createIcons();
            }, 0);
        } else if (page === 'inventory') {
            const displayInventory = [...state.inventory].reverse();
            const startIdx = pageState.inventory * ITEMS_PER_PAGE;
            const paginatedInv = displayInventory.slice(startIdx, startIdx + ITEMS_PER_PAGE);

            contentArea.innerHTML = `
                <section class="page inventory active">
                    <div class="glass-card mb-2">
                        <h2 data-i18n="add-product">${t('add-product')}</h2>
                        <form id="new-item-form" class="automation-flex">
                            <input type="date" id="new-date" value="${new Date().toISOString().split('T')[0]}" class="flex-grow">
                            <input type="text" id="new-sku" placeholder="${t('sku')}" class="flex-grow">
                            <input type="text" id="new-name" placeholder="${t('product')}" class="flex-grow">
                            <input type="number" id="new-stock" placeholder="${t('stock')}" style="width:100px">
                            <input type="number" id="new-cost" placeholder="Cost" style="width:100px">
                            <input type="number" id="new-price" placeholder="Sell Price" style="width:100px">
                            <button type="submit" class="btn-primary" data-i18n="add-product">${t('add-product')}</button>
                        </form>
                    </div>
                    <div class="glass-card">
                        <table class="data-table">
                            <thead><tr><th data-i18n="date">${t('date')}</th><th data-i18n="sku">${t('sku')}</th><th data-i18n="product">${t('product')}</th><th data-i18n="stock">${t('stock')}</th><th>Cost</th><th data-i18n="price">${t('price')}</th><th>Profit</th><th data-i18n="action">${t('action')}</th></tr></thead>
                            <tbody>
                                ${displayInventory.length === 0 ? `<tr><td colspan="8" style="text-align:center">No inventory.</td></tr>` :
                    paginatedInv.map((item) => {
                        const originalIdx = state.inventory.indexOf(item);
                        const profit = (parseFloat(item.price || 0) - parseFloat(item.cost || 0)).toFixed(2);
                        return `<tr>
                                        <td>${item.date || '-'}</td>
                                        <td>${item.sku}</td>
                                        <td>${item.name}</td>
                                        <td>${item.stock} <span class="trend ${item.stock < 5 ? 'warning' : ''}">${item.stock < 5 ? 'Low' : ''}</span></td>
                                        <td>${formatCurrency(item.cost)}</td>
                                        <td>${formatCurrency(item.price)}</td>
                                        <td style="color:var(--success)">${formatCurrency(profit)}</td>
                                        <td><button class="btn-secondary" onclick="window.activeApp.deleteItem(${originalIdx})" data-i18n="action">${t('action')}</button></td>
                                    </tr>`;
                    }).join('')}
                            </tbody>
                        </table>
                        ${renderPaginationControls('inv-pagination', displayInventory.length, pageState.inventory, 'inventory')}
                    </div>
                </section>
            `;
            const itemForm = document.getElementById('new-item-form');
            if (itemForm) {
                itemForm.onsubmit = async (e) => {
                    e.preventDefault();
                    const rawDate = document.getElementById('new-date').value;
                    const dateParts = rawDate.split('-');
                    const formattedDate = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
                    const sku = document.getElementById('new-sku').value;
                    const name = document.getElementById('new-name').value;
                    const stock = parseInt(document.getElementById('new-stock').value) || 0;
                    const cost = parseFloat(document.getElementById('new-cost').value) || 0;
                    const price = parseFloat(document.getElementById('new-price').value) || 0;
                    if (sku && name) {
                        state.inventory.push({ sku, name, stock, cost, price, date: formattedDate });
                        state.transactions.unshift({
                            id: Date.now(),
                            date: formattedDate,
                            sku,
                            desc: `Restock: ${sku} - ${name}`,
                            qty: stock,
                            type: 'stock-in',
                            amount: (cost * stock),
                            category: 'Inventory'
                        });
                        await saveData();
                        renderPage('inventory');
                    }
                };
            }
            if (window.lucide) lucide.createIcons();
        } else if (page === 'finance') {
            const allSales = state.transactions.map((t, i) => ({ ...t, originalIdx: i })).filter(t => t.type === 'profit');
            const startIdx = pageState.finance * ITEMS_PER_PAGE;
            const paginatedSales = allSales.slice(startIdx, startIdx + ITEMS_PER_PAGE);

            contentArea.innerHTML = `
                <section class="page active">
                    <div class="glass-card mb-2">
                        <h2 data-i18n="add-sale">${t('add-sale')}</h2>
                        <form id="sales-form" class="automation-flex">
                            <input type="date" id="s-date" value="${new Date().toISOString().split('T')[0]}">
                            <select id="s-sku" class="flex-grow">
                                <option value="">Select SKU</option>
                                ${state.inventory.map(i => `<option value="${i.sku}">${i.sku}</option>`).join('')}
                            </select>
                            <input type="number" id="s-qty" placeholder="Qty" style="width:90px">
                            <button type="submit" class="btn-primary" data-i18n="add-sale">${t('add-sale')}</button>
                        </form>
                    </div>
                    <div class="glass-card">
                        <table class="data-table">
                            <thead><tr><th data-i18n="date">${t('date')}</th><th data-i18n="description">${t('description')}</th><th data-i18n="amount">${t('amount')}</th><th data-i18n="action">${t('action')}</th></tr></thead>
                            <tbody>
                                ${allSales.length === 0 ? '<tr><td colspan="4" style="text-align:center">No sales.</td></tr>' :
                    paginatedSales.map(t_item => `<tr>
                                    <td>${t_item.date}</td><td>${t_item.desc}</td>
                                    <td style="color:var(--success)">+ ${formatCurrency(t_item.amount)}</td>
                                    <td><button class="btn-secondary" onclick="window.activeApp.deleteTransaction(${t_item.originalIdx})">${t('action')}</button></td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                        ${renderPaginationControls('fin-pagination', allSales.length, pageState.finance, 'finance')}
                    </div>
                </section>
            `;
            const salesForm = document.getElementById('sales-form');
            if (salesForm) {
                salesForm.onsubmit = async (e) => {
                    e.preventDefault();
                    const rawDate = document.getElementById('s-date').value;
                    const dateParts = rawDate.split('-');
                    const formattedDate = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
                    const sku = document.getElementById('s-sku').value;
                    const qty = parseInt(document.getElementById('s-qty').value);
                    const item = state.inventory.find(i => i.sku === sku);
                    if (item && qty > 0 && item.stock >= qty) {
                        item.stock -= qty;
                        state.transactions.unshift({
                            id: Date.now(),
                            date: formattedDate,
                            sku,
                            desc: `${sku} - ${item.name}`,
                            qty,
                            type: 'profit',
                            amount: (parseFloat(item.price) - parseFloat(item.cost)) * qty,
                            category: 'Sale'
                        });
                        await saveData();
                        renderPage('finance');
                    } else { alert("Error: Check stock and selection."); }
                };
            }
            if (window.lucide) lucide.createIcons();
        } else if (page === 'settings') {
            renderSettings();
        } else if (page === 'filtered') {
            let filteredResults = [];
            let pageTitle = '';
            if (filterType === 'profit') {
                filteredResults = state.transactions.map((t, i) => ({ ...t, originalIdx: i })).filter(t => t.type === 'profit');
                pageTitle = t('total-profit');
            } else if (filterType === 'expense') {
                filteredResults = state.transactions.map((t, i) => ({ ...t, originalIdx: i })).filter(t => t.type === 'stock-in');
                pageTitle = t('total-expense');
            } else if (filterType === 'low-stock') {
                const lowStockList = state.inventory.filter(i => i.stock < 5);
                contentArea.innerHTML = `
                    <section class="page active">
                        <div class="glass-card mb-2"><h2>${t('low-stock')}</h2></div>
                        <div class="glass-card">
                            <table class="data-table">
                                <thead><tr><th>SKU</th><th>Name</th><th>Stock</th></tr></thead>
                                <tbody>
                                    ${lowStockList.map(i => `<tr><td>${i.sku}</td><td>${i.name}</td><td style="color:var(--danger)">${i.stock}</td></tr>`).join('')}
                                </tbody>
                            </table>
                            <button class="btn-secondary mt-2" onclick="window.activeApp.renderPage('dashboard')">Back</button>
                        </div>
                    </section>
                `;
                if (window.lucide) lucide.createIcons();
                return;
            }

            const totalAmount = filteredResults.reduce((sum, t) => sum + t.amount, 0);
            const startIdx = pageState.filtered * ITEMS_PER_PAGE;
            const paginatedResults = filteredResults.slice(startIdx, startIdx + ITEMS_PER_PAGE);

            contentArea.innerHTML = `
                <section class="page active">
                    <div class="glass-card mb-2">
                        <div class="filtered-header">
                            <div>
                                <h2>${pageTitle}</h2>
                                <p class="filtered-summary">Total: ${formatCurrency(totalAmount)}</p>
                            </div>
                            <button class="btn-secondary" onclick="window.activeApp.renderPage('dashboard')">Back</button>
                        </div>
                    </div>
                    <div class="glass-card">
                        <table class="data-table">
                            <thead><tr><th>${t('date')}</th><th>${t('description')}</th><th>${t('amount')}</th><th>${t('action')}</th></tr></thead>
                            <tbody>
                                ${paginatedResults.map(t_item => `<tr>
                                    <td>${t_item.date}</td><td>${t_item.desc}</td>
                                    <td style="color:${t_item.type === 'profit' ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(t_item.amount)}</td>
                                    <td><button class="btn-secondary" onclick="window.activeApp.deleteTransaction(${t_item.originalIdx})">Remove</button></td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                        ${renderPaginationControls('f-pagination', filteredResults.length, pageState.filtered, 'filtered')}
                    </div>
                </section>
            `;
            if (window.lucide) lucide.createIcons();
        } else if (page === 'search') {
            const query = searchQuery.toLowerCase();
            const results = state.transactions.map((t, i) => ({ ...t, originalIdx: i })).filter(t =>
                t.desc.toLowerCase().includes(query) || (t.sku && t.sku.toLowerCase().includes(query))
            );
            const startIdx = pageState.search * ITEMS_PER_PAGE;
            const paginated = results.slice(startIdx, startIdx + ITEMS_PER_PAGE);

            contentArea.innerHTML = `
                <section class="page active">
                    <div class="glass-card mb-2">
                        <h2 data-i18n="nav-dashboard">Search Results</h2>
                        <p>${results.length} records found for "${searchQuery}"</p>
                    </div>
                    <div class="glass-card">
                        <table class="data-table">
                            <thead><tr><th>${t('date')}</th><th>${t('description')}</th><th>${t('amount')}</th><th>${t('action')}</th></tr></thead>
                            <tbody>
                                ${paginated.map(t_item => `<tr>
                                    <td>${t_item.date}</td><td>${t_item.desc}</td>
                                    <td style="color:${t_item.type === 'profit' ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(t_item.amount)}</td>
                                    <td><button class="btn-secondary" onclick="window.activeApp.deleteTransaction(${t_item.originalIdx})">Remove</button></td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                        ${renderPaginationControls('s-pagination', results.length, pageState.search, 'search')}
                    </div>
                    <button class="btn-secondary mt-2" onclick="window.activeApp.renderPage('dashboard')">Back</button>
                </section>
            `;
            if (window.lucide) lucide.createIcons();
        }
    }

    function renderSettings() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <section class="page settings active">
                <div class="settings-grid">
                    <div class="settings-section">
                        <h3 data-i18n="settings-profile"><i data-lucide="user"></i> ${t('settings-profile')}</h3>
                        <div class="settings-option">
                            <label data-i18n="label-name">${t('label-name')}</label>
                            <input type="text" id="set-name" class="settings-input" value="${currentUser.displayName || currentUser.email.split('@')[0]}">
                        </div>
                        <div class="settings-option">
                            <label data-i18n="label-password">${t('label-password')}</label>
                            <input type="password" id="set-pass" class="settings-input" placeholder="••••••••">
                        </div>
                        <button class="btn-primary" onclick="window.activeApp.updateProfile()" data-i18n="btn-update" style="width:100%">${t('btn-update')}</button>
                    </div>
                    <div class="settings-section">
                        <h3 data-i18n="settings-localization"><i data-lucide="globe"></i> ${t('settings-localization')}</h3>
                        <div class="settings-option">
                            <label data-i18n="label-lang">${t('label-lang')}</label>
                            <select id="set-lang" class="settings-select" onchange="window.activeApp.changeLang(this.value)">
                                <option value="en" ${state.settings.language === 'en' ? 'selected' : ''}>English</option>
                                <option value="cn" ${state.settings.language === 'cn' ? 'selected' : ''}>简体中文</option>
                            </select>
                        </div>
                        <div class="settings-option">
                            <label data-i18n="label-currency">${t('label-currency')}</label>
                            <select id="set-currency" class="settings-select" onchange="window.activeApp.changeCurrency(this.value)">
                                ${['MYR', 'PHP', 'USD', 'SGD', 'IDR', 'THB', 'EUR', 'GBP', 'JPY', 'KRW'].map(c =>
            `<option value="${c}" ${state.settings.currency === c ? 'selected' : ''}>${c}</option>`
        ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="settings-section">
                        <h3 data-i18n="settings-appearance"><i data-lucide="palette"></i> ${t('settings-appearance')}</h3>
                        <div class="settings-option">
                            <label data-i18n="label-theme">${t('label-theme')}</label>
                            <div class="theme-selector">
                                <button class="theme-btn ${state.settings.theme === 'dark' ? 'active' : ''}" onclick="window.activeApp.changeTheme('dark')">
                                    <i data-lucide="moon"></i> <span data-i18n="theme-dark">${t('theme-dark')}</span>
                                </button>
                                <button class="theme-btn ${state.settings.theme === 'light' ? 'active' : ''}" onclick="window.activeApp.changeTheme('light')">
                                    <i data-lucide="sun"></i> <span data-i18n="theme-light">${t('theme-light')}</span>
                                </button>
                                <button class="theme-btn ${state.settings.theme === 'system' ? 'active' : ''}" onclick="window.activeApp.changeTheme('system')">
                                    <i data-lucide="monitor"></i> <span data-i18n="theme-system">${t('theme-system')}</span>
                                </button>
                            </div>
                        </div>
                        <div class="settings-option">
                            <div class="setting-row">
                                <label data-i18n="label-glass">${t('label-glass')}</label>
                                <span>${(state.settings.glassOpacity * 100).toFixed(0)}%</span>
                            </div>
                            <input type="range" class="settings-input" min="0.1" max="1" step="0.1" value="${state.settings.glassOpacity}" 
                                oninput="window.activeApp.changeGlass(this.value)">
                            <div class="glass-preview">Preview Box / 预览框</div>
                        </div>
                    </div>
                    <div class="settings-section">
                        <h3 data-i18n="settings-data"><i data-lucide="database"></i> ${t('settings-data')}</h3>
                        <div class="data-stats">
                            <div class="stat-box"><span class="val">${state.inventory.length}</span><span class="lab" data-i18n="sku">Products</span></div>
                            <div class="stat-box"><span class="val">${state.transactions.length}</span><span class="lab" data-i18n="action">Records</span></div>
                        </div>
                        <button class="btn-primary mb-1" onclick="window.activeApp.exportData()" data-i18n="btn-export" style="width:100%">Export (JSON)</button>
                        <button class="btn-danger-outline" onclick="document.getElementById('import-input').click()" data-i18n="btn-import">Import Backup</button>
                        <input type="file" id="import-input" style="display:none" onchange="window.activeApp.importData(this)">
                    </div>
                </div>
            </section>
        `;
        if (window.lucide) lucide.createIcons();
    }

    function renderTransactions() {
        const tableBody = document.getElementById('recent-transactions');
        if (!tableBody) return;
        const startIdx = pageState.dashboard * ITEMS_PER_PAGE;
        const paginated = state.transactions.slice(startIdx, startIdx + ITEMS_PER_PAGE);
        tableBody.innerHTML = paginated.map(t_item => `
            <tr>
                <td>${t_item.date}</td><td>${t_item.desc}</td><td>${t_item.category}</td>
                <td style="color:${t_item.type === 'profit' ? 'var(--success)' : 'var(--danger)'}">${t_item.type === 'profit' ? '+' : '-'} ${formatCurrency(t_item.amount)}</td>
                <td><span class="status-badge ${t_item.type}">${t_item.type === 'profit' ? 'Profit' : 'Expense'}</span></td>
            </tr>
        `).join('');
        const dashPagination = document.getElementById('dash-pagination');
        if (dashPagination) dashPagination.innerHTML = renderPaginationControls('dash-pagination', state.transactions.length, pageState.dashboard, 'dashboard');
    }

    let dashboardChartInstance = null;
    function renderDashboardChart() {
        const canvas = document.getElementById('profitExpenseChart');
        if (!canvas) return;
        if (dashboardChartInstance) dashboardChartInstance.destroy();

        const monthlyData = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        state.transactions.forEach(t_item => {
            if (!t_item.date) return;
            const parts = t_item.date.split('/');
            const month = parseInt(parts[0]) - 1;
            const year = parts[2];
            const key = `${monthNames[month]} ${year}`;
            if (!monthlyData[key]) monthlyData[key] = { profit: 0, expense: 0, order: new Date(year, month) };
            if (t_item.type === 'profit') monthlyData[key].profit += t_item.amount;
            else if (t_item.type === 'stock-in') monthlyData[key].expense += t_item.amount;
        });

        const sortedKeys = Object.keys(monthlyData).sort((a, b) => monthlyData[a].order - monthlyData[b].order).slice(-6);
        const labels = sortedKeys.length ? sortedKeys : ['No Data'];
        const profitData = sortedKeys.length ? sortedKeys.map(k => monthlyData[k].profit) : [0];
        const expenseData = sortedKeys.length ? sortedKeys.map(k => monthlyData[k].expense) : [0];

        const ctx = canvas.getContext('2d');
        const pG = ctx.createLinearGradient(0, 0, 0, 300); pG.addColorStop(0, 'rgba(16, 185, 129, 0.9)'); pG.addColorStop(1, 'rgba(16, 185, 129, 0.1)');
        const eG = ctx.createLinearGradient(0, 0, 0, 300); eG.addColorStop(0, 'rgba(239, 68, 68, 0.9)'); eG.addColorStop(1, 'rgba(239, 68, 68, 0.1)');

        dashboardChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels, datasets: [
                    { label: `${t('total-profit')} (${state.settings.currency})`, data: profitData, backgroundColor: pG, borderRadius: 8 },
                    { label: `${t('total-expense')} (${state.settings.currency})`, data: expenseData, backgroundColor: eG, borderRadius: 8 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: state.settings.theme === 'light' ? '#64748b' : '#fff' } } },
                scales: {
                    x: { ticks: { color: state.settings.theme === 'light' ? '#64748b' : '#94a3b8' } },
                    y: { ticks: { color: state.settings.theme === 'light' ? '#64748b' : '#94a3b8' } }
                }
            }
        });
    }

    const searchForm = document.getElementById('global-search');
    if (searchForm) {
        searchForm.onsubmit = (e) => {
            e.preventDefault();
            searchQuery = document.getElementById('search-input').value;
            if (searchQuery) { pageState.search = 0; renderPage('search'); }
        };
    }

    window.activeApp = {
        renderPage: (page) => {
            if (pageState[page] !== undefined) pageState[page] = 0;
            renderPage(page);
            document.querySelectorAll('.nav-item').forEach(i => {
                i.classList.remove('active');
                if (i.getAttribute('data-page') === page) i.classList.add('active');
            });
        },
        changePage: (key, idx) => { pageState[key] = idx; renderPage(key); },
        deleteItem: async (idx) => {
            if (confirm("Delete this product?")) {
                const sku = state.inventory[idx].sku;
                state.inventory.splice(idx, 1);
                state.transactions = state.transactions.filter(t_item => t_item.sku !== sku);
                await saveData();
                renderPage('inventory');
            }
        },
        deleteTransaction: async (idx) => {
            const t_item = state.transactions[idx];
            if (t_item) {
                const item = state.inventory.find(i => i.sku === t_item.sku);
                if (item) {
                    if (t_item.type === 'profit') item.stock += (t_item.qty || 0);
                    else if (t_item.type === 'stock-in') item.stock -= (t_item.qty || 0);
                }
                state.transactions.splice(idx, 1);
                await saveData();
                location.reload();
            }
        },
        showFilteredList: (type) => { filterType = type; pageState.filtered = 0; renderPage('filtered'); },
        exportData: () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
            const dl = document.createElement('a');
            dl.setAttribute("href", dataStr);
            dl.setAttribute("download", `kirokuhub_backup_${new Date().toISOString().split('T')[0]}.json`);
            dl.click();
        },
        importData: (input) => {
            const file = input.files[0];
            if (!file) return;
            const r = new FileReader();
            r.onload = async (e) => {
                try {
                    const im = JSON.parse(e.target.result);
                    if (im.transactions && im.inventory) {
                        state.transactions = im.transactions;
                        state.inventory = im.inventory;
                        if (im.settings) state.settings = im.settings;
                        await saveData();
                        alert('Data imported!');
                        location.reload();
                    }
                } catch (err) { alert('Failed to parse.'); }
            };
            r.readAsText(file);
        },
        changeLang: (lang) => { state.settings.language = lang; updateI18n(); saveData(); renderSettings(); },
        changeCurrency: (curr) => { state.settings.currency = curr; saveData(); renderSettings(); updateStats(); },
        changeTheme: (theme) => { applyTheme(theme); renderSettings(); },
        changeGlass: (val) => { applyGlass(val); renderSettings(); },
        updateProfile: async () => {
            const n = document.getElementById('set-name').value;
            const p = document.getElementById('set-pass').value;
            try {
                if (n !== currentUser.displayName) {
                    await currentUser.updateProfile({ displayName: n });
                    if (displayNameEl) displayNameEl.innerText = n.toUpperCase();
                }
                if (p) await currentUser.updatePassword(p);
                alert('Success!');
            } catch (err) { alert(err.message); }
        },
        logout: () => { auth.signOut(); }
    };
});
