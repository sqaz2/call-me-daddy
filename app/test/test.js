(() => {
  'use strict';
  const button = document.querySelector('[data-share-test]');
  const status = document.querySelector('[data-share-status]');
  if (!button || !status) return;
  const url = 'https://callmedaddy.musicsubject.com/app/test/';
  button.hidden = false;
  button.addEventListener('click', async () => {
    status.textContent = '';
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Help test MusicSubject', text: 'Join the MusicSubject Android tester group and help bring Call Me Daddy’s music to Google Play.', url });
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = 'Link copied. Thanks for passing it on.';
    } catch {
      status.textContent = `Share this address: ${url}`;
    }
  });
})();
