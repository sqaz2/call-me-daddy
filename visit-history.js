(() => {
  'use strict';
  if (window.CMDVisitHistory) return;
  const KEY = 'cmd:site-visit:v1';
  const GAP = 30 * 60 * 1000;
  let host = window;
  try { if (window.top.location.origin === location.origin) host = window.top; } catch {}
  let api = host.CMDVisitHistory;
  if (!api) {
    let memory = null;
    const valid = (value, now) => value?.version === 1 &&
      Number.isFinite(value.startedAt) && value.startedAt > 0 &&
      Number.isFinite(value.lastSeen) && value.lastSeen >= value.startedAt && value.lastSeen <= now &&
      (value.previousAt === null || (Number.isFinite(value.previousAt) && value.previousAt > 0 && value.previousAt <= value.startedAt));
    const read = now => {
      let saved;
      try { saved = JSON.parse(host.localStorage.getItem(KEY) || 'null'); } catch {}
      return [saved, memory].filter(item => valid(item, now)).sort((a, b) => b.lastSeen - a.lastSeen)[0] || null;
    };
    const touch = () => {
      const now = Date.now(), previous = read(now);
      memory = previous && now - previous.lastSeen <= GAP
        ? { ...previous, lastSeen: now }
        : { version: 1, startedAt: now, lastSeen: now, previousAt: previous?.lastSeen || null };
      // Keep one fixed previous-visit boundary while navigating or reloading.
      try { host.localStorage.setItem(KEY, JSON.stringify(memory)); } catch {}
      return { ...memory };
    };
    api = { storageKey: KEY, idleGap: GAP, touch, current: () => ({ ...memory }) };
    host.CMDVisitHistory = api;
  }
  window.CMDVisitHistory = api;
  api.touch();
  let lastActivity = 0;
  const activity = () => {
    const now = Date.now();
    if (now - lastActivity < 10000) return;
    lastActivity = now;
    api.touch();
  };
  document.addEventListener('pointerdown', activity, { passive: true, capture: true });
  document.addEventListener('keydown', activity, { passive: true, capture: true });
  window.addEventListener('pageshow', () => api.touch());
  window.addEventListener('pagehide', () => api.touch());
})();
