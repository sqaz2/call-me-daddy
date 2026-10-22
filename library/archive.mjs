// Existing published music from old-files-new-tools/index.html. No new audio.
// Source/rough recordings are available on request and excluded from autoplay.
export const ARCHIVE_SONGS=[
 {id:'archive-nuride-away',title:'nuRide Away',artist:'MusicSubject',project:'Old Files / New Tools',year:2026,month:8,kind:'Archive song',description:'An old vocal recording revisited in two 2026 AI-assisted reworks. Ride away. See another side.',cover:'/media/archive/old-files-new-tools/nuride-away/art/nuride-shark.webp',discoveryMoods:['curious'],openerPolicy:{defaultVersion:'heavyweight-dubstep',eligibleVersions:['heavyweight-dubstep','vocal-fix']},variants:[
  {id:'heavyweight-dubstep',label:'Heavyweight Dubstep Mix',audio:'/media/archive/old-files-new-tools/nuride-away/2026/heavyweight-dubstep-mix.mp3'},
  {id:'vocal-fix',label:'Vocal Fix Cut',audio:'/media/archive/old-files-new-tools/nuride-away/2026/vocal-fix-cut.mp3',cover:'/media/archive/old-files-new-tools/nuride-away/art/nuride-car.webp'},
  {id:'source-vocals',label:'Original vocal source · archive',audio:'/media/archive/old-files-new-tools/nuride-away/archive/vocals.mp3',productionNote:'Original vocal source; later versions are AI-assisted'}
 ]},
 {id:'archive-crocodile-shoes',title:'Crocodile Shoes',artist:'MusicSubject',project:'Old Files / New Tools',year:2026,month:8,kind:'Archive song',aliases:['Round the Bend'],description:'Round the Bend became Crocodile Shoes. The old idea returns in 2026 AI-assisted reworks; the warehouse version is described as swagger and movement in a darker room.',cover:'/media/archive/old-files-new-tools/crocodile-shoes/art/crocodile-shoes.webp',discoveryMoods:['reflective'],openerPolicy:{defaultVersion:'warehouse',eligibleVersions:['warehouse','2015-special-2026']},variants:[
  {id:'warehouse',label:'Late-Night Warehouse Dub Remix',audio:'/media/archive/old-files-new-tools/crocodile-shoes/2026/late-night-warehouse-dub-remix.mp3'},
  {id:'2015-special-2026',label:'2015 Special / 2026 Remix',audio:'/media/archive/old-files-new-tools/crocodile-shoes/2026/2015-special-2026-remix.mp3'},
  {id:'rough-copy',label:'Round the Bend · rough copy',audio:'/media/archive/old-files-new-tools/crocodile-shoes/archive/round-the-bend-roughcopy.mp3',productionNote:'Archive rough copy; production method not fully documented for this file'}
 ]}
];
// Published external versions already linked from archive/i-need-love/index.html.
export const ARCHIVE_VARIANTS={'i-need-love':[
 {id:'2024-reimagined',label:'We Fall in Love Too Quickly · 2024 AI reimagining',external:true,platform:'SoundCloud',externalUrl:'https://m.soundcloud.com/will-crowell/we-fall-in-love-too-quickly-2024-reimagined-with-ai'},
 {id:'earlier-ska-punk',label:'Earlier Ska Punk',external:true,platform:'Suno',externalUrl:'https://suno.com/s/UvNslBjOSmZlYvMM'}
]};
