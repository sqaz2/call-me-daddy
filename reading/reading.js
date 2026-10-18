(() => {
  'use strict';
  const tools = document.querySelector('[data-reading-tools]');
  if (!tools) return;
  const sizes = [...document.querySelectorAll('[data-text-size]')];
  const status = document.querySelector('[data-reading-status]');
  const shareButton = document.querySelector('[data-share-article]');
  const copyPanel = document.querySelector('[data-reading-copy]');
  const copyField = copyPanel.querySelector('input');
  const storageKey = 'cmd:reading:text-size:v1';
  const setSize = size => {
    const selected = size === 'large' ? 'large' : 'normal';
    document.body.dataset.readingSize = selected;
    sizes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.textSize === selected)));
    return selected;
  };
  try { setSize(localStorage.getItem(storageKey)); } catch { setSize('normal'); }
  sizes.forEach(button => button.addEventListener('click', () => {
    const selected = setSize(button.dataset.textSize);
    try { localStorage.setItem(storageKey, selected); } catch { /* Reading works without storage. */ }
    status.textContent = selected === 'large' ? 'Larger article text.' : 'Standard article text.';
  }));
  const selectLink = () => {
    copyField.focus();
    copyField.select();
    copyField.setSelectionRange?.(0, copyField.value.length);
  };
  copyField.addEventListener('click', selectLink);
  let sharing = false;
  shareButton.addEventListener('click', async () => {
    if (sharing) return;
    sharing = true;
    status.textContent = '';
    copyPanel.hidden = true;
    const url = document.querySelector('link[rel="canonical"]').href;
    const title = document.getElementById('article-title').textContent;
    try {
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title, text: 'Recordings, generated audio, and the limits of a detector score.', url });
          return;
        } catch (error) {
          if (error.name === 'AbortError') return;
        }
      }
      try {
        if (typeof navigator.clipboard?.writeText !== 'function') throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(url);
        status.textContent = 'Article link copied. Paste it into a message or post.';
      } catch {
        copyField.value = url;
        copyPanel.hidden = false;
        selectLink();
        status.textContent = 'Select the article link and copy it.';
      }
    } finally { sharing = false; }
  });
  tools.hidden = false;
})();
