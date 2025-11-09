// script.js
const STORAGE_KEYS = {
    TASKS: 'tasks',
    LOGS: 'logs',
    POINTS: 'points',
    PASSWORD: 'password'
};

let tasks = loadData(STORAGE_KEYS.TASKS) || [];
let logs = loadData(STORAGE_KEYS.LOGS) || [];
let points = loadData(STORAGE_KEYS.POINTS) || [];
let password = localStorage.getItem(STORAGE_KEYS.PASSWORD);
let isLoggedIn = false;
let currentTaskId = null;
let currentLogId = null;
let currentPointId = null;

function loadData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Login and Password Management
document.addEventListener('DOMContentLoaded', () => {
    if (!password) {
        showModal('set-password-modal');
    } else {
        showModal('login-modal');
    }

    // Event Listeners
    document.getElementById('set-password-submit').addEventListener('click', setInitialPassword);
    document.getElementById('login-submit').addEventListener('click', login);
    document.getElementById('save-password').addEventListener('click', changePassword);
    document.getElementById('logout').addEventListener('click', logout);

    // Navigation
    document.getElementById('nav-kanban').addEventListener('click', () => showSection('kanban-section'));
    document.getElementById('nav-log').addEventListener('click', () => showSection('log-section'));
    document.getElementById('nav-settings').addEventListener('click', () => showSection('settings-section'));

    // Kanban
    document.getElementById('add-task').addEventListener('click', openAddTaskModal);
    document.getElementById('save-task').addEventListener('click', saveTask);
    document.getElementById('close-task-modal').addEventListener('click', () => closeModal('task-modal'));

    // Log
    document.getElementById('add-log').addEventListener('click', openAddLogModal);
    document.getElementById('save-log').addEventListener('click', saveLog);
    document.getElementById('close-log-modal').addEventListener('click', () => closeModal('log-modal'));

    // Points
    document.getElementById('add-point').addEventListener('click', openAddPointModal);
    document.getElementById('save-point').addEventListener('click', savePoint);
    document.getElementById('close-point-modal').addEventListener('click', () => closeModal('point-modal'));
});

function showSection(sectionId) {
    if (!isLoggedIn) return;
    document.querySelectorAll('.section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
    if (sectionId === 'kanban-section') renderKanban();
    if (sectionId === 'log-section') renderLogs();
    if (sectionId === 'settings-section') renderPoints();
}

function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function setInitialPassword() {
    const newPass = document.getElementById('set-new-password').value;
    const confirmPass = document.getElementById('set-confirm-password').value;
    const feedback = document.getElementById('set-password-feedback');
    if (newPass !== confirmPass || !newPass) {
        feedback.textContent = '密码不匹配或为空';
        return;
    }
    localStorage.setItem(STORAGE_KEYS.PASSWORD, newPass);
    password = newPass;
    closeModal('set-password-modal');
    showModal('login-modal');
    feedback.textContent = '';
}

function login() {
    const inputPass = document.getElementById('login-password').value;
    const feedback = document.getElementById('login-feedback');
    if (inputPass === password) {
        isLoggedIn = true;
        closeModal('login-modal');
        showSection('kanban-section');
        document.querySelector('header').style.display = 'block';
        document.querySelector('main').style.display = 'block';
        feedback.textContent = '';
    } else {
        feedback.textContent = '密码错误';
    }
}

function changePassword() {
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;
    const feedback = document.getElementById('password-feedback');
    if (newPass !== confirmPass || !newPass) {
        feedback.textContent = '密码不匹配或为空';
        return;
    }
    localStorage.setItem(STORAGE_KEYS.PASSWORD, newPass);
    password = newPass;
    feedback.textContent = '密码更新成功';
}

function logout() {
    isLoggedIn = false;
    document.querySelector('header').style.display = 'none';
    document.querySelector('main').style.display = 'none';
    showModal('login-modal');
}

// Kanban Functions
function renderKanban() {
    const columns = ['to-do', 'in-progress', 'done', 'cancelled'];
    columns.forEach(col => {
        const tasksDiv = document.getElementById(col).querySelector('.tasks');
        tasksDiv.innerHTML = '';
        tasks.filter(task => task.status === col).forEach(task => {
            const card = document.createElement('div');
            card.classList.add('task-card', task.priority);
            card.draggable = true;
            card.dataset.id = task.id;
            card.innerHTML = `
                <h4>${task.title}</h4>
                <p>负责人: ${task.assignee}</p>
                <p>截止: ${task.dueDate}</p>
                <p>优先级: ${task.priority}</p>
                <button class="edit-task">编辑</button>
                <button class="delete-task">删除</button>
            `;
            card.querySelector('.edit-task').addEventListener('click', () => openEditTaskModal(task.id));
            card.querySelector('.delete-task').addEventListener('click', () => deleteTask(task.id));
            card.addEventListener('dragstart', dragStart);
            tasksDiv.appendChild(card);
        });
    });

    document.querySelectorAll('.column').forEach(column => {
        column.addEventListener('dragover', dragOver);
        column.addEventListener('drop', drop);
    });
}

function openAddTaskModal() {
    currentTaskId = null;
    document.getElementById('task-modal-title').textContent = '添加新任务';
    clearTaskModal();
    document.getElementById('task-status').value = 'to-do';
    document.getElementById('task-reason').classList.add('hidden');
    showModal('task-modal');
}

function openEditTaskModal(id) {
    const task = tasks.find(t => t.id === id);
    currentTaskId = id;
    document.getElementById('task-modal-title').textContent = '编辑任务';
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description;
    document.getElementById('task-assignee').value = task.assignee;
    document.getElementById('task-due-date').value = task.dueDate;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-status').value = task.status;
    document.getElementById('task-links').value = task.links || '';
    if (task.status === 'cancelled') {
        document.getElementById('task-reason').value = task.reason || '';
        document.getElementById('task-reason').classList.remove('hidden');
    } else {
        document.getElementById('task-reason').classList.add('hidden');
    }
    showModal('task-modal');

    document.getElementById('task-status').addEventListener('change', (e) => {
        if (e.target.value === 'cancelled') {
            document.getElementById('task-reason').classList.remove('hidden');
        } else {
            document.getElementById('task-reason').classList.add('hidden');
        }
    });
}

function clearTaskModal() {
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').value = '';
    document.getElementById('task-assignee').value = '';
    document.getElementById('task-due-date').value = '';
    document.getElementById('task-priority').value = 'medium';
    document.getElementById('task-status').value = 'to-do';
    document.getElementById('task-reason').value = '';
    document.getElementById('task-links').value = '';
    document.getElementById('task-feedback').textContent = '';
}

function saveTask() {
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const assignee = document.getElementById('task-assignee').value;
    const dueDate = document.getElementById('task-due-date').value;
    const priority = document.getElementById('task-priority').value;
    const status = document.getElementById('task-status').value;
    const reason = status === 'cancelled' ? document.getElementById('task-reason').value : '';
    const links = document.getElementById('task-links').value;
    const feedback = document.getElementById('task-feedback');

    if (!title || !assignee || !dueDate) {
        feedback.textContent = '请填写必填项';
        return;
    }

    if (currentTaskId) {
        const task = tasks.find(t => t.id === currentTaskId);
        task.title = title;
        task.description = description;
        task.assignee = assignee;
        task.dueDate = dueDate;
        task.priority = priority;
        task.status = status;
        task.reason = reason;
        task.links = links;
    } else {
        const id = Date.now();
        tasks.push({ id, title, description, assignee, dueDate, priority, status, reason, links });
    }

    saveData(STORAGE_KEYS.TASKS, tasks);
    closeModal('task-modal');
    renderKanban();
}

function deleteTask(id) {
    if (confirm('确认删除?')) {
        tasks = tasks.filter(t => t.id !== id);
        saveData(STORAGE_KEYS.TASKS, tasks);
        renderKanban();
    }
}

// Drag and Drop
let draggedTask = null;

function dragStart(e) {
    draggedTask = e.target;
    e.dataTransfer.setData('text/plain', '');
}

function dragOver(e) {
    e.preventDefault();
}

function drop(e) {
    e.preventDefault();
    const column = e.target.closest('.column');
    if (column && draggedTask) {
        const newStatus = column.dataset.status;
        const id = parseInt(draggedTask.dataset.id);
        const task = tasks.find(t => t.id === id);
        task.status = newStatus;
        if (newStatus === 'cancelled' && !task.reason) {
            task.reason = prompt('请输入取消/搁置原因');
        }
        saveData(STORAGE_KEYS.TASKS, tasks);
        renderKanban();
    }
}

// Log Functions
function renderLogs() {
    const tbody = document.getElementById('log-table').querySelector('tbody');
    tbody.innerHTML = '';
    logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${log.date}</td>
            <td>${log.assignee}</td>
            <td>${log.category}</td>
            <td>${log.description}</td>
            <td><a href="${log.link}" target="_blank">${log.link ? '查看' : ''}</a></td>
            <td>${log.status}</td>
            <td>${log.notes}</td>
            <td>
                <button class="edit-log">编辑</button>
                <button class="delete-log">删除</button>
            </td>
        `;
        tr.querySelector('.edit-log').addEventListener('click', () => openEditLogModal(log.id));
        tr.querySelector('.delete-log').addEventListener('click', () => deleteLog(log.id));
        tbody.appendChild(tr);
    });
}

function openAddLogModal() {
    currentLogId = null;
    document.getElementById('log-modal-title').textContent = '添加日志';
    clearLogModal();
    showModal('log-modal');
}

function openEditLogModal(id) {
    const log = logs.find(l => l.id === id);
    currentLogId = id;
    document.getElementById('log-modal-title').textContent = '编辑日志';
    document.getElementById('log-date').value = log.date;
    document.getElementById('log-assignee').value = log.assignee;
    document.getElementById('log-category').value = log.category;
    document.getElementById('log-description').value = log.description;
    document.getElementById('log-link').value = log.link;
    document.getElementById('log-status').value = log.status;
    document.getElementById('log-notes').value = log.notes;
    showModal('log-modal');
}

function clearLogModal() {
    document.getElementById('log-date').value = '';
    document.getElementById('log-assignee').value = '';
    document.getElementById('log-category').value = '';
    document.getElementById('log-description').value = '';
    document.getElementById('log-link').value = '';
    document.getElementById('log-status').value = '';
    document.getElementById('log-notes').value = '';
    document.getElementById('log-feedback').textContent = '';
}

function saveLog() {
    const date = document.getElementById('log-date').value;
    const assignee = document.getElementById('log-assignee').value;
    const category = document.getElementById('log-category').value;
    const description = document.getElementById('log-description').value;
    const link = document.getElementById('log-link').value;
    const status = document.getElementById('log-status').value;
    const notes = document.getElementById('log-notes').value;
    const feedback = document.getElementById('log-feedback');

    if (!date || !assignee || !description) {
        feedback.textContent = '请填写必填项';
        return;
    }

    if (currentLogId) {
        const log = logs.find(l => l.id === currentLogId);
        log.date = date;
        log.assignee = assignee;
        log.category = category;
        log.description = description;
        log.link = link;
        log.status = status;
        log.notes = notes;
    } else {
        const id = Date.now();
        logs.push({ id, date, assignee, category, description, link, status, notes });
    }

    saveData(STORAGE_KEYS.LOGS, logs);
    closeModal('log-modal');
    renderLogs();
}

function deleteLog(id) {
    if (confirm('确认删除?')) {
        logs = logs.filter(l => l.id !== id);
        saveData(STORAGE_KEYS.LOGS, logs);
        renderLogs();
    }
}

// Points Functions
function renderPoints() {
    const tbody = document.getElementById('points-table').querySelector('tbody');
    tbody.innerHTML = '';
    let total = 0;
    points.forEach(point => {
        total += point.change;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${point.date}</td>
            <td>${point.name}</td>
            <td>${point.item}</td>
            <td>${point.change}</td>
            <td>${point.reason}</td>
            <td>${point.confirmed}</td>
            <td>
                <button class="edit-point">编辑</button>
                <button class="delete-point">删除</button>
            </td>
        `;
        tr.querySelector('.edit-point').addEventListener('click', () => openEditPointModal(point.id));
        tr.querySelector('.delete-point').addEventListener('click', () => deletePoint(point.id));
        tbody.appendChild(tr);
    });
    document.getElementById('total-points').textContent = `班级当前总积分：${total}`;
}

function openAddPointModal() {
    currentPointId = null;
    document.getElementById('point-modal-title').textContent = '添加积分记录';
    clearPointModal();
    showModal('point-modal');
}

function openEditPointModal(id) {
    const point = points.find(p => p.id === id);
    currentPointId = id;
    document.getElementById('point-modal-title').textContent = '编辑积分记录';
    document.getElementById('point-date').value = point.date;
    document.getElementById('point-name').value = point.name;
    document.getElementById('point-item').value = point.item;
    document.getElementById('point-change').value = point.change;
    document.getElementById('point-reason').value = point.reason;
    document.getElementById('point-confirmed').value = point.confirmed;
    showModal('point-modal');
}

function clearPointModal() {
    document.getElementById('point-date').value = '';
    document.getElementById('point-name').value = '';
    document.getElementById('point-item').value = '';
    document.getElementById('point-change').value = '';
    document.getElementById('point-reason').value = '';
    document.getElementById('point-confirmed').value = '';
    document.getElementById('point-feedback').textContent = '';
}

function savePoint() {
    const date = document.getElementById('point-date').value;
    const name = document.getElementById('point-name').value;
    const item = document.getElementById('point-item').value;
    const change = parseInt(document.getElementById('point-change').value);
    const reason = document.getElementById('point-reason').value;
    const confirmed = document.getElementById('point-confirmed').value;
    const feedback = document.getElementById('point-feedback');

    if (!date || !name || !item || isNaN(change)) {
        feedback.textContent = '请填写必填项';
        return;
    }

    if (currentPointId) {
        const point = points.find(p => p.id === currentPointId);
        point.date = date;
        point.name = name;
        point.item = item;
        point.change = change;
        point.reason = reason;
        point.confirmed = confirmed;
    } else {
        const id = Date.now();
        points.push({ id, date, name, item, change, reason, confirmed });
    }

    saveData(STORAGE_KEYS.POINTS, points);
    closeModal('point-modal');
    renderPoints();
}

function deletePoint(id) {
    if (confirm('确认删除?')) {
        points = points.filter(p => p.id !== id);
        saveData(STORAGE_KEYS.POINTS, points);
        renderPoints();
    }
}
