package com.musicsubject.player;

import android.app.PendingIntent;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;
import org.json.JSONArray;
import org.json.JSONObject;

@androidx.annotation.OptIn(markerClass = UnstableApi.class)
public class PlaybackService extends MediaSessionService {
    private MediaSession session;
    private ExoPlayer player;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final Runnable saveLoop=new Runnable() { public void run() { save(); handler.postDelayed(this,5000); } };
    @Override public void onCreate() {
        super.onCreate();
        player=new ExoPlayer.Builder(this).build();
        player.setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(),true);
        player.setHandleAudioBecomingNoisy(true);
        player.setWakeMode(C.WAKE_MODE_NETWORK);
        PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        session=new MediaSession.Builder(this,player).setSessionActivity(open).setCallback(new MediaSession.Callback() {
            @Override public MediaSession.ConnectionResult onConnect(MediaSession s,MediaSession.ControllerInfo c) {
                if (!getPackageName().equals(c.getPackageName()) && !c.isTrusted())
                    return MediaSession.ConnectionResult.reject();
                return MediaSession.Callback.super.onConnect(s,c);
            }
        }).build();
        restore();
        player.addListener(new Player.Listener() {
            @Override public void onEvents(Player p,Player.Events events) { save(); }
        });
        handler.postDelayed(saveLoop,5000);
    }
    @Override public MediaSession onGetSession(MediaSession.ControllerInfo info) { return session; }
    private void save() {
        if(player == null || player.getMediaItemCount() == 0) return;
        try {
            JSONArray queue=new JSONArray();
            for(int i=0;i<player.getMediaItemCount();i++) queue.put(TrackCodec.encode(player.getMediaItemAt(i)));
            JSONObject value=new JSONObject().put("queue",queue).put("index",player.getCurrentMediaItemIndex())
                .put("position",player.getCurrentPosition());
            getSharedPreferences("playback",MODE_PRIVATE).edit().putString("session",value.toString()).apply();
        } catch(Exception ignored) {}
    }
    private void restore() {
        try {
            JSONObject value=new JSONObject(getSharedPreferences("playback",MODE_PRIVATE).getString("session","{}"));
            var items=TrackCodec.decode(value.getJSONArray("queue"));
            int index=Math.max(0,Math.min(items.size()-1,value.optInt("index")));
            player.setMediaItems(items,index,Math.max(0,value.optLong("position")));
            // Restore the queue and position without surprising the user with autoplay.
        } catch(Exception ignored) {}
    }
    @Override public void onTaskRemoved(Intent rootIntent) {
        save();
        if(!player.getPlayWhenReady() || player.getMediaItemCount()==0 || player.getPlaybackState()==Player.STATE_ENDED) stopSelf();
    }
    @Override public void onDestroy() {
        handler.removeCallbacksAndMessages(null); save();
        if(session!=null) session.release();
        if(player!=null) player.release();
        super.onDestroy();
    }
}
