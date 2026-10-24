// Availability describes documented files, not rights clearance or a promise to create them.
export const DELIVERY_REQUESTS=[
 {id:'clean',label:'Reviewed clean edit'},
 {id:'instrumental',label:'Instrumental version'},
 {id:'wav',label:'Original WAV master'},
 {id:'stems',label:'Separate stems / multitracks'}
];
export function deliveryFacts(track){
 const local=!!track.audio&&!track.external;
 return [
  ['Listening file',local?`${track.facts?.format||'Audio'} preview available`:'External listening link'],
  ['Clean edit','Not confirmed — ask for a reviewed clean edit'],
  ['Instrumental',track.vocals==='instrumental'?'This recording is identified as instrumental':'Separate instrumental not confirmed — ask about availability'],
  ['Original WAV master','Not confirmed — ask about source master availability'],
  ['Stems / multitracks','Not confirmed — ask about availability']
 ];
}
export function deliverySummary(track){
 return track.vocals==='instrumental'?'Instrumental identified · Clean edit, WAV & stems: ask':'Clean edit, instrumental, WAV & stems: ask';
}
export function requestedDeliverables(ids=[]){
 return DELIVERY_REQUESTS.filter(x=>ids.includes(x.id)).map(x=>x.label);
}
