function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const loginBtn = document.getElementById('navLoginBtn');
    
    if (token && user) {
        loginBtn.textContent = user.full_name;
        loginBtn.href = '#';
        loginBtn.onclick = (e) => {
            e.preventDefault();
            if (confirm('Выйти из аккаунта?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                location.reload();
            }
        };
    }
}

async function loadProducts(category = 'all') {
    try {
        const url = category === 'all' 
            ? '/api/products' 
            : `/api/products?category=${category}`;
        
        const response = await fetch(url);
        const products = await response.json();
        
        displayProducts(products);
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
    }
}

function displayProducts(products) {
    const grid = document.getElementById('productsGrid');
    
    if (products.length === 0) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 3rem;">Товары не найдены</p>';
        return;
    }
    
    grid.innerHTML = products.map(product => {
        const sizes = product.sizes.split(',');
        return `
            <div class="product-card">
                <img src="${product.image_url}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <div class="product-brand">${product.brand}</div>
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-price">${formatPrice(product.price)} ₸</div>
                    <div class="product-actions">
                        <select class="size-select" id="size-${product.id}">
                            <option value="">Размер</option>
                            ${sizes.map(size => `<option value="${size.trim()}">${size.trim()}</option>`).join('')}
                        </select>
                        <button class="add-to-cart-btn" onclick="addToCart(${product.id})">
                            В корзину
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function addToCart(productId) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('Пожалуйста, войдите в аккаунт');
        window.location.href = 'login.html';
        return;
    }
    
    const sizeSelect = document.getElementById(`size-${productId}`);
    const size = sizeSelect.value;
    
    if (!size) {
        alert('Выберите размер');
        return;
    }
    
    try {
        const response = await fetch('/api/cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: 1,
                size: size
            })
        });
        
        if (response.ok) {
            alert('Товар добавлен в корзину!');
            sizeSelect.value = '';
        } else {
            const error = await response.json();
            alert(error.error || 'Ошибка при добавлении в корзину');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при добавлении в корзину');
    }
}

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(price);
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const category = btn.dataset.category;
        loadProducts(category);
    });
});

checkAuth();
loadProducts();