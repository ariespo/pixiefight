const DB_NAME = 'yqh-saves-v1';
const DB_VERSION = 1;
const STORE = 'records';
const ACTIVE_KEY = 'yqh-active-slot-v1';
const MIGRATION_KEY = 'yqh-save-slots-migrated-v1';
const LEGACY_KEY = 'yqh-save-v2';

const clone = (value) => value == null ? value : structuredClone(value);
const slotKey = (slot) => `slot:${slot}:auto`;
const snapshotKey = (slot, index) => `slot:${slot}:snapshot:${index}`;

let db = null;
let memory = new Map();
let activeSlot = Math.max(1, Math.min(3, Math.round(Number(localStorage.getItem(ACTIVE_KEY)) || 1)));
let pending = Promise.resolve();

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB 请求失败'));
  });
}

function openDatabase() {
  if (!globalThis.indexedDB) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const next = req.result;
      if (!next.objectStoreNames.contains(STORE)) next.createObjectStore(STORE, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('无法打开存档数据库'));
  });
}

async function readRecord(key) {
  if (!db) return clone(memory.get(key) ?? null);
  const tx = db.transaction(STORE, 'readonly');
  const row = await request(tx.objectStore(STORE).get(key));
  return row ? clone(row.value) : null;
}

async function writeRecord(key, value) {
  if (!db) { memory.set(key, clone(value)); return; }
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put({ key, value: clone(value) });
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error ?? new Error('写入存档失败'));
    tx.onabort = () => reject(tx.error ?? new Error('写入存档被中止'));
  });
}

async function removeRecord(key) {
  if (!db) { memory.delete(key); return; }
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(key);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error ?? new Error('删除存档失败'));
  });
}

function bundle(state, kind = 'auto') {
  return {
    version: 3,
    kind,
    updatedAt: Date.now(),
    state: clone(state),
  };
}

export async function initSaveStore() {
  try { db = await openDatabase(); } catch { db = null; }
  if (localStorage.getItem(MIGRATION_KEY) !== 'done') {
    const existing = await readRecord(slotKey(1));
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!existing && legacy) {
      try {
        const state = JSON.parse(legacy);
        await writeRecord(slotKey(1), bundle(state, 'migrated'));
        const verify = await readRecord(slotKey(1));
        if (verify?.state) localStorage.setItem(MIGRATION_KEY, 'done');
      } catch { /* 保留旧键，下次启动继续迁移 */ }
    } else if (existing || !legacy) localStorage.setItem(MIGRATION_KEY, 'done');
  }
  return activeSlot;
}

export function getActiveSlot() { return activeSlot; }

export function setActiveSlot(slot) {
  activeSlot = Math.max(1, Math.min(3, Math.round(Number(slot)) || 1));
  localStorage.setItem(ACTIVE_KEY, String(activeSlot));
  return activeSlot;
}

export async function loadSlot(slot = activeSlot) {
  return (await readRecord(slotKey(slot)))?.state ?? null;
}

export function queueAutosave(state, slot = activeSlot) {
  const payload = bundle(state, 'auto');
  pending = pending.catch(() => {}).then(() => writeRecord(slotKey(slot), payload));
  return pending;
}

export async function flushAutosave() { await pending.catch(() => {}); }

export async function saveSnapshot(index, state, slot = activeSlot) {
  await flushAutosave();
  await writeRecord(snapshotKey(slot, index), bundle(state, 'manual'));
  return snapshotMeta((await readRecord(snapshotKey(slot, index))), index);
}

export async function loadSnapshot(index, slot = activeSlot) {
  await flushAutosave();
  return (await readRecord(snapshotKey(slot, index)))?.state ?? null;
}

export async function clearSlot(slot) {
  await flushAutosave();
  await removeRecord(slotKey(slot));
  for (let i = 1; i <= 3; i++) await removeRecord(snapshotKey(slot, i));
}

function stateMeta(row, slot) {
  const s = row?.state;
  return s ? {
    slot, exists: true, updatedAt: row.updatedAt || 0,
    playerName: String(s.playerName || '无名魔王'), lairName: String(s.lairName || '未命名地牢'),
    raidNo: Number(s.raidNo || 1), overtime: !!s.overtime, otRaid: Number(s.otRaid || 21),
    doctrine: String(s.doctrine || 'default'), novel: !!s.novel?.enabled,
  } : { slot, exists: false, updatedAt: 0 };
}

function snapshotMeta(row, index) {
  const s = row?.state;
  return s ? {
    index, exists: true, updatedAt: row.updatedAt || 0,
    playerName: String(s.playerName || '无名魔王'), lairName: String(s.lairName || '未命名地牢'),
    raidNo: Number(s.raidNo || 1), overtime: !!s.overtime, otRaid: Number(s.otRaid || 21), novel: !!s.novel?.enabled,
  } : { index, exists: false, updatedAt: 0 };
}

export async function listSlots() {
  const out = [];
  for (let slot = 1; slot <= 3; slot++) {
    const row = await readRecord(slotKey(slot));
    const snapshots = [];
    for (let index = 1; index <= 3; index++) snapshots.push(snapshotMeta(await readRecord(snapshotKey(slot, index)), index));
    out.push({ ...stateMeta(row, slot), snapshots });
  }
  return out;
}

export async function exportSlot(slot = activeSlot) {
  await flushAutosave();
  const auto = await readRecord(slotKey(slot));
  if (!auto?.state) return null;
  const snapshots = [];
  for (let i = 1; i <= 3; i++) snapshots.push(await readRecord(snapshotKey(slot, i)));
  return { format: 'yqh-slot-v3', version: 3, exportedAt: Date.now(), slot, auto, snapshots };
}

export async function importIntoSlot(data, slot = activeSlot) {
  let auto = null, snapshots = [];
  if (data?.format === 'yqh-slot-v3' && data.auto?.state) {
    auto = { ...data.auto, kind: 'imported', updatedAt: Date.now() };
    snapshots = Array.isArray(data.snapshots) ? data.snapshots.slice(0, 3) : [];
  } else if (data && typeof data === 'object' && Number.isFinite(Number(data.raidNo))) {
    auto = bundle(data, 'legacy-import');
  }
  if (!auto) throw new Error('存档文件格式不受支持');
  await writeRecord(slotKey(slot), auto);
  for (let i = 1; i <= 3; i++) {
    const row = snapshots[i - 1];
    if (row?.state) await writeRecord(snapshotKey(slot, i), row);
    else await removeRecord(snapshotKey(slot, i));
  }
  setActiveSlot(slot);
  return clone(auto.state);
}
