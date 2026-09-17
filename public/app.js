import * as db from './storage.js';

const state = {
  filter: 'open',
  tasks: [],
  settings: null,
};

const taskList = document.getElementById('task-list');
const addForm = document.getElementById('add-form');
const titleInput = document.getElementById('title');
const descriptionInput = document.getElementById('description');
const priorityInput = document.getElementById('priority');
const dueInput = document.getElementById('due');

const settingsPanel = document.getElementById('settings-panel');
const settingsForm = document.getElementById('settings-form');
const settingsToggle = document.getElementById('settings-toggle');
const intervalInput = document.getElementById('interval');
const enabledInput = document.getElementById('enabled');
const remindWhenEmptyInput = document.getElementById('remind-when-empty');
const nextReminder = document.getElementById('next-reminder');

const remindNowButton = document.getElementById('remind-now');
const toast = document.getElementById('toast');

function loadTasks() {
  state.tasks = db.listTasks(state.filter);
  renderTasks();
}

function renderTasks() {
  taskList.replaceChildren();

  if (state.tasks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent =
      state.filter === 'open'
        ? 'Nothing open. The loop is clear.'
        : state.filter === 'done'
          ? 'No finished tasks yet.'
          : 'The list is empty. Add something to start the loop.';
    taskList.append(empty);
    return;
  }

  for (const task of state.tasks) {
    taskList.append(buildTaskNode(task));
  }
}

function buildTaskNode(task) {
  const article = document.createElement('article');
  article.className = `task${task.status === 'done' ? ' done' : ''}`;

  const checkbox = document.createElement('button');
  checkbox.className = 'check';
  checkbox.type = 'button';
  checkbox.setAttribute('aria-label', task.status === 'done' ? 'Mark as open' : 'Mark as done');
  checkbox.textContent = task.status === 'done' ? '✓' : '';
  checkbox.addEventListener('click', () => toggleTask(task));

  const body = document.createElement('div');
  body.className = 'task-body';

  const title = document.createElement('h3');
  title.className = 'task-title';
  title.textContent = task.title;
  body.append(title);

  if (task.description) {
    const description = document.createElement('p');
    description.className = 'task-description';
    description.textContent = task.description;
    body.append(description);
  }

  const meta = document.createElement('div');
  meta.className = 'task-meta';

  const priority = document.createElement('span');
  priority.className = `priority priority-${task.priority}`;
  priority.textContent = task.priority;
  meta.append(priority);

  if (task.dueAt) {
    const due = document.createElement('span');
    due.className = 'due';
    due.textContent = `due ${formatDue(task.dueAt)}`;
    meta.append(due);
  }

  body.append(meta);

  const actions = document.createElement('div');
  actions.className = 'task-actions';
  const remove = document.createElement('button');
  remove.className = 'delete';
  remove.type = 'button';
  remove.textContent = 'Delete';
  remove.addEventListener('click', () => removeTask(task));
  actions.append(remove);

  article.append(checkbox, body, actions);
  return article;
}

function toggleTask(task) {
  const next = task.status === 'done' ? 'open' : 'done';
  db.updateTask(task.id, { status: next });
  loadTasks();
}

function removeTask(task) {
  if (!window.confirm(`Delete "${task.title}"?`)) return;
  db.deleteTask(task.id);
  loadTasks();
}

function loadSettings() {
  state.settings = db.getSettings();
  renderSettings();
}

function renderSettings() {
  intervalInput.value = state.settings.intervalMinutes;
  enabledInput.checked = state.settings.enabled;
  remindWhenEmptyInput.checked = state.settings.remindWhenEmpty;
  nextReminder.textContent = state.settings.nextRemindAt
    ? `Next reminder: ${new Date(state.settings.nextRemindAt).toLocaleString()}`
    : 'Next reminder: scheduling on the next tick';
}

addForm.addEventListener('submit', (event) => {
  event.preventDefault();
  db.createTask({
    title: titleInput.value,
    description: descriptionInput.value,
    priority: priorityInput.value,
    dueAt: dueInput.value || null,
  });
  addForm.reset();
  priorityInput.value = 'medium';
  loadTasks();
});

settingsToggle.addEventListener('click', () => {
  const expanded = settingsPanel.hidden;
  settingsPanel.hidden = !expanded;
  settingsToggle.setAttribute('aria-expanded', String(expanded));
});

settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  state.settings = db.updateSettings({
    intervalMinutes: Number(intervalInput.value),
    enabled: enabledInput.checked,
    remindWhenEmpty: remindWhenEmptyInput.checked,
  });
  state.settings = db.updateSettings({
    nextRemindAt: new Date(Date.now() + state.settings.intervalMinutes * 60_000).toISOString(),
  });
  renderSettings();
  settingsPanel.hidden = true;
  showToast('Settings saved');
});

remindNowButton.addEventListener('click', () => {
  fireReminder();
});

document.querySelectorAll('.filter').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach((item) => {
      item.classList.remove('active');
      item.setAttribute('aria-pressed', 'false');
    });
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
    state.filter = button.dataset.filter;
    loadTasks();
  });
});

function formatDue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

const TITLES = [
  'A gentle nudge',
  'Your list is calling',
  'Heads up from Loop',
  'Open loops detected',
  'Time to check the list',
  'The tasks are waiting',
];

const EMPTY_TITLES = ['All clear', 'Nothing open', 'A rare quiet moment'];

function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function fireReminder() {
  const settings = db.getSettings();
  const openTasks = db.listTasks('open');

  if (openTasks.length === 0) {
    if (settings.remindWhenEmpty) {
      notify(pick(EMPTY_TITLES), 'No open tasks. Enjoy the calm.');
    }
    showToast('No open tasks.');
    return;
  }

  const preview = openTasks.slice(0, 5).map((task, index) => `${index + 1}. ${task.title} [${task.priority}]`);
  const remainder = openTasks.length - preview.length;
  const lines = [
    `You have ${openTasks.length} open task${openTasks.length === 1 ? '' : 's'}:`,
    '',
    ...preview,
    ...(remainder > 0 ? [`...and ${remainder} more`] : []),
  ];

  notify(pick(TITLES), lines.join('\n'));
  showToast(`Reminder sent for ${openTasks.length} open tasks`);
}

function notify(title, message) {
  if (!('Notification' in window)) {
    showToast(message);
    return;
  }
  if (Notification.permission === 'granted') {
    new Notification(title, { body: message });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') new Notification(title, { body: message });
    });
  }
}

function startReminderLoop() {
  const TICK_MS = 15_000;
  setInterval(() => {
    const settings = db.getSettings();
    if (!settings.enabled) return;

    const now = Date.now();
    const next = settings.nextRemindAt ? new Date(settings.nextRemindAt).getTime() : null;

    if (!next) {
      db.updateSettings({ nextRemindAt: new Date(now + settings.intervalMinutes * 60_000).toISOString() });
      return;
    }

    if (now < next) return;

    fireReminder();
    db.updateSettings({ nextRemindAt: new Date(now + settings.intervalMinutes * 60_000).toISOString() });
  }, TICK_MS);
}

if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

loadTasks();
loadSettings();
startReminderLoop();
