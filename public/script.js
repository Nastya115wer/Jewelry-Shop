const API = '/api';
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('cart') || '[]');

// Загрузка товаров
async function loadProducts(category = '') {
  try {
    const url = category ? `${API}/products?category=${category}` : `${API}/products`;
    const res = await fetch(url);
    const json = await res.json();
    allProducts = json.data;
    renderProducts(allProducts);
  } catch (e) {
    console.error('Ошибка загрузки:', e);
  }
}

// Отрисовка
function renderProducts(products) {
  const container = document.getElementById('products');

  if (!products.length) {
    container.innerHTML = '<div class="empty">😔 Ничего не найдено</div>';
    return;
  }

  container.innerHTML = products.map(p => `
    <div class="product-card" onclick="openModal(${p.id})">
      <img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/400x250?text=Jewelry'">
      <div class="product-info">
        <h3>${p.name}</h3>
        <div class="material">${p.material} • ${p.gemstone}</div>
        <div class="price">${p.price.toLocaleString('ru-RU')} ₽</div>
        <div class="rating">⭐ ${p.rating} • В наличии: ${p.stock}</div>
      </div>
    </div>
  `).join('');
}

// Модальное окно
async function openModal(id) {
  const res = await fetch(`${API}/products/${id}`);
  const { data: p } = await res.json();

  document.getElementById('modalBody').innerHTML = `
    <div class="modal-product">
      <img src="${p.image}" alt="${p.name}">
      <h2>${p.name}</h2>
      <p>${p.description}</p>
      <p><strong>Материал:</strong> ${p.material}</p>
      <p><strong>Камень:</strong> ${p.gemstone}</p>
      <p><strong>Рейтинг:</strong> ⭐ ${p.rating}</p>
      <div class="modal-price">${p.price.toLocaleString('ru-RU')} ₽</div>
      <button onclick="addToCart(${p.id}, '${p.name.replace(/'/g, "\\'")}', ${p.price})">
        🛒 Добавить в корзину
      </button>
    </div>
  `;

  document.getElementById('modal').classList.add('active');
}

function addToCart(id, name, price) {
  cart.push({ id, name, price });
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  alert(`✅ "${name}" добавлен в корзину!`);
}

function updateCartCount() {
  document.getElementById('cartCount').textContent = cart.length;
}

// Закрытие модального окна
document.querySelector('.close').onclick = () => {
  document.getElementById('modal').classList.remove('active');
};

document.getElementById('modal').onclick = (e) => {
  if (e.target.id === 'modal') {
    e.target.classList.remove('active');
  }
};

// Фильтр по категориям
document.querySelectorAll('nav a').forEach(link => {
  link.onclick = (e) => {
    e.preventDefault();
    document.querySelectorAll('nav a').forEach(a => a.style.color = '');
    link.style.color = '#d4af37';
    loadProducts(link.dataset.cat);
  };
});

// Поиск
document.getElementById('search').oninput = (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    p.gemstone.toLowerCase().includes(q)
  );
  renderProducts(filtered);
};

// Сортировка
document.getElementById('sort').onchange = (e) => {
  let sorted = [...allProducts];
  switch (e.target.value) {
    case 'price-asc': sorted.sort((a, b) => a.price - b.price); break;
    case 'price-desc': sorted.sort((a, b) => b.price - a.price); break;
    case 'rating': sorted.sort((a, b) => b.rating - a.rating); break;
  }
  renderProducts(sorted);
};

// Инициализация
loadProducts();
updateCartCount();

// ==========================================
// 🤖 AI ЧАТ-ВИДЖЕТ
// ==========================================

const aiToggle = document.getElementById('aiToggle');
const aiWidget = document.getElementById('aiWidget');
const aiClose = document.getElementById('aiClose');
const aiForm = document.getElementById('aiForm');
const aiInput = document.getElementById('aiInput');
const aiMessages = document.getElementById('aiMessages');
const aiSend = document.getElementById('aiSend');

// История диалога для контекста
let chatHistory = [];

// Открытие/закрытие окна
aiToggle.onclick = () => aiWidget.classList.toggle('active');
aiClose.onclick = () => aiWidget.classList.remove('active');

// Отправка сообщения
aiForm.onsubmit = async (e) => {
  e.preventDefault();
  
  const message = aiInput.value.trim();
  if (!message) return;

  // 1. Показываем сообщение пользователя
  addMessage(message, 'user');
  aiInput.value = '';
  aiInput.disabled = true;
  aiSend.disabled = true;

  // 2. Показываем "печатает..."
  const typing = addTypingIndicator();

  try {
    // 3. Отправляем запрос на наш backend
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message,
        history: chatHistory.slice(-6) // последние 3 пары вопрос-ответ
      })
    });

    const data = await response.json();
    typing.remove();

    if (data.success) {
      addMessage(data.reply, 'bot');
      
      // Сохраняем в историю для контекста
      chatHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: data.reply }
      );
    } else {
      addMessage('Извините, произошла ошибка. Попробуйте позже.', 'bot');
    }
  } catch (error) {
    typing.remove();
    addMessage('Нет соединения с сервером. Проверьте интернет.', 'bot');
    console.error('AI Error:', error);
  } finally {
    aiInput.disabled = false;
    aiSend.disabled = false;
    aiInput.focus();
  }
};

// Добавление сообщения в чат
function addMessage(text, sender) {
  const div = document.createElement('div');
  div.className = `ai-message ai-${sender}`;
  div.textContent = text;
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
  return div;
}

// Индикатор "печатает..."
function addTypingIndicator() {
  const div = document.createElement('div');
  div.className = 'ai-typing';
  div.innerHTML = '<span>●</span><span>●</span><span>●</span>';
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
  return div;
}
