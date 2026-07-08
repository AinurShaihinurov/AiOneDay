const firebaseConfig = {
  apiKey: "AIzaSyAWUG4QQie6W4UvYQzYvxjPOluT3pqgg-A",
  authDomain: "oneday-95562.firebaseapp.com",
  projectId: "oneday-95562",
  storageBucket: "oneday-95562.firebasestorage.app",
  messagingSenderId: "876387088137",
  appId: "1:876387088137:web:29fdd5835fb85207c885d8"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const taskSection = document.getElementById('taskSection');
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');

let currentUser = null;

registerBtn.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  
  if (!email || !password) {
    alert('❌ Введите email и пароль');
    return;
  }
  
  auth.createUserWithEmailAndPassword(email, password)
    .then(() => alert('✅ Регистрация успешна!'))
    .catch(err => alert('❌ Ошибка: ' + err.message));
});

loginBtn.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  
  if (!email || !password) {
    alert('❌ Введите email и пароль');
    return;
  }
  
  auth.signInWithEmailAndPassword(email, password)
    .then(() => alert('✅ Добро пожаловать!'))
    .catch(err => alert('❌ Ошибка: ' + err.message));
});

logoutBtn.addEventListener('click', () => {
  auth.signOut();
});

auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    document.querySelector('.auth').style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    taskSection.style.display = 'block';
    loadTasks();
  } else {
    currentUser = null;
    document.querySelector('.auth').style.display = 'flex';
    logoutBtn.style.display = 'none';
    taskSection.style.display = 'none';
    taskList.innerHTML = '';
  }
});

addBtn.addEventListener('click', () => {
  const text = taskInput.value.trim();
  if (!text) return alert('Введите текст задачи');
  if (!currentUser) return alert('Войдите в аккаунт');

  db.collection('users').doc(currentUser.uid).collection('tasks').add({
    text: text,
    done: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    taskInput.value = '';
  }).catch(err => alert('Ошибка: ' + err.message));
});

function loadTasks() {
  if (!currentUser) return;
  db.collection('users').doc(currentUser.uid).collection('tasks')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      taskList.innerHTML = '';
      snapshot.forEach(doc => {
        const task = doc.data();
        const li = document.createElement('li');
        li.textContent = task.text;
        if (task.done) li.classList.add('completed');

        const doneBtn = document.createElement('button');
        doneBtn.textContent = '✅';
        doneBtn.className = 'done-btn';
        doneBtn.onclick = () => {
          db.collection('users').doc(currentUser.uid).collection('tasks').doc(doc.id).update({
            done: !task.done
          });
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '❌';
        deleteBtn.className = 'delete-btn';
        deleteBtn.onclick = () => {
          if (confirm('Удалить задачу?')) {
            db.collection('users').doc(currentUser.uid).collection('tasks').doc(doc.id).delete();
          }
        };

        li.appendChild(doneBtn);
        li.appendChild(deleteBtn);
        taskList.appendChild(li);
      });
    });
}