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
const notesInput = document.getElementById('notes');

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
          : state.filter === 'hold'
            ? 'Nothing on hold. Everything is in motion.'
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
  const statusClass = task.status === 'done' ? ' done' : task.status === 'hold' ? ' hold' : '';
  article.className = `task${statusClass}`;

  const checkbox = document.createElement('button');
  checkbox.className = 'check';
  checkbox.type = 'button';
  checkbox.setAttribute('aria-label', checkLabel(task.status));
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

  if (task.notes) {
    const notes = document.createElement('p');
    notes.className = 'task-notes';
    notes.textContent = task.notes;
    body.append(notes);
  }

  const meta = document.createElement('div');
  meta.className = 'task-meta';

  const priority = document.createElement('span');
  priority.className = `priority priority-${task.priority}`;
  priority.textContent = task.priority;
  meta.append(priority);

  if (task.status === 'hold') {
    const badge = document.createElement('span');
    badge.className = 'hold-badge';
    badge.textContent = 'on hold';
    meta.append(badge);
  }

  if (task.dueAt) {
    const due = document.createElement('span');
    due.className = 'due';
    due.textContent = `due ${formatDue(task.dueAt)}`;
    meta.append(due);
  }

  body.append(meta);

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  if (task.status === 'open') {
    const hold = document.createElement('button');
    hold.className = 'hold';
    hold.type = 'button';
    hold.textContent = 'Hold';
    hold.addEventListener('click', () => holdTask(task));
    actions.append(hold);
  } else if (task.status === 'hold') {
    const resume = document.createElement('button');
    resume.className = 'resume';
    resume.type = 'button';
    resume.textContent = 'Resume';
    resume.addEventListener('click', () => resumeTask(task));
    actions.append(resume);
  }

  const remove = document.createElement('button');
  remove.className = 'delete';
  remove.type = 'button';
  remove.textContent = 'Delete';
  remove.addEventListener('click', () => removeTask(task));
  actions.append(remove);

  article.append(checkbox, body, actions);
  return article;
}

function checkLabel(status) {
  if (status === 'done') return 'Mark as open';
  if (status === 'hold') return 'Resume task';
  return 'Mark as done';
}

function toggleTask(task) {
  const next = task.status === 'hold' ? 'open' : task.status === 'done' ? 'open' : 'done';
  db.updateTask(task.id, { status: next });
  loadTasks();
}

function holdTask(task) {
  db.updateTask(task.id, { status: 'hold' });
  showToast(`"${task.title}" is on hold`);
  loadTasks();
}

function resumeTask(task) {
  db.updateTask(task.id, { status: 'open' });
  showToast(`"${task.title}" resumed`);
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
    notes: notesInput.value,
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
  fireReminder(true);
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

async function fireReminder(requestPermission = false) {
  const settings = db.getSettings();
  const openTasks = db.listTasks('open');

  if (openTasks.length === 0) {
    if (settings.remindWhenEmpty) {
      const sent = await notify(pick(EMPTY_TITLES), 'No open tasks. Enjoy the calm.', requestPermission);
      if (sent) showToast('All-clear reminder sent');
      return;
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

  const sent = await notify(pick(TITLES), lines.join('\n'), requestPermission);
  if (sent) {
    const taskLabel = openTasks.length === 1 ? 'task' : 'tasks';
    showToast(`Reminder sent for ${openTasks.length} open ${taskLabel}`);
  }
}

async function notify(title, message, requestPermission) {
  if (!('Notification' in window)) {
    showToast('This browser does not support notifications.');
    return false;
  }

  let permission = Notification.permission;
  if (permission === 'default' && requestPermission) {
    permission = await Notification.requestPermission();
  }

  if (permission === 'granted') {
    new Notification(title, { body: message });
    return true;
  }

  showToast(permission === 'denied'
    ? 'Notifications are blocked. Enable them in your browser settings.'
    : 'Click Remind now to allow notifications.');
  return false;
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

loadTasks();
loadSettings();
startReminderLoop();
