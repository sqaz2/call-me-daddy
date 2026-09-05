(() => {
  const audio = document.getElementById('songAudio');
  if (!audio || !window.CMDContinuousPlayback) return;

  const catalogSong = (window.CMD_SONGS || []).find(song => song.id === 'twas-the-tism-mlord');
  const self = catalogSong || {
    id: 'twas-the-tism-mlord',
    title: '’Twas the Tism, M’Lord',
    artist: 'MusicSubject × Call Me Daddy',
    project: '’Twas the Tism, M’Lord',
    audio: '/media/songs/2026/09/twas-the-tism-mlord/audio.mp3',
    cover: '/media/songs/2026/09/twas-the-tism-mlord/cover.jpg',
    experience: '/twas-the-tism-mlord/'
  };
  const openingTrack = { ...self, songId: self.id };
  const player = document.getElementById('tismPlayer');
  const mini = player?.querySelector('.tism-mini');
  const copy = player?.querySelector('.tism-player-copy');
  const label = copy?.querySelector('small');
  const title = copy?.querySelector('strong');
  const status = document.getElementById('playerStatus');
  const previous = document.getElementById('playerPrevious');
  const next = document.getElementById('playerNext');

  window.CMD_TISM_ENDLESS = window.CMDContinuousPlayback.create({
    id: 'twas-the-tism-endless-player',
    audio,
    tracks: [openingTrack],
    localCount: 1,
    excludeIds: [self.id],
    lastSongId: self.id,
    route: '/twas-the-tism-mlord/',
    replacePlayer: player,
    onTrack: (track, state = {}) => {
      if (state.reason !== 'ready' && player) player.hidden = false;
      if (label) label.textContent = (state.index || 0) === 0 ? 'Final glitch edit' : 'Play the site';
      if (title) title.textContent = track.title || 'Call Me Daddy';
      if (mini && track.cover) {
        mini.src = track.cover;
        mini.alt = `${track.title || 'Song'} artwork`;
      }
      if (status) status.textContent = state.reason === 'ready' ? 'Ready' : 'Loading next…';
      if (previous) previous.disabled = (state.index || 0) <= 0;
    },
    onPlayState: playing => {
      if (status) status.textContent = playing ? 'Playing' : (!audio.ended ? 'Paused' : status.textContent);
    },
    onStatus: kind => {
      if (!status) return;
      if (kind === 'waiting' || kind === 'stalled') status.textContent = 'Buffering…';
      else if (kind === 'blocked') status.textContent = 'Tap play to continue';
      else if (kind === 'error') status.textContent = 'Skipping unavailable track…';
      else if (kind === 'failed') status.textContent = 'Playback needs a tap';
    }
  });

  previous?.addEventListener('click', () => {
    if (!window.CMD_TISM_ENDLESS.previous() && status) status.textContent = 'No previous song yet';
  });
  next?.addEventListener('click', () => {
    if (!window.CMD_TISM_ENDLESS.next('button-next') && status) status.textContent = 'No next song available';
  });
})();
