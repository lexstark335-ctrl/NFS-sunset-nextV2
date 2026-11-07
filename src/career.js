/** 新站生涯存档：与原站位于同一 github.io 来源，因此所有键必须独立。 */
export const CAREER_KEY = 'nfs-sunset-next-v1-career';
// 原场景没有声明现实单位；本作约定 1 个道路推进单位 = 1 米游戏里程。
// 只累计 sn() 实际推进量，不从分数、HUD 速度或渲染帧数估算。
export const METERS_PER_SCENE_UNIT = 1;
const SAVE_INTERVAL_MS = 5000;

function browserStorage() {
  try { return window.localStorage; } catch { return null; }
}

export class Career {
  constructor({storage = browserStorage(), now = () => Date.now()} = {}) {
    this.storage = storage;
    this.now = now;
    this.totalMeters = 0;
    this.dirty = false;
    this.lastSave = now();
    this.storageAvailable = !!storage;
    let raw = null;
    try { raw = storage?.getItem(CAREER_KEY); } catch { this.storageAvailable = false; }
    try {
      const saved = JSON.parse(raw || 'null');
      if (saved?.version === 1 && typeof saved.totalMeters === 'number' &&
          Number.isFinite(saved.totalMeters) && saved.totalMeters >= 0 &&
          saved.totalMeters <= Number.MAX_SAFE_INTEGER) this.totalMeters = saved.totalMeters;
    } catch { /* 损坏的存档从零开始，不删除或改写其他存档。 */ }
  }

  advance(sceneUnits, state, trial) {
    if (state !== 'running' || trial || !Number.isFinite(sceneUnits) || sceneUnits <= 0) return;
    this.totalMeters = Math.min(Number.MAX_SAFE_INTEGER, this.totalMeters + sceneUnits * METERS_PER_SCENE_UNIT);
    this.dirty = true;
    // 在现有模拟循环内合并写入，不额外启动定时器，也不每帧写存档。
    if (this.now() - this.lastSave >= SAVE_INTERVAL_MS) this.checkpoint();
  }

  checkpoint() {
    if (!this.dirty) return;
    this.lastSave = this.now();
    try {
      if (!this.storage) throw new Error('Storage unavailable');
      this.storage.setItem(CAREER_KEY, JSON.stringify({version: 1, totalMeters: this.totalMeters}));
      this.dirty = false;
      this.storageAvailable = true;
    } catch { this.storageAvailable = false; }
  }

  open() {
    this.checkpoint();
    this.focusReturn = document.activeElement;
    const panel = document.getElementById('integrated-career');
    document.getElementById('career-distance').textContent = (this.totalMeters / 1000).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('career-storage-note').textContent = this.storageAvailable
      ? '正式驾驶累计 · 免费试驾不计入 · 存档保存在此浏览器'
      : '当前浏览器无法保存里程；关闭页面后本次进度可能丢失';
    document.body.classList.add('racer-career-open');
    panel.hidden = false;
    document.getElementById('integrated-career-close').focus({preventScroll: true});
  }

  close() {
    const panel = document.getElementById('integrated-career');
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    document.body.classList.remove('racer-career-open');
    this.focusReturn?.focus?.({preventScroll: true});
  }
}
