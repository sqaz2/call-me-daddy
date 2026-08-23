/*
  Archived poll engine from the Armando experiment.
  Intentionally NOT loaded by the current public page.
  Keep this for a future release where audience voting adds value again.

  Expected markup:
    [data-vote-group="group-name"] button[data-vote-value="..."]
    #voteSummary
    #shareVote

  Usage later:
    ArmandoVoteArchive.mount({
      storageKey: 'cmd-release-vote-v1',
      requiredGroups: ['instrumental', 'direction'],
      shareTitle: 'MusicSubject vote'
    });
*/
window.ArmandoVoteArchive = (() => {
  const read = key => {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch { return {}; }
  };

  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  };

  function mount({
    storageKey = 'cmd-release-vote',
    requiredGroups = [],
    shareTitle = document.title
  } = {}) {
    const state = read(storageKey);
    const summary = document.getElementById('voteSummary');
    const share = document.getElementById('shareVote');
    const groups = [...document.querySelectorAll('[data-vote-group]')];

    const refresh = () => {
      groups.forEach(group => {
        const name = group.dataset.voteGroup;
        group.querySelectorAll('[data-vote-value]').forEach(button => {
          button.classList.toggle('selected', state[name] === button.dataset.voteValue);
          button.setAttribute('aria-pressed', state[name] === button.dataset.voteValue ? 'true' : 'false');
        });
      });

      const complete = requiredGroups.every(name => state[name]);
      if (share) share.disabled = !complete;
      if (summary) {
        const chosen = requiredGroups.filter(name => state[name]).map(name => state[name]);
        summary.textContent = complete ? chosen.join(' · ') : 'Pick one from each question.';
      }
      write(storageKey, state);
    };

    groups.forEach(group => {
      const name = group.dataset.voteGroup;
      group.querySelectorAll('[data-vote-value]').forEach(button => {
        button.addEventListener('click', () => {
          state[name] = button.dataset.voteValue;
          refresh();
        });
      });
    });

    share?.addEventListener('click', async () => {
      if (!requiredGroups.every(name => state[name])) return;
      const text = requiredGroups.map(name => `${name}: ${state[name]}`).join('\n');
      const payload = { title: shareTitle, text, url: location.href };
      try {
        if (navigator.share) await navigator.share(payload);
        else await navigator.clipboard.writeText(`${text}\n${location.href}`);
      } catch {}
    });

    refresh();
    return { state, refresh };
  }

  return { mount };
})();
