window.CMD_RADIO_CONFIG = {
  version: 1,
  defaultIntent: 'surprise',
  intents: [
    {
      id: 'surprise',
      label: 'Play the site',
      kicker: 'Controlled chaos',
      description: 'The whole catalog, weighted toward fresh turns, clean variety and things you have not just heard.',
      shareText: 'Press play and let Call Me Daddy decide what happens next.'
    },
    {
      id: 'laugh',
      label: 'Make me laugh',
      kicker: 'Bad decisions · good bass',
      description: 'Comedy, satire, shock-value punchlines and songs that should not work nearly this well.',
      shareText: 'I told Call Me Daddy to make me laugh. This is the station it built.'
    },
    {
      id: 'think',
      label: 'Make me think',
      kicker: 'Meaning under the noise',
      description: 'Ideas, contradictions, creative process and songs that change depending on what plays beside them.',
      shareText: 'I told Call Me Daddy to make me think. This is the route it built.'
    },
    {
      id: 'level-up',
      label: 'Level me up',
      kicker: 'Forward pressure',
      description: 'Adaptation, survival, better people and enough momentum to move instead of shrinking.',
      shareText: 'I told Call Me Daddy to level me up. This is the route it built.'
    },
    {
      id: 'heavy',
      label: 'Give me heavy',
      kicker: 'No fake sunshine',
      description: 'Confinement, pressure, grief, numbness and the records that pushed back instead of pretending.',
      shareText: 'I asked Call Me Daddy for something heavy. This is the route it built.'
    },
    {
      id: 'old-files',
      label: 'Show old files',
      kicker: 'Receipts from before',
      description: 'Older writing, resurfaced recordings and the new versions that grew out of them.',
      shareText: 'I asked Call Me Daddy to open the old files. This is the route it built.'
    }
  ],
  settings: {
    recentWindow: 8,
    sameProjectPenalty: 0.34,
    immediateRepeatPenalty: 0.025,
    historyFloor: 0.16,
    recencyWindowDays: 730,
    recencyBoost: {
      surprise: 0.72,
      laugh: 0.34,
      think: 0.18,
      'level-up': 0.24,
      heavy: 0.12,
      'old-files': -0.18
    }
  },
  profiles: {
    armando:                         {surprise: 88, laugh: 100, think: 30, 'level-up': 28, heavy: 18, 'old-files': 24},
    'id-pick-you-first':             {surprise: 84, laugh: 96,  think: 52, 'level-up': 58, heavy: 28, 'old-files': 30},
    'did-armando-die-after-you-held-his-beer':
                                     {surprise: 96, laugh: 100, think: 34, 'level-up': 30, heavy: 20, 'old-files': 20},
    'level-up':                      {surprise: 82, laugh: 42,  think: 88, 'level-up': 100,heavy: 38, 'old-files': 24},
    'back-to-sticks':                {surprise: 78, laugh: 88,  think: 94, 'level-up': 78, heavy: 38, 'old-files': 34},
    'the-musician-police':           {surprise: 76, laugh: 98,  think: 86, 'level-up': 74, heavy: 26, 'old-files': 32},
    'funhouse-meltdown':             {surprise: 86, laugh: 92,  think: 62, 'level-up': 42, heavy: 44, 'old-files': 28},
    'youtube-W47ebCMfrBI':           {surprise: 58, laugh: 54,  think: 48, 'level-up': 48, heavy: 42, 'old-files': 34},
    'namaste-hamster':               {surprise: 84, laugh: 96,  think: 56, 'level-up': 64, heavy: 30, 'old-files': 22},
    'i-wont-let-the-wifi-go':        {surprise: 66, laugh: 76,  think: 58, 'level-up': 54, heavy: 40, 'old-files': 88},
    'find-your-people':              {surprise: 78, laugh: 24,  think: 94, 'level-up': 98, heavy: 46, 'old-files': 28},
    'hell-has-people-too':           {surprise: 76, laugh: 38,  think: 98, 'level-up': 62, heavy: 92, 'old-files': 28},
    'cut-from-the-same-fabric-instrumental':
                                     {surprise: 70, laugh: 24,  think: 94, 'level-up': 68, heavy: 72, 'old-files': 30},
    'locked-in-these-walls':         {surprise: 58, laugh: 8,   think: 72, 'level-up': 50, heavy: 100,'old-files': 72},
    'under-watch':                   {surprise: 58, laugh: 8,   think: 72, 'level-up': 46, heavy: 100,'old-files': 68},
    'seven-days-locked':             {surprise: 56, laugh: 8,   think: 74, 'level-up': 46, heavy: 100,'old-files': 72},
    'stomp-clamp':                   {surprise: 68, laugh: 42,  think: 76, 'level-up': 88, heavy: 72, 'old-files': 46},
    'broke-my-mug-not-my-song':      {surprise: 72, laugh: 78,  think: 58, 'level-up': 70, heavy: 64, 'old-files': 46},
    'friction-the-what':             {surprise: 64, laugh: 68,  think: 82, 'level-up': 56, heavy: 82, 'old-files': 48},
    'couple-friends-couple-calls':   {surprise: 58, laugh: 24,  think: 78, 'level-up': 46, heavy: 78, 'old-files': 56},
    'i-need-love':                   {surprise: 76, laugh: 42,  think: 82, 'level-up': 64, heavy: 80, 'old-files': 100},
    'numbness-as-a-trap':            {surprise: 56, laugh: 6,   think: 86, 'level-up': 48, heavy: 100,'old-files': 48},
    'everybody-else-less':           {surprise: 64, laugh: 58,  think: 82, 'level-up': 50, heavy: 82, 'old-files': 44},
    'never-come-back-down':          {surprise: 54, laugh: 6,   think: 78, 'level-up': 42, heavy: 98, 'old-files': 46},
    'will-to-live':                  {surprise: 72, laugh: 12,  think: 84, 'level-up': 100,heavy: 92, 'old-files': 52},
    '2010-wows':                     {surprise: 76, laugh: 44,  think: 90, 'level-up': 84, heavy: 70, 'old-files': 100}
  },
  sequences: [
    {
      id: 'new-tools-rise',
      intents: ['level-up'],
      tracks: ['back-to-sticks', 'the-musician-police', 'level-up'],
      placement: 'start',
      chance: 1
    },
    {
      id: 'same-fabric-rise',
      intents: ['think'],
      tracks: ['hell-has-people-too', 'cut-from-the-same-fabric-instrumental', 'find-your-people'],
      placement: 'start',
      chance: 1
    },
    {
      id: 'pressure-to-pushback',
      intents: ['heavy'],
      tracks: ['never-come-back-down', 'numbness-as-a-trap', 'will-to-live'],
      placement: 'start',
      chance: 1
    },
    {
      id: 'memory-files',
      intents: ['old-files'],
      tracks: ['2010-wows', 'i-need-love', 'i-wont-let-the-wifi-go'],
      placement: 'start',
      chance: 1
    }
  ]
};
/* RELEASE-MANIFEST:RADIO:START */
Object.assign(window.CMD_RADIO_CONFIG.profiles, {
  "twas-the-tism-mlord": {
    "surprise": 100,
    "laugh": 94,
    "think": 68,
    "level-up": 54,
    "heavy": 88,
    "old-files": 4
  }
});
/* RELEASE-MANIFEST:RADIO:END */
