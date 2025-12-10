function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const loginBtn = document.getElementById('navLoginBtn');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    if (user) {
        loginBtn.textContent = user.full_name;
        loginBtn.href = '#';
        loginBtn.onclick = (e) => {
            e.preventDefault();
            if (confirm('Выйти из аккаунта?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
            }
        };
    }
}

async function loadCart() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/cart', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const cartItems = await response.json();
            displayCart(cartItems);
        } else {
            throw new Error('Ошибка загрузки корзины');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        displayEmptyCart();
    }
}

function displayCart(items) {
    const container = document.getElementById('cartContent');
    
    if (items.length === 0) {
        displayEmptyCart();
        return;
    }
    
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    container.innerHTML = `
        <div class="cart-items">
            ${items.map(item => `
                <div class="cart-item">
                    <img src="${item.image_url}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-info">
                        <h3>${item.name}</h3>
                        <div class="cart-item-brand">${item.brand}</div>
                        <div class="cart-item-size">Размер: ${item.size}</div>
                    </div>
                    <div class="cart-item-actions">
                        <div class="cart-item-price">${formatPrice(item.price * item.quantity)} ₸</div>
                        <div class="quantity-controls">
                            <button class="qty-btn" onclick="updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                            <span style="padding: 0 1rem;">${item.quantity}</span>
                            <button class="qty-btn" onclick="updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                        </div>
                        <button class="remove-btn" onclick="removeFromCart(${item.id})">Удалить</button>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="cart-summary">
            <div class="summary-row">
                <span>Товаров:</span>
                <span>${items.reduce((sum, item) => sum + item.quantity, 0)} шт.</span>
            </div>
            <div class="summary-row">
                <span>Доставка:</span>
                <span>Бесплатно</span>
            </div>
            <div class="summary-row summary-total">
                <span>Итого:</span>
                <span>${formatPrice(total)} ₸</span>
            </div>
            <button class="checkout-btn" onclick="checkout(${total})">Оформить заказ</button>
        </div>
    `;
}

function displayEmptyCart() {
    const container = document.getElementById('cartContent');
    container.innerHTML = `
        <div class="cart-empty">
            <h2>Корзина пуста</h2>
            <p style="margin-bottom: 2rem;">Добавьте товары из каталога</p>
            <a href="shop.html" class="checkout-btn" style="display: inline-block; text-decoration: none;">
                Перейти в каталог
            </a>
        </div>
    `;
}

async function updateQuantity(cartId, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(cartId);
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/api/cart/${cartId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ quantity: newQuantity })
        });
        
        if (response.ok) {
            loadCart();
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

async function removeFromCart(cartId) {
    if (!confirm('Удалить товар из корзины?')) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/api/cart/${cartId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            loadCart();
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

async function checkout(totalAmount) {
    if (!confirm(`Оформить заказ на сумму ${formatPrice(totalAmount)} ₸?`)) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ total_amount: totalAmount })
        });
        
        if (response.ok) {
            alert('Заказ успешно оформлен! Спасибо за покупку!');
            loadCart();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при оформлении заказа');
    }
}

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(price);
}

checkAuth();
loadCart();