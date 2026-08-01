// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWUG4QQie6W4UvYQzYvxjPOluT3pqgg-A",
  authDomain: "oneday-95562.firebaseapp.com",
  projectId: "oneday-95562",
  storageBucket: "oneday-95562.firebasestorage.app",
  messagingSenderId: "876387088137",
  appId: "1:876387088137:web:29fdd5835fb85207c885d8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM elements
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authBlock = document.getElementById('authBlock');
const taskSection = document.getElementById('taskSection');
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const taskCounter = document.getElementById('taskCounter');
const themeToggle = document.getElementById('themeToggle');
const toast = document.getElementById('toast');

let currentUser = null;
let allTasks = [];
let currentFilter = 'all';
let unsubscribeTasks = null;
let editingTaskId = null;

// --- THEME ---
// Check saved theme
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
  themeToggle.textContent = '☀️';
}

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  themeToggle.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// --- TOAST NOTIFICATION ---
let toastTimeout = null;

function showToast(message, type = 'info') {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toast.classList.remove('show');
  }

  toast.textContent = message;
  toast.className = 'toast ' + type;

  // Trigger reflow
  void toast.offsetWidth;
  toast.classList.add('show');

  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
    toastTimeout = null;
  }, 3000);
}

// --- AUTH ---
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

registerBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showToast('❌ Введите email и пароль', 'error');
    return;
  }

  if (!validateEmail(email)) {
    showToast('❌ Введите корректный email', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('❌ Пароль должен быть минимум 6 символов', 'error');
    return;
  }

  try {
    await auth.createUserWithEmailAndPassword(email, password);
    showToast('✅ Регистрация успешна!', 'success');
  } catch (err) {
    handleAuthError(err);
  }
});

loginBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showToast('❌ Введите email и пароль', 'error');
    return;
  }

  if (!validateEmail(email)) {
    showToast('❌ Введите корректный email', 'error');
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
    showToast('✅ Добро пожаловать!', 'success');
  } catch (err) {
    handleAuthError(err);
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await auth.signOut();
    showToast('👋 До свидания!', 'info');
  } catch (err) {
    showToast('❌ Ошибка выхода: ' + err.message, 'error');
  }
});

function handleAuthError(err) {
  let message = '❌ Ошибка: ' + err.message;
  if (err.code === 'auth/user-not-found') {
    message = '❌ Пользователь не найден';
  } else if (err.code === 'auth/wrong-password') {
    message = '❌ Неверный пароль';
  } else if (err.code === 'auth/email-already-in-use') {
    message = '❌ Этот email уже используется';
  } else if (err.code === 'auth/invalid-email') {
    message = '❌ Неверный формат email';
  } else if (err.code === 'auth/too-many-requests') {
    message = '❌ Слишком много попыток. Попробуйте позже';
  }
  showToast(message, 'error');
}

// --- TASKS ---
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    authBlock.classList.add('hidden');
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    logoutBtn.classList.remove('hidden');
    taskSection.style.display = 'block';

    subscribeToTasks();
  } else {
    currentUser = null;
    authBlock.classList.remove('hidden');
    loginBtn.style.display = 'block';
    registerBtn.style.display = 'block';
    logoutBtn.classList.add('hidden');
    taskSection.style.display = 'none';
    taskList.innerHTML = '';
    allTasks = [];
    updateCounter();

    if (unsubscribeTasks) {
      unsubscribeTasks();
      unsubscribeTasks = null;
    }
  }
});

function subscribeToTasks() {
  if (!currentUser) return;

  if (unsubscribeTasks) {
    unsubscribeTasks();
  }

  unsubscribeTasks = db.collection('users')
    .doc(currentUser.uid)
    .collection('tasks')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      allTasks = [];
      snapshot.forEach(doc => {
        allTasks.push({
          id: doc.id,
          ...doc.data()
        });
      });
      renderTasks();
      updateCounter();
    }, error => {
      console.error('Firestore error:', error);
      showToast('❌ Ошибка загрузки задач', 'error');
    });
}

// --- FILTERS ---
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTasks();
  });
});

function getFilteredTasks() {
  if (currentFilter === 'active') {
    return allTasks.filter(t => !t.done);
  } else if (currentFilter === 'completed') {
    return allTasks.filter(t => t.done);
  }
  return allTasks;
}

function updateCounter() {
  const active = allTasks.filter(t => !t.done).length;
  taskCounter.textContent = `📊 Осталось: ${active}`;
}

// --- RENDER ---
function renderTasks() {
  const filtered = getFilteredTasks();

  if (filtered.length === 0) {
    taskList.innerHTML = `
      <li class="empty-message">
        <span>${allTasks.length === 0 ? '🎯 Нет задач. Добавьте первую!' : '✨ Нет задач в этом фильтре'}</span>
      </li>
    `;
    return;
  }

  taskList.innerHTML = filtered.map(task => {
    const isEditing = editingTaskId === task.id;
    return `
      <li class="${task.done ? 'completed' : ''}" data-id="${task.id}">
        <span class="task-text ${isEditing ? 'editing' : ''}" contenteditable="${isEditing}" data-id="${task.id}">${escapeHtml(task.text)}</span>
        <div class="task-actions">
          ${!isEditing ? `<button class="edit-btn" data-action="edit" title="Редактировать">✏️</button>` : ''}
          <button class="done-btn" data-action="toggle" title="Переключить статус">${task.done ? '↩️' : '✅'}</button>
          <button class="delete-btn" data-action="delete" title="Удалить">🗑️</button>
        </div>
      </li>
    `;
  }).join('');

  // Event listeners
  document.querySelectorAll('[data-action="toggle"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      const id = li.dataset.id;
      toggleTask(id);
    });
  });

  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      const id = li.dataset.id;
      deleteTask(id);
    });
  });

  document.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      const id = li.dataset.id;
      startEditing(id);
    });
  });

  // Double-click to edit
  document.querySelectorAll('.task-text:not(.editing)').forEach(el => {
    el.addEventListener('dblclick', (e) => {
      const li = e.target.closest('li');
      const id = li.dataset.id;
      startEditing(id);
    });
  });

  // Handle editing
  document.querySelectorAll('.task-text.editing').forEach(el => {
    el.addEventListener('blur', (e) => {
      saveEditing(e.target);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveEditing(e.target);
      }
      if (e.key === 'Escape') {
        cancelEditing(e.target);
      }
    });
    el.focus();
    el.setSelectionRange(0, el.textContent.length);
  });
}

function startEditing(id) {
  if (editingTaskId) {
    const prev = document.querySelector(`.task-text.editing[data-id="${editingTaskId}"]`);
    if (prev) cancelEditing(prev);
  }
  editingTaskId = id;
  renderTasks();
}

function saveEditing(el) {
  const id = el.dataset.id;
  const newText = el.textContent.trim();

  if (!newText) {
    showToast('❌ Текст не может быть пустым', 'error');
    cancelEditing(el);
    return;
  }

  const task = allTasks.find(t => t.id === id);
  if (task && task.text !== newText) {
    db.collection('users')
      .doc(currentUser.uid)
      .collection('tasks')
      .doc(id)
      .update({ text: newText })
      .catch(err => showToast('❌ Ошибка обновления: ' + err.message, 'error'));
  }

  editingTaskId = null;
  renderTasks();
}

function cancelEditing(el) {
  editingTaskId = null;
  renderTasks();
}

addBtn.addEventListener('click', async () => {
  if (!currentUser) {
    showToast('❌ Сначала войдите в систему', 'error');
    return;
  }

  const text = taskInput.value.trim();
  if (!text) {
    showToast('❌ Введите текст задачи', 'error');
    return;
  }

  try {
    await db.collection('users')
      .doc(currentUser.uid)
      .collection('tasks')
      .add({
        text: text,
        done: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    taskInput.value = '';
    taskInput.focus();
    showToast('✅ Задача добавлена!', 'success');
  } catch (err) {
    showToast('❌ Ошибка: ' + err.message, 'error');
  }
});

taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addBtn.click();
  }
});

async function toggleTask(id) {
  if (!currentUser) return;
  const task = allTasks.find(t => t.id === id);
  if (!task) return;

  try {
    await db.collection('users')
      .doc(currentUser.uid)
      .collection('tasks')
      .doc(id)
      .update({ done: !task.done });
  } catch (err) {
    showToast('❌ Ошибка: ' + err.message, 'error');
  }
}

async function deleteTask(id) {
  if (!currentUser) return;
  if (!confirm('🗑️ Удалить задачу?')) return;

  try {
    await db.collection('users')
      .doc(currentUser.uid)
      .collection('tasks')
      .doc(id)
      .delete();
    showToast('✅ Задача удалена', 'success');
  } catch (err) {
    showToast('❌ Ошибка: ' + err.message, 'error');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

emailInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    passwordInput.focus();
  }
});

passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    loginBtn.click();
  }
});