(()=>{
  const fallbackCover='/media/site/image-coming-soon.jpg';
  window.CMD_ARTWORK={...(window.CMD_ARTWORK||{}),fallbackCover};

  const songs=Array.isArray(window.CMD_SONGS)?window.CMD_SONGS:[];
  songs.forEach(song=>{
    if(!song||song.cover)return;
    song.cover=fallbackCover;
    song.coverIsFallback=true;
  });

  const entries=window.CMD_BRIEFING?.entries;
  if(Array.isArray(entries)){
    const bySongId=new Map(songs.map(song=>[song.id,song]));
    entries.forEach(entry=>{
      if(entry?.cover||!entry?.songId)return;
      const song=bySongId.get(entry.songId);
      if(song?.cover)entry.cover=song.cover;
    });
  }
})();
