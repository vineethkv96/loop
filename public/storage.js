const TASKS_KEY = 'loop:tasks';
const SETTINGS_KEY = 'loop:settings';

function readTasks() {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function nextId(tasks) {
  return tasks.reduce((max, task) => Math.max(max, task.id), 0) + 1;
}

export function listTasks(status = 'open') {
  const tasks = readTasks();
  const filtered = status === 'all' ? tasks : tasks.filter((task) => task.status === status);
  const rank = { open: 0, hold: 1, done: 2 };
  return filtered.sort((a, b) => {
    if (a.status !== b.status) return rank[a.status] - rank[b.status];
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

export function getTask(id) {
  return readTasks().find((task) => task.id === id) || null;
}

export function createTask({ title, description = '', priority = 'medium', dueAt = null }) {
  const tasks = readTasks();
  const task = {
    id: nextId(tasks),
    title,
    description,
    notes: '',
    priority,
    status: 'open',
    dueAt,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  tasks.push(task);
  writeTasks(tasks);
  return task;
}

export function updateTask(id, fields) {
  const tasks = readTasks();
  const task = tasks.find((item) => item.id === id);
  if (!task) return null;

  if (fields.title !== undefined) task.title = fields.title;
  if (fields.description !== undefined) task.description = fields.description;
  if (fields.notes !== undefined) task.notes = fields.notes;
  if (fields.priority !== undefined) task.priority = fields.priority;
  if (fields.dueAt !== undefined) task.dueAt = fields.dueAt;

  if (fields.status === 'done') {
    task.status = 'done';
    task.completedAt = new Date().toISOString();
  } else if (fields.status === 'open' || fields.status === 'hold') {
    task.status = fields.status;
    task.completedAt = null;
  }

  writeTasks(tasks);
  return task;
}

export function deleteTask(id) {
  const tasks = readTasks();
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return null;
  const [removed] = tasks.splice(index, 1);
  writeTasks(tasks);
  return removed;
}

export function countOpenTasks() {
  return readTasks().filter((task) => task.status === 'open').length;
}

const DEFAULT_SETTINGS = {
  intervalMinutes: 60,
  enabled: true,
  remindWhenEmpty: false,
  nextRemindAt: null,
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_SETTINGS, ...stored };
  }
  catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function updateSettings(patch) {
  const settings = getSettings();
  const next = { ...settings, ...patch };
  if (patch.intervalMinutes !== undefined) {
    next.intervalMinutes = clampInterval(patch.intervalMinutes);
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

function clampInterval(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 60;
  return Math.min(Math.max(Math.round(number), 1), 10080);
}
