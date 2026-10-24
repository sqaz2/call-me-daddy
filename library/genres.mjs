// Browsing families and parent tags, shared by the catalogue and interface.
export const GENRE_FAMILIES=[
 {id:'hiphop',label:'Hip-hop & rap',genres:['hiphop','trap','boom-bap']},
 {id:'electronic',label:'Electronic & dance',genres:['edm','dubstep','techno','house','bass-house','dnb','trance','glitch-hop']},
 {id:'rock',label:'Rock & blues',genres:['rock','metal','blues']},
 {id:'pop',label:'Pop',genres:['pop']},
 {id:'soul',label:'Soul, funk & disco',genres:['rnb','funk','disco']},
 {id:'country',label:'Country',genres:['country']},
 {id:'reggae',label:'Reggae & ska',genres:['reggae','ska']},
 {id:'gospel',label:'Gospel',genres:['gospel']},
 {id:'score',label:'Scores & orchestral',genres:['orchestral','chamber','neoclassical','soundtrack']},
 {id:'format',label:'Vocal & instrumental formats',genres:['spoken','instrumental']}
];
export const GENRE_PARENTS={trap:['hiphop'],'boom-bap':['hiphop'],dubstep:['edm'],techno:['edm'],house:['edm'],'bass-house':['house','edm'],dnb:['edm'],trance:['edm'],'glitch-hop':['edm','hiphop'],metal:['rock']};
export function expandGenreFamilies(ids){
 const result=new Set(ids);
 for(const id of result)for(const parent of GENRE_PARENTS[id]||[])result.add(parent);
 return [...result];
}
export function genreLabels(track,groups){
 return (track.genres||[]).map(id=>groups.find(g=>g.id===id)?.label||id).join(' / ')||'Genre to review';
}
