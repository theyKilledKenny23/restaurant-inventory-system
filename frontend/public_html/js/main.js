// Маппинг заголовков страниц
const pageTitles = {
    'dashboard': 'Дашборд',
    'inventory': 'Остатки на складе',
    'invoices': 'Накладные',
    'reports': 'Отчёты'
};

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const pageTitle = document.getElementById('page-title');

    // Обработка кликов по меню
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const page = link.getAttribute('data-page');
            pageTitle.textContent = pageTitles[page] || 'Страница';
            loadPage(page);
        });
    });

    // Загрузка страницы по умолчанию
    loadPage('dashboard');
});

async function loadPage(page) {
    const contentDiv = document.getElementById('app-content');
    contentDiv.innerHTML = '<div class="loading">Загрузка данных...</div>';

    try {
        if (page === 'dashboard') {
            await loadDashboard();
        } else if (page === 'inventory') {
            await loadInventory();
        } else if (page === 'invoices') {
            await loadInvoices();
        } else if (page === 'reports') {
            await loadReports();
        }
    } catch (error) {
        contentDiv.innerHTML = `<div class="error">Ошибка загрузки данных: ${error.message}. Убедитесь, что бэкенд запущен.</div>`;
    }
}

// ===== ДАШБОРД =====
async function loadDashboard() {
    const contentDiv = document.getElementById('app-content');
    const restaurants = await fetchAPI('/restaurants');

    let html = '<div class="card"><h2>Сеть ресторанов</h2><table><thead><tr><th>ID</th><th>Название</th><th>Адрес</th></tr></thead><tbody>';
    
    restaurants.forEach(rest => {
        html += `<tr>
                    <td>${rest.id}</td>
                    <td>${rest.name}</td>
                    <td>${rest.address}</td>
                 </tr>`;
    });

    html += '</tbody></table></div>';
    contentDiv.innerHTML = html;
}

// ===== ОСТАТКИ НА СКЛАДЕ =====
async function loadInventory() {
    const contentDiv = document.getElementById('app-content');
    const restaurants = await fetchAPI('/restaurants');

    // Создаём выпадающий список ресторанов
    let html = '<div class="card">';
    html += '<h2>Выберите ресторан</h2>';
    html += '<select id="restaurant-select" style="padding: 10px; font-size: 16px; margin-top: 10px; width: 100%;">';
    html += '<option value="">-- Выберите ресторан --</option>';
    
    restaurants.forEach(rest => {
        html += `<option value="${rest.id}">${rest.name}</option>`;
    });
    
    html += '</select></div>';
    html += '<div id="inventory-table"></div>';
    
    contentDiv.innerHTML = html;

    // Обработчик выбора ресторана
    document.getElementById('restaurant-select').addEventListener('change', async (e) => {
        const restaurantId = e.target.value;
        const tableDiv = document.getElementById('inventory-table');
        
        if (!restaurantId) {
            tableDiv.innerHTML = '';
            return;
        }

        tableDiv.innerHTML = '<div class="loading">Загрузка остатков...</div>';
        
        try {
            const inventory = await fetchAPI(`/inventory/${restaurantId}`);
            
            if (inventory.length === 0) {
                tableDiv.innerHTML = '<div class="card"><p>Склад пуст</p></div>';
                return;
            }

            let tableHtml = '<div class="card"><h2>Остатки на складе</h2><table><thead><tr>';
            tableHtml += '<th>Продукт</th><th>Категория</th><th>Количество</th><th>Ед. изм.</th><th>Срок годности</th></tr></thead><tbody>';

            const today = new Date();
            
            inventory.forEach(item => {
                const expiryDate = new Date(item.expiry_date);
                const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                
                // Подсветка строк с истекающим сроком годности
                let rowClass = '';
                if (daysUntilExpiry <= 3) {
                    rowClass = 'style="background-color: #fadbd8;"'; // Красный - критично
                } else if (daysUntilExpiry <= 7) {
                    rowClass = 'style="background-color: #fdebd0;"'; // Жёлтый - внимание
                }

                tableHtml += `<tr ${rowClass}>
                    <td>${item.product_name}</td>
                    <td>${item.category}</td>
                    <td>${item.quantity}</td>
                    <td>${item.unit}</td>
                    <td>${new Date(item.expiry_date).toLocaleDateString('ru-RU')}</td>
                </tr>`;
            });

            tableHtml += '</tbody></table></div>';
            tableDiv.innerHTML = tableHtml;
            
        } catch (error) {
            tableDiv.innerHTML = `<div class="error">Ошибка загрузки: ${error.message}</div>`;
        }
    });
}

// ===== НАКЛАДНЫЕ =====
async function loadInvoices() {
    const contentDiv = document.getElementById('app-content');
    
    // Загружаем данные параллельно
    const [invoices, restaurants, products] = await Promise.all([
        fetchAPI('/invoices'),
        fetchAPI('/restaurants'),
        fetchAPI('/products')
    ]);

    let html = '<div class="card"><h2>Список накладных</h2>';
    
    if (invoices.length === 0) {
        html += '<p>Накладных пока нет</p>';
    } else {
        html += '<table><thead><tr><th>ID</th><th>Ресторан</th><th>Тип</th><th>Дата</th></tr></thead><tbody>';
        invoices.forEach(inv => {
            const typeText = inv.invoice_type === 'incoming' ? 'Приход' : 'Расход';
            html += `<tr>
                <td>${inv.id}</td>
                <td>${inv.restaurant_name}</td>
                <td>${typeText}</td>
                <td>${inv.invoice_date}</td>
            </tr>`;
        });
        html += '</tbody></table>';
    }
    
    html += '</div>';

    // Форма добавления новой накладной
    html += '<div class="card"><h2>Добавить накладную</h2>';
    html += '<form id="invoice-form">';
    
    html += '<label>Ресторан:</label><br>';
    html += '<select name="restaurant_id" required style="padding: 8px; width: 100%; margin-bottom: 10px;">';
    restaurants.forEach(rest => {
        html += `<option value="${rest.id}">${rest.name}</option>`;
    });
    html += '</select><br>';

    html += '<label>Тип накладной:</label><br>';
    html += '<select name="invoice_type" required style="padding: 8px; width: 100%; margin-bottom: 10px;">';
    html += '<option value="incoming">Приход</option>';
    html += '<option value="outgoing">Расход</option>';
    html += '</select><br>';

    html += '<label>Дата:</label><br>';
    html += `<input type="date" name="invoice_date" value="${new Date().toISOString().split('T')[0]}" required style="padding: 8px; width: 100%; margin-bottom: 10px;"><br>`;

    html += '<h3>Позиции накладной</h3>';
    html += '<div id="invoice-items"></div>';
    html += '<button type="button" onclick="addInvoiceItem()" style="margin-top: 10px; padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">+ Добавить позицию</button><br><br>';

    html += '<button type="submit" style="padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">Создать накладную</button>';
    html += '</form></div>';

    contentDiv.innerHTML = html;

    // Добавляем первую позицию по умолчанию
    addInvoiceItem();

    // Обработчик отправки формы
    document.getElementById('invoice-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const items = [];
        
        document.querySelectorAll('.invoice-item').forEach(itemDiv => {
            const productId = itemDiv.querySelector('.product-select').value;
            const quantity = itemDiv.querySelector('.quantity-input').value;
            const expiryDate = itemDiv.querySelector('.expiry-input').value;
            
            if (productId && quantity) {
                items.push({
                    product_id: parseInt(productId),
                    quantity: parseFloat(quantity),
                    expiry_date: expiryDate || null
                });
            }
        });

        const invoiceData = {
            restaurant_id: parseInt(formData.get('restaurant_id')),
            invoice_type: formData.get('invoice_type'),
            invoice_date: formData.get('invoice_date'),
            items: items
        };

        try {
            const response = await fetch(`${API_BASE_URL}/invoices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceData)
            });

            if (response.ok) {
                alert('Накладная успешно создана! Склад обновлён.');
                loadInvoices(); // Перезагружаем страницу
            } else {
                const error = await response.json();
                alert(`Ошибка: ${error.error}`);
            }
        } catch (error) {
            alert(`Ошибка: ${error.message}`);
        }
    });
}

// Функция добавления позиции в накладную
function addInvoiceItem() {
    const itemsDiv = document.getElementById('invoice-items');
    const itemDiv = document.createElement('div');
    itemDiv.className = 'invoice-item';
    itemDiv.style.cssText = 'border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 4px;';

    // Получаем список продуктов из DOM (они уже загружены)
    const productOptions = Array.from(document.querySelectorAll('select[name="restaurant_id"] option'))
        .map(() => '') // Заглушка, ниже заменим на реальные продукты
        .join('');

    itemDiv.innerHTML = `
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 10px; align-items: end;">
            <div>
                <label>Продукт:</label><br>
                <select class="product-select" required style="padding: 8px; width: 100%;">
                    <option value="">-- Выберите продукт --</option>
                </select>
            </div>
            <div>
                <label>Количество:</label><br>
                <input type="number" class="quantity-input" step="0.01" min="0" required style="padding: 8px; width: 100%;">
            </div>
            <div>
                <label>Срок годности:</label><br>
                <input type="date" class="expiry-input" style="padding: 8px; width: 100%;">
            </div>
            <button type="button" onclick="this.parentElement.parentElement.remove()" style="padding: 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;"></button>
        </div>
    `;

    itemsDiv.appendChild(itemDiv);

    // Заполняем список продуктов
    fetchAPI('/products').then(products => {
        const select = itemDiv.querySelector('.product-select');
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (${product.category})`;
            select.appendChild(option);
        });
    });
}

// ===== ОТЧЁТЫ =====
async function loadReports() {
    const contentDiv = document.getElementById('app-content');
    
    let html = '<div class="card"><h2>Отчёт по остаткам и срокам годности</h2>';
    
    const restaurants = await fetchAPI('/restaurants');
    
    for (const rest of restaurants) {
        const inventory = await fetchAPI(`/inventory/${rest.id}`);
        
        html += `<h3 style="margin-top: 20px;">${rest.name}</h3>`;
        
        if (inventory.length === 0) {
            html += '<p>Склад пуст</p>';
            continue;
        }

        html += '<table><thead><tr><th>Продукт</th><th>Количество</th><th>Срок годности</th><th>Статус</th></tr></thead><tbody>';
        
        const today = new Date();
        
        inventory.forEach(item => {
            const expiryDate = new Date(item.expiry_date);
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            
            let status = '';
            let rowClass = '';
            
            if (daysUntilExpiry < 0) {
                status = '❌ Просрочено';
                rowClass = 'style="background-color: #fadbd8;"';
            } else if (daysUntilExpiry <= 3) {
                status = '️ Критично';
                rowClass = 'style="background-color: #fadbd8;"';
            } else if (daysUntilExpiry <= 7) {
                status = ' Внимание';
                rowClass = 'style="background-color: #fdebd0;"';
            } else {
                status = '✅ Норма';
            }

            html += `<tr ${rowClass}>
                <td>${item.product_name}</td>
                <td>${item.quantity} ${item.unit}</td>
                <td>${new Date(item.expiry_date).toLocaleDateString('ru-RU')}</td>
                <td>${status}</td>
            </tr>`;
        });

        html += '</tbody></table>';
    }

    html += '</div>';
    contentDiv.innerHTML = html;
}