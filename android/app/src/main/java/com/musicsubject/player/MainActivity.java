package com.musicsubject.player;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.WindowInsets;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;
import android.widget.FrameLayout;
import androidx.media3.common.C;
import androidx.media3.common.Player;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.google.common.util.concurrent.ListenableFuture;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Collections;

public class MainActivity extends ComponentActivity {
    private WebView web;
    private MediaController controller;
    private ListenableFuture<MediaController> future;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private boolean visible=false;
    private final Player.Listener listener=new Player.Listener() {
        @Override public void onEvents(Player p,Player.Events e) { publish(); }
    };
    private final Runnable tick=new Runnable() { public void run() { if(visible) { publish(); handler.postDelayed(this,500); } } };
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            TextView text=new TextView(this); text.setText("Please update Android System WebView in Google Play, then reopen MusicSubject.");
            text.setTextColor(Color.WHITE); text.setPadding(28,64,28,28); setContentView(text); return;
        }
        web=new WebView(this); web.setBackgroundColor(Color.rgb(8,8,8));
        FrameLayout content=new FrameLayout(this); content.addView(web,new FrameLayout.LayoutParams(-1,-1)); setContentView(content);
        getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() { handleBack(); }
        });
        if(android.os.Build.VERSION.SDK_INT>=30) content.setOnApplyWindowInsetsListener((view,insets)->{
            var bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()|WindowInsets.Type.ime());
            view.setPadding(bars.left,bars.top,bars.right,bars.bottom); return WindowInsets.CONSUMED;
        });
        WebSettings settings=web.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        var assets=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request) { return assets.shouldInterceptRequest(request.getUrl()); }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) {
                Uri u=request.getUrl();
                if("https".equals(u.getScheme()) && "appassets.androidplatform.net".equals(u.getHost())) return false;
                openLink(u.toString()); return true;
            }
            @Override public void onPageFinished(WebView view,String url) { publish(); }
        });
        if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) WebViewCompat.addWebMessageListener(web,"MusicSubjectNative",Collections.singleton("https://appassets.androidplatform.net"),
            (view,message,origin,isMainFrame,reply)->{
                if(!isMainFrame) return;
                String data=message.getData();
                if(data==null || data.length()>1024*1024) return;
                handler.post(()->command(data));
            });
        future=new MediaController.Builder(this,new SessionToken(this,new ComponentName(this,PlaybackService.class))).buildAsync();
        future.addListener(()->{
            try { controller=future.get(); controller.addListener(listener); publish(); }
            catch(Exception e) { error("The music player could not start. Close and reopen the app."); }
        },command -> handler.post(command));
        web.loadUrl("https://appassets.androidplatform.net/assets/index.html");
    }
    private void command(String value) {
        try {
            JSONObject msg=new JSONObject(value);
            String type=msg.optString("type");
            if(type.equals("open")) { openLink(msg.optString("url")); return; }
            if(type.equals("share")) {
                String url=msg.optString("url"); if(!TrackCodec.siteUrl(url)) return;
                startActivity(Intent.createChooser(new Intent(Intent.ACTION_SEND).setType("text/plain")
                    .putExtra(Intent.EXTRA_TEXT,msg.optString("title")+"\n"+url),"Share song")); return;
            }
            if(controller==null && type.equals("ready")) return;
            if(controller==null) { error("Player is connecting. Tap play again in a moment."); return; }
            switch(type) {
                case "ready": publish(); break;
                case "play": {
                    var items=TrackCodec.decode(msg.getJSONArray("queue"));
                    int index=msg.optInt("index",0);
                    if(index<0 || index>=items.size()) throw new IllegalArgumentException();
                    controller.setMediaItems(items,index,0); controller.prepare(); controller.play(); break;
                }
                case "toggle":
                    if(controller.getPlayWhenReady() && controller.getPlayerError()==null && controller.getPlaybackState()!=Player.STATE_ENDED) controller.pause();
                    else { if(controller.getPlaybackState()==Player.STATE_IDLE || controller.getPlayerError()!=null) controller.prepare();
                        if(controller.getPlaybackState()==Player.STATE_ENDED) controller.seekToDefaultPosition(0); controller.play(); }
                    break;
                case "pause": controller.pause(); break;
                case "next": if(controller.hasNextMediaItem()) controller.seekToNextMediaItem(); break;
                case "previous": if(controller.getCurrentPosition()>5000) controller.seekTo(0);
                    else if(controller.hasPreviousMediaItem()) controller.seekToPreviousMediaItem(); else controller.seekTo(0); break;
                case "seek": { long duration=controller.getDuration();
                    if(duration!=C.TIME_UNSET) controller.seekTo(Math.max(0,Math.min(duration,(long)(msg.optDouble("seconds",0)*1000)))); break; }
                case "jump": { int index=msg.optInt("index",-1); if(index>=0 && index<controller.getMediaItemCount()) { controller.seekToDefaultPosition(index); controller.prepare(); controller.play(); } break; }
                default: return;
            }
            publish();
        } catch(Exception e) { error("That recording could not be loaded. Refresh the songs and try again."); }
    }
    private void openLink(String value) {
        Uri url=Uri.parse(value);
        if(!"https".equals(url.getScheme()) || url.getHost()==null || url.getUserInfo()!=null) return;
        // External pages never receive the app's native bridge or private local storage.
        // Keep native audio until the user deliberately starts another audio app.
        try { startActivity(new Intent(Intent.ACTION_VIEW,url).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch(Exception ignored) { error("No browser was found to open this page."); }
    }
    private void error(String message) {
        if(web!=null) web.evaluateJavascript("window.showError?.("+JSONObject.quote(message)+")",null);
    }
    private void publish() {
        if(web==null || controller==null || !visible) return;
        try {
            JSONArray queue=new JSONArray(); for(int i=0;i<controller.getMediaItemCount();i++) queue.put(TrackCodec.encode(controller.getMediaItemAt(i)));
            long duration=controller.getDuration();
            JSONObject state=new JSONObject().put("connected",true).put("track",TrackCodec.encode(controller.getCurrentMediaItem()))
                .put("playing",controller.isPlaying()).put("wantsPlayback",controller.getPlayWhenReady())
                .put("buffering",controller.getPlaybackState()==Player.STATE_BUFFERING)
                .put("ended",controller.getPlaybackState()==Player.STATE_ENDED)
                .put("position",controller.getCurrentPosition()/1000.0).put("duration",duration==C.TIME_UNSET?0:duration/1000.0)
                .put("index",controller.getCurrentMediaItemIndex()).put("queue",queue)
                .put("error",controller.getPlayerError()==null?"":"Playback interrupted. Check your connection, then tap Retry or choose another song.");
            web.evaluateJavascript("window.receivePlayback?.("+state+")",null);
        } catch(Exception ignored) {}
    }
    @Override protected void onResume() {
        super.onResume(); visible=true; handler.removeCallbacks(tick); handler.post(tick);
        if(web!=null) { web.onResume(); web.evaluateJavascript("window.refreshIfStale?.()",null); }
    }
    @Override protected void onPause() { visible=false; handler.removeCallbacks(tick); if(web!=null) web.onPause(); super.onPause(); }
    private void handleBack() {
        if(web!=null) web.evaluateJavascript("window.closePanel?.()", result->{ if(!"true".equals(result)) moveTaskToBack(true); });
        else moveTaskToBack(true);
    }
    @Override protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if(controller!=null) controller.removeListener(listener);
        if(future!=null) MediaController.releaseFuture(future);
        if(web!=null) { web.destroy(); web=null; }
        super.onDestroy();
    }
}
