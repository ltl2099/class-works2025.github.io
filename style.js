document.addEventListener('DOMContentLoaded', () => {
    // 全局变量和状态
    const state = {
        tasks: JSON.parse(localStorage.getItem('tasks')) || [],
        logs: JSON.parse(localStorage.getItem('logs')) || [],
        points: JSON.parse(localStorage.getItem('points')) || [],
        password: localStorage.getItem('password') || null,
        currentEditingId: null,
    };

    // DOM 元素选择器
    const DOMElements = {
        nav: {
            kanban: document.getElementById('nav-kanban'),
            log: document.getElementById('nav-log'),
            settings: document.getElementById('nav-settings'),
        },
        sections: {
            kanban: document.getElementById('kanban-section'),
            log: document.getElementById('log-section'),
            settings: document.getElementById('settings-section'),
        },
        kanban: {
            columns: document.querySelectorAll('.kanban-column'),
            addTaskBtns: document.querySelectorAll('.add-task-btn'),
        },
        log: {
            addBtn: document.getElementById('add-log-btn'),
            tableBody: document.querySelector('#log-table tbody'),
        },
        settings: {
            passwordGate: document.getElementById('password-gate'),
            passwordInput: document.getElementById('password-input'),
            passwordSubmit: document.getElementById('password-submit'),
            passwordFeedback: document.getElementById('password-feedback'),
            settingsContent: document.getElementById('settings-content'),
            newPassword: document.getElementById('new-password'),
            confirmPassword: document.getElementById('confirm-password'),
            savePasswordBtn: document.getElementById('save-password-btn'),
            passwordSetFeedback: document.getElementById('password-set-feedback'),
            addPointBtn: document.getElementById('add-point-btn'),
            pointsTableBody: document.querySelector('#points-table tbody'),
            totalPointsDisplay: document.getElementById('total-points-display'),
        },
        modal: {
            container: document.getElementById('modal-container'),
            body: document.getElementById('modal-body'),
            closeBtn: document.querySelector('.close-btn'),
        }
    };

    // --- 数据持久化 ---
    const saveData = (key, data) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    const savePassword = (password) => {
        localStorage.setItem('password', password);
        state.password = password;
    };

    // --- 渲染函数 ---
    const renderTasks = () => {
        // 清空看板
        document.querySelectorAll('.tasks').forEach(col => col.innerHTML = '');
        
        state.tasks.forEach(task => {
            const taskCard = document.createElement('div');
            taskCard.className = `task-card priority-${task.priority}`;
            taskCard.id = task.id;
            taskCard.draggable = true;
            taskCard.innerHTML = `
                <p><strong>${task.title}</strong></p>
                <p>负责人: ${task.assignee}</p>
                <p>截止日期: ${task.dueDate}</p>
            `;
            taskCard.addEventListener('dragstart', dragStart);
            taskCard.addEventListener('click', () => openTaskModal(task.id));
            document.getElementById(`${task.status}-tasks`).appendChild(taskCard);
        });
    };

    const renderLogs = () => {
        DOMElements.log.tableBody.innerHTML = '';
        state.logs.forEach(log => {
            const row = DOMElements.log.tableBody.insertRow();
            row.innerHTML = `
                <td>${log.date}</td>
                <td>${log.assignee}</td>
                <td>${log.category}</td>
                <td>${log.description}</td>
                <td><a href="${log.link}" target="_blank">查看</a></td>
                <td>${log.status}</td>
                <td>${log.notes}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="app.openLogModal('${log.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn delete-btn" onclick="app.deleteLog('${log.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
        });
    };
    
    const renderPoints = () => {
        DOMElements.settings.pointsTableBody.innerHTML = '';
        let totalPoints = 0;
        state.points.forEach(point => {
            const row = DOMElements.settings.pointsTableBody.insertRow();
            row.innerHTML = `
                <td>${point.date}</td>
                <td>${point.name}</td>
                <td>${point.event}</td>
                <td>${point.change > 0 ? '+' : ''}${point.change}</td>
                <td>${point.reason}</td>
                <td>${point.confirmedBy}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="app.openPointModal('${point.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn delete-btn" onclick="app.deletePoint('${point.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            totalPoints += parseInt(point.change);
        });
        DOMElements.settings.totalPointsDisplay.textContent = totalPoints;
    };

    // --- 导航/视图切换 ---
    const switchView = (targetId) => {
        Object.values(DOMElements.sections).forEach(section => section.classList.remove('active'));
        document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
        
        document.getElementById(targetId).classList.add('active');
        document.querySelector(`nav button[id="nav-${targetId.split('-')[0]}"]`).classList.add('active');

        if (targetId === 'settings-section' && state.password) {
            DOMElements.settings.passwordGate.style.display = 'block';
            DOMElements.settings.settingsContent.style.display = 'none';
        } else if (targetId === 'settings-section' && !state.password) {
            DOMElements.settings.passwordGate.style.display = 'none';
            DOMElements.settings.settingsContent.style.display = 'block';
        }
    };

    // --- 模态框逻辑 ---
    const openModal = (content) => {
        DOMElements.modal.body.innerHTML = content;
        DOMElements.modal.container.style.display = 'block';
    };

    const closeModal = () => {
        DOMElements.modal.container.style.display = 'none';
        DOMElements.modal.body.innerHTML = '';
        state.currentEditingId = null;
    };

    // --- 任务看板功能 ---
    const dragStart = (e) => {
        e.dataTransfer.setData('text/plain', e.target.id);
    };

    window.drop = (e) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        const newStatus = e.target.closest('.kanban-column').id;
        const task = state.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = newStatus;
            saveData('tasks', state.tasks);
            renderTasks();
        }
    };

    const openTaskModal = (id = null) => {
        state.currentEditingId = id;
        const task = state.tasks.find(t => t.id === id) || {};
        const isCancelled = task.status === 'cancelled';
        const modalContent = `
            <form id="task-form" class="modal-form">
                <h2>${id ? '编辑任务' : '添加新任务'}</h2>
                <label for="title">任务标题</label>
                <input type="text" id="title" value="${task.title || ''}" required>
                
                <label for="description">详情描述</label>
                <textarea id="description">${task.description || ''}</textarea>
                
                <label for="assignee">负责人</label>
                <input type="text" id="assignee" value="${task.assignee || ''}" required>
                
                <label for="dueDate">截止日期</label>
                <input type="date" id="dueDate" value="${task.dueDate || ''}" required>
                
                <label for="priority">优先级</label>
                <select id="priority">
                    <option value="low" ${task.priority === 'low' ? 'selected' : ''}>低</option>
                    <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>中</option>
                    <option value="high" ${task.priority === 'high' ? 'selected' : ''}>高</option>
                </select>

                <label for="status">状态</label>
                <select id="status">
                    <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>待办</option>
                    <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>进行中</option>
                    <option value="done" ${task.status === 'done' ? 'selected' : ''}>已完成</option>
                    <option value="cancelled" ${task.status === 'cancelled' ? 'selected' : ''}>已取消/搁置</option>
                </select>

                <div id="cancel-reason-container" style="display:${isCancelled ? 'block' : 'none'}">
                    <label for="cancelReason">取消/搁置原因</label>
                    <textarea id="cancelReason">${task.cancelReason || ''}</textarea>
                </div>
                
                <label for="attachments">关联资料/图片链接</label>
                <input type="text" id="attachments" value="${task.attachments || ''}">
                
                <button type="submit">保存</button>
                ${id ? `<button type="button" class="delete-btn" onclick="app.deleteTask('${id}')" style="background-color: #e57373; margin-top: 10px;">删除任务</button>` : ''}
            </form>
        `;
        openModal(modalContent);

        // 显示/隐藏取消原因的逻辑
        document.getElementById('status').addEventListener('change', (e) => {
            document.getElementById('cancel-reason-container').style.display = e.target.value === 'cancelled' ? 'block' : 'none';
        });
    };
    
    const handleTaskFormSubmit = (e) => {
        e.preventDefault();
        const form = e.target;
        const taskData = {
            id: state.currentEditingId || `task-${Date.now()}`,
            title: form.querySelector('#title').value,
            description: form.querySelector('#description').value,
            assignee: form.querySelector('#assignee').value,
            dueDate: form.querySelector('#dueDate').value,
            priority: form.querySelector('#priority').value,
            status: form.querySelector('#status').value,
            cancelReason: form.querySelector('#cancelReason').value,
            attachments: form.querySelector('#attachments').value,
        };

        if (state.currentEditingId) {
            const index = state.tasks.findIndex(t => t.id === state.currentEditingId);
            state.tasks[index] = taskData;
        } else {
            state.tasks.push(taskData);
        }
        
        saveData('tasks', state.tasks);
        renderTasks();
        closeModal();
    };

    const deleteTask = (id) => {
        if (confirm('确定要删除此任务吗？')) {
            state.tasks = state.tasks.filter(t => t.id !== id);
            saveData('tasks', state.tasks);
            renderTasks();
            closeModal();
        }
    };
    
    // --- 日志功能 ---
    const openLogModal = (id = null) => {
        state.currentEditingId = id;
        const log = state.logs.find(l => l.id === id) || {};
        const modalContent = `
            <form id="log-form" class="modal-form">
                <h2>${id ? '编辑日志' : '添加日志'}</h2>
                <label for="log-date">日期</label>
                <input type="date" id="log-date" value="${log.date || new Date().toISOString().slice(0, 10)}" required>
                <label for="log-assignee">负责人</label>
                <input type="text" id="log-assignee" value="${log.assignee || ''}" required>
                <label for="log-category">事项类别</label>
                <input type="text" id="log-category" value="${log.category || ''}" required>
                <label for="log-description">内容简述</label>
                <textarea id="log-description" required>${log.description || ''}</textarea>
                <label for="log-link">关键链接/截图</label>
                <input type="url" id="log-link" value="${log.link || ''}">
                <label for="log-status">状态</label>
                <input type="text" id="log-status" value="${log.status || ''}">
                <label for="log-notes">备注</label>
                <textarea id="log-notes">${log.notes || ''}</textarea>
                <button type="submit">保存</button>
            </form>
        `;
        openModal(modalContent);
    };

    const handleLogFormSubmit = (e) => {
        e.preventDefault();
        const form = e.target;
        const logData = {
            id: state.currentEditingId || `log-${Date.now()}`,
            date: form.querySelector('#log-date').value,
            assignee: form.querySelector('#log-assignee').value,
            category: form.querySelector('#log-category').value,
            description: form.querySelector('#log-description').value,
            link: form.querySelector('#log-link').value,
            status: form.querySelector('#log-status').value,
            notes: form.querySelector('#log-notes').value,
        };

        if (state.currentEditingId) {
            const index = state.logs.findIndex(l => l.id === state.currentEditingId);
            state.logs[index] = logData;
        } else {
            state.logs.push(logData);
        }
        
        saveData('logs', state.logs);
        renderLogs();
        closeModal();
    };

    const deleteLog = (id) => {
        if (confirm('确定要删除此条日志吗？')) {
            state.logs = state.logs.filter(l => l.id !== id);
            saveData('logs', state.logs);
            renderLogs();
        }
    };
    
    // --- 积分与设置功能 ---
    const handlePasswordSubmit = () => {
        const input = DOMElements.settings.passwordInput.value;
        if (input === state.password) {
            DOMElements.settings.passwordGate.style.display = 'none';
            DOMElements.settings.settingsContent.style.display = 'block';
            DOMElements.settings.passwordFeedback.textContent = '';
        } else {
            DOMElements.settings.passwordFeedback.textContent = '密码错误，请重试。';
            DOMElements.settings.passwordFeedback.className = 'feedback error';
        }
    };

    const handleSavePassword = () => {
        const newPass = DOMElements.settings.newPassword.value;
        const confirmPass = DOMElements.settings.confirmPassword.value;
        const feedbackEl = DOMElements.settings.passwordSetFeedback;

        if (!newPass || !confirmPass) {
            feedbackEl.textContent = '密码不能为空！';
            feedbackEl.className = 'feedback error';
            return;
        }
        if (newPass !== confirmPass) {
            feedbackEl.textContent = '两次输入的密码不一致！';
            feedbackEl.className = 'feedback error';
            return;
        }
        savePassword(newPass);
        feedbackEl.textContent = '密码设置成功！';
        feedbackEl.className = 'feedback success';
        DOMElements.settings.newPassword.value = '';
        DOMElements.settings.confirmPassword.value = '';
    };

    const openPointModal = (id = null) => {
        state.currentEditingId = id;
        const point = state.points.find(p => p.id === id) || {};
        const modalContent = `
            <form id="point-form" class="modal-form">
                <h2>${id ? '编辑积分' : '添加积分'}</h2>
                <label for="point-date">日期</label>
                <input type="date" id="point-date" value="${point.date || new Date().toISOString().slice(0, 10)}" required>
                <label for="point-name">姓名</label>
                <input type="text" id="point-name" value="${point.name || ''}" required>
                <label for="point-event">事项</label>
                <input type="text" id="point-event" value="${point.event || ''}" required>
                <label for="point-change">积分变动 (如: 4, -2)</label>
                <input type="number" id="point-change" value="${point.change || ''}" required>
                <label for="point-reason">事由</label>
                <textarea id="point-reason" required>${point.reason || ''}</textarea>
                <label for="point-confirmedBy">班委确认</label>
                <input type="text" id="point-confirmedBy" value="${point.confirmedBy || ''}" required>
                <button type="submit">保存</button>
            </form>
        `;
        openModal(modalContent);
    };

    const handlePointFormSubmit = (e) => {
        e.preventDefault();
        const form = e.target;
        const pointData = {
            id: state.currentEditingId || `point-${Date.now()}`,
            date: form.querySelector('#point-date').value,
            name: form.querySelector('#point-name').value,
            event: form.querySelector('#point-event').value,
            change: form.querySelector('#point-change').value,
            reason: form.querySelector('#point-reason').value,
            confirmedBy: form.querySelector('#point-confirmedBy').value,
        };
        
        if (state.currentEditingId) {
            const index = state.points.findIndex(p => p.id === state.currentEditingId);
            state.points[index] = pointData;
        } else {
            state.points.push(pointData);
        }

        saveData('points', state.points);
        renderPoints();
        closeModal();
    };
    
    const deletePoint = (id) => {
        if (confirm('确定要删除此条积分记录吗？')) {
            state.points = state.points.filter(p => p.id !== id);
            saveData('points', state.points);
            renderPoints();
        }
    };
    
    // --- 事件监听器绑定 ---
    const bindEventListeners = () => {
        // 导航
        DOMElements.nav.kanban.addEventListener('click', () => switchView('kanban-section'));
        DOMElements.nav.log.addEventListener('click', () => switchView('log-section'));
        DOMElements.nav.settings.addEventListener('click', () => switchView('settings-section'));

        // 模态框
        DOMElements.modal.closeBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (e) => {
            if (e.target === DOMElements.modal.container) closeModal();
        });
        DOMElements.modal.container.addEventListener('submit', (e) => {
            if (e.target.id === 'task-form') handleTaskFormSubmit(e);
            if (e.target.id === 'log-form') handleLogFormSubmit(e);
            if (e.target.id === 'point-form') handlePointFormSubmit(e);
        });

        // 看板
        DOMElements.kanban.addTaskBtns.forEach(btn => btn.addEventListener('click', () => openTaskModal()));

        // 日志
        DOMElements.log.addBtn.addEventListener('click', () => openLogModal());
        
        // 设置与积分
        DOMElements.settings.passwordSubmit.addEventListener('click', handlePasswordSubmit);
        DOMElements.settings.savePasswordBtn.addEventListener('click', handleSavePassword);
        DOMElements.settings.addPointBtn.addEventListener('click', () => openPointModal());
    };
    
    // --- 初始化 ---
    const init = () => {
        bindEventListeners();
        renderTasks();
        renderLogs();
        renderPoints();

        // 暴露给HTML内联调用的方法
        window.app = {
            openLogModal,
            deleteLog,
            openPointModal,
            deletePoint,
            deleteTask
        };
        
        // 密码提示
        if (!state.password) {
            const originalText = DOMElements.nav.settings.innerHTML;
            DOMElements.nav.settings.innerHTML += ' <span style="color: #ffd54f; font-size: 0.8em;">(请先设置密码)</span>';
        }
    };

    init();
});