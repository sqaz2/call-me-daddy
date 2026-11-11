// Beats are deliberately tagged recordings, never a guess from a song title.
export function hipHopBeats(songs = []) {
  return songs.flatMap(song => (song.variants || []).flatMap(variant => {
    if (variant.collection !== 'hip-hop-beats' || !variant.audio) return [];
    const experience = `/beats/?song=${encodeURIComponent(song.id)}&version=${encodeURIComponent(variant.id)}`;
    return [{ ...song, ...variant, id: `${song.id}:${variant.id}`, songId: song.id,
      variantId: variant.id, variantLabel: variant.label, variantCount: song.variants.length,
      title: song.title, cover: variant.cover || song.cover, experience, shareUrl: experience }];
  })).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || a.title.localeCompare(b.title));
}
