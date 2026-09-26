const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static('public'));

// База данных в памяти
let jewelry = require('./data/jewelry');
let orders = [];

// ==========================================
// 📌 API ENDPOINTS ДЛЯ POSTMAN
// ==========================================

// INFO - корневой эндпоинт API
app.get('/api', (req, res) => {
  res.json({
    name: 'Jewelry Shop API',
    version: '1.0.0',
    endpoints: {
      products: {
        'GET /api/products': 'Все украшения',
        'GET /api/products/:id': 'Одно украшение',
        'GET /api/products?category=rings': 'Фильтр по категории',
        'GET /api/products?minPrice=1000&maxPrice=100000': 'Фильтр по цене',
        'GET /api/products?search=кольцо': 'Поиск',
        'POST /api/products': 'Создать украшение',
        'PUT /api/products/:id': 'Обновить',
        'DELETE /api/products/:id': 'Удалить'
      },
      orders: {
        'GET /api/orders': 'Все заказы',
        'POST /api/orders': 'Создать заказ',
        'GET /api/orders/:id': 'Один заказ'
      },
      stats: {
        'GET /api/stats': 'Статистика магазина'
      }
    }
  });
});

// GET все украшения (с фильтрами)
app.get('/api/products', (req, res) => {
  let result = [...jewelry];
  const { category, minPrice, maxPrice, search, material } = req.query;

  if (category) {
    result = result.filter(p => p.category === category);
  }
  if (minPrice) {
    result = result.filter(p => p.price >= +minPrice);
  }
  if (maxPrice) {
    result = result.filter(p => p.price <= +maxPrice);
  }
  if (material) {
    result = result.filter(p =>
      p.material.toLowerCase().includes(material.toLowerCase())
    );
  }
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.gemstone.toLowerCase().includes(q)
    );
  }

  res.json({
    success: true,
    count: result.length,
    data: result
  });
});

// GET одно украшение
app.get('/api/products/:id', (req, res) => {
  const product = jewelry.find(p => p.id === +req.params.id);
  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Украшение не найдено'
    });
  }
  res.json({ success: true, data: product });
});

// POST создать украшение
app.post('/api/products', (req, res) => {
  const { name, category, material, gemstone, price, stock, description } = req.body;

  // Валидация
  if (!name || !category || !price) {
    return res.status(400).json({
      success: false,
      error: 'Поля name, category и price обязательны'
    });
  }

  const newProduct = {
    id: jewelry.length ? Math.max(...jewelry.map(p => p.id)) + 1 : 1,
    name,
    category,
    material: material || 'Не указан',
    gemstone: gemstone || 'Нет',
    price: +price,
    stock: stock || 0,
    image: req.body.image || 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400',
    description: description || '',
    rating: 0,
    createdAt: new Date().toISOString()
  };

  jewelry.push(newProduct);
  res.status(201).json({ success: true, data: newProduct });
});

// PUT обновить украшение
app.put('/api/products/:id', (req, res) => {
  const index = jewelry.findIndex(p => p.id === +req.params.id);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Украшение не найдено'
    });
  }

  jewelry[index] = { ...jewelry[index], ...req.body, id: jewelry[index].id };
  res.json({ success: true, data: jewelry[index] });
});

// PATCH частичное обновление
app.patch('/api/products/:id', (req, res) => {
  const product = jewelry.find(p => p.id === +req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Не найдено' });
  }
  Object.assign(product, req.body);
  res.json({ success: true, data: product });
});

// DELETE удалить
app.delete('/api/products/:id', (req, res) => {
  const index = jewelry.findIndex(p => p.id === +req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Не найдено' });
  }
  const deleted = jewelry.splice(index, 1)[0];
  res.json({ success: true, message: 'Удалено', data: deleted });
});

// ==========================================
// 📦 ЗАКАЗЫ
// ==========================================

// GET все заказы
app.get('/api/orders', (req, res) => {
  res.json({ success: true, count: orders.length, data: orders });
});

// GET один заказ
app.get('/api/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === +req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Заказ не найден' });
  }
  res.json({ success: true, data: order });
});

// POST создать заказ
app.post('/api/orders', (req, res) => {
  const { customerName, email, phone, items } = req.body;

  if (!customerName || !email || !items || !items.length) {
    return res.status(400).json({
      success: false,
      error: 'Поля customerName, email и items обязательны'
    });
  }

  // Считаем сумму
  let total = 0;
  const detailedItems = items.map(item => {
    const product = jewelry.find(p => p.id === +item.productId);
    if (!product) return null;
    total += product.price * (item.quantity || 1);
    return {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity || 1,
      subtotal: product.price * (item.quantity || 1)
    };
  }).filter(Boolean);

  const newOrder = {
    id: orders.length + 1,
    customerName,
    email,
    phone: phone || '',
    items: detailedItems,
    total,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  orders.push(newOrder);
  res.status(201).json({ success: true, data: newOrder });
});

// ==========================================
// 📊 СТАТИСТИКА
// ==========================================

app.get('/api/stats', (req, res) => {
  const totalValue = jewelry.reduce((sum, p) => sum + p.price * p.stock, 0);
  const categories = {};

  jewelry.forEach(p => {
    if (!categories[p.category]) {
      categories[p.category] = { count: 0, totalValue: 0 };
    }
    categories[p.category].count++;
    categories[p.category].totalValue += p.price * p.stock;
  });

  res.json({
    success: true,
    data: {
      totalProducts: jewelry.length,
      totalOrders: orders.length,
      totalInventoryValue: totalValue,
      averagePrice: Math.round(jewelry.reduce((s, p) => s + p.price, 0) / jewelry.length),
      categories,
      topRated: [...jewelry].sort((a, b) => b.rating - a.rating).slice(0, 3)
    }
  });
});

// Обработка 404
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint не найден' });
});

const { askAI } = require('./services/aiService');

// POST /api/ai/chat — чат с AI
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || message.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Сообщение обязательно и не должно превышать 2000 символов'
      });
    }
    
    const reply = await askAI(message);
    
    res.json({ success: true, reply });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/ai/describe — автогенерация описания товара (для менеджера)
app.post('/api/ai/describe', async (req, res) => {
  try {
    const { productName, material, gemstone } = req.body;
    
    const prompt = `Напиши привлекательное описание для ювелирного украшения.
      Название: ${productName}
      Материал: ${material}
      Камень: ${gemstone || 'нет'}
      
      Стиль: премиальный, эмоциональный, 2-3 предложения.`;
    
    const description = await askAI(prompt, 'Ты — опытный копирайтер ювелирного магазина.');
    
    res.json({ success: true, description });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Запуск
app.listen(PORT, () => {
  console.log(`\n💎 Jewelry Shop запущен!`);
  console.log(`🌐 Сайт:  http://localhost:${PORT}`);
  console.log(`📮 API:   http://localhost:${PORT}/api`);
  console.log(`📊 Stats: http://localhost:${PORT}/api/stats\n`);
});
