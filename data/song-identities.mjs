// Artist-confirmed song families. Historical IDs retain the exact recording.
export const SONG_REDIRECTS={armando:{songId:'did-armando-die-after-you-held-his-beer',variantId:'earlier'}};
export function canonicalRecording(songId,variantId='main'){
 return Object.hasOwn(SONG_REDIRECTS,songId)?SONG_REDIRECTS[songId]:{songId,variantId};
}
