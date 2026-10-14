package com.musicsubject.player;

import android.net.Uri;
import android.os.Bundle;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

final class TrackCodec {
    static final String SITE = "https://callmedaddy.musicsubject.com";
    static boolean siteUrl(String value) {
        Uri u = Uri.parse(value);
        return "https".equals(u.getScheme()) && "callmedaddy.musicsubject.com".equals(u.getHost())
                && u.getUserInfo() == null && (u.getPort() == -1 || u.getPort() == 443);
    }
    static List<MediaItem> decode(JSONArray tracks) throws JSONException {
        if (tracks.length() == 0 || tracks.length() > 500) throw new JSONException("Invalid queue size");
        List<MediaItem> items = new ArrayList<>();
        for (int i=0; i<tracks.length(); i++) {
            JSONObject t=tracks.getJSONObject(i);
            String audio=t.getString("audio");
            if (!siteUrl(audio)) throw new JSONException("Unsupported audio source");
            Bundle extra=new Bundle();
            extra.putString("track", t.toString());
            MediaMetadata.Builder meta=new MediaMetadata.Builder()
                .setTitle(t.optString("title", "MusicSubject"))
                .setArtist(t.optString("artist", "MusicSubject × Call Me Daddy"))
                .setAlbumTitle(t.optString("label", ""))
                .setExtras(extra);
            if(siteUrl(t.optString("cover"))) meta.setArtworkUri(Uri.parse(t.optString("cover")));
            items.add(new MediaItem.Builder().setMediaId(audio).setUri(audio).setMediaMetadata(meta.build()).build());
        }
        return items;
    }
    static JSONObject encode(MediaItem item) {
        try { if(item != null && item.mediaMetadata.extras != null)
            return new JSONObject(item.mediaMetadata.extras.getString("track", "{}"));
        } catch(Exception ignored) {}
        return new JSONObject();
    }
}
