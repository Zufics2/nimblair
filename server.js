const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const pool = require("./db");

const app = express();
const JWT_SECRET = "nimblair_secret_key_2025";

app.use(express.json());
app.use(express.static("public"));

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Требуется авторизация' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Неверный токен' });
        req.user = user;
        next();
    });
};

// register(доделать)
app.post("/api/register", async (req, res) => {
    try {
        const { email, password, full_name, phone } = req.body;

        // Проверка существования пользователя
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }

        // Хеширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);

        // Создание пользователя
        const result = await pool.query(
            'INSERT INTO users (email, password, full_name, phone) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name',
            [email, hashedPassword, full_name, phone]
        );

        const token = jwt.sign({ userId: result.rows[0].id, email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при регистрации' });
    }
});

// login
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Неверный email или пароль' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(400).json({ error: 'Неверный email или пароль' });
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при входе' });
    }
});

// ТУТ ВСЕ ТОВАРЫ ПОЛУЧИТЬ
app.get("/api/products", async (req, res) => {
    try {
        const { category } = req.query;
        let query = 'SELECT * FROM products WHERE stock > 0';
        const params = [];

        if (category) {
            query += ' AND category = $1';
            params.push(category);
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при загрузке товаров' });
    }
});

// товар по id
app.get("/api/products/:id", async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при загрузке товара' });
    }
});

// реализация корзины 

// функция добавления товаров в коризну
app.post("/api/cart", authenticateToken, async (req, res) => {
    try {
        const { product_id, quantity, size } = req.body;
        const userId = req.user.userId;

        const existing = await pool.query(
            'SELECT * FROM cart WHERE user_id = $1 AND product_id = $2 AND size = $3',
            [userId, product_id, size]
        );

        if (existing.rows.length > 0) {
            const result = await pool.query(
                'UPDATE cart SET quantity = quantity + $1 WHERE id = $2 RETURNING *',
                [quantity, existing.rows[0].id]
            );
            res.json(result.rows[0]);
        } else {
            const result = await pool.query(
                'INSERT INTO cart (user_id, product_id, quantity, size) VALUES ($1, $2, $3, $4) RETURNING *',
                [userId, product_id, quantity, size]
            );
            res.json(result.rows[0]);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при добавлении в корзину' });
    }
});

app.get("/api/cart", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await pool.query(
            `SELECT c.id, c.quantity, c.size, c.added_at,
                    p.id as product_id, p.name, p.price, p.image_url, p.brand
             FROM cart c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = $1
             ORDER BY c.added_at DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при загрузке корзины' });
    }
});

app.put("/api/cart/:id", authenticateToken, async (req, res) => {
    try {
        const { quantity } = req.body;
        const result = await pool.query(
            'UPDATE cart SET quantity = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
            [quantity, req.params.id, req.user.userId]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при обновлении корзины' });
    }
});

app.delete("/api/cart/:id", authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM cart WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при удалении из корзины' });
    }
});

app.delete("/api/cart", authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM cart WHERE user_id = $1', [req.user.userId]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при очистке корзины' });
    }
});

app.post("/api/orders", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { total_amount } = req.body;

        const result = await pool.query(
            'INSERT INTO orders (user_id, total_amount) VALUES ($1, $2) RETURNING *',
            [userId, total_amount]
        );

        await pool.query('DELETE FROM cart WHERE user_id = $1', [userId]);

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при создании заказа' });
    }
});

// здесь будет авторизация
app.get("/api/verify", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, email, full_name FROM users WHERE id = $1', [req.user.userId]);
        res.json({ user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка проверки' });
    }
});

app.listen(8000, () => {
    console.log("✓ Сервер работает на http://localhost:8000");
});