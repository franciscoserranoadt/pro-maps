package com.fserrano.promaps;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Presentation;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Rect;
import android.graphics.RectF;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.car.app.AppManager;
import androidx.car.app.CarAppService;
import androidx.car.app.CarContext;
import androidx.car.app.CarToast;
import androidx.car.app.Screen;
import androidx.car.app.Session;
import androidx.car.app.SurfaceCallback;
import androidx.car.app.SurfaceContainer;
import androidx.car.app.model.Action;
import androidx.car.app.model.ActionStrip;
import androidx.car.app.model.CarColor;
import androidx.car.app.model.CarIcon;
import androidx.car.app.model.DateTimeWithZone;
import androidx.car.app.model.Distance;
import androidx.car.app.model.GridItem;
import androidx.car.app.model.GridTemplate;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.SearchTemplate;
import androidx.car.app.model.Template;
import androidx.car.app.navigation.NavigationManager;
import androidx.car.app.navigation.NavigationManagerCallback;
import androidx.car.app.navigation.model.Maneuver;
import androidx.car.app.navigation.model.MessageInfo;
import androidx.car.app.navigation.model.NavigationTemplate;
import androidx.car.app.navigation.model.RoutingInfo;
import androidx.car.app.navigation.model.Step;
import androidx.car.app.navigation.model.TravelEstimate;
import androidx.car.app.validation.HostValidator;
import androidx.core.graphics.drawable.IconCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

/**
 * Pro Maps en Android Auto. El mapa es la misma página que en el móvil, dibujada en la pantalla
 * del coche; los botones y la tarjeta de la próxima maniobra los pone Android Auto.
 */
public class CarService extends CarAppService {

    /** Mientras el coche está conectado, el móvil no habla (para no oír la voz dos veces) */
    public static volatile boolean active = false;

    @NonNull @Override
    public HostValidator createHostValidator() {
        return HostValidator.ALLOW_ALL_HOSTS_VALIDATOR;
    }

    @NonNull @Override
    public Session onCreateSession() {
        return new CarSession();
    }

    // =====================================================================

    static final class CarSession extends Session implements LocationListener {
        final Handler handler = new Handler(Looper.getMainLooper());
        final ExecutorService pool = Executors.newFixedThreadPool(4);
        static final OkHttpClient HTTP = new OkHttpClient.Builder()
                .connectTimeout(12, TimeUnit.SECONDS).readTimeout(90, TimeUnit.SECONDS).followRedirects(true).build();
        VirtualDisplay vd;
        Presentation pres;
        WebView web;
        TileCache tiles;
        TextToSpeech tts;
        boolean ttsReady;
        ToneGenerator tone;
        LocationManager lm;
        long lastGpsFix;
        float density = 1;
        Rect visible;
        MapScreen mapScreen;
        SearchScreen searchScreen;
        String pendingShare;
        // Estado de la navegación que manda la página
        JSONObject navState = new JSONObject();
        boolean navigating;

        @NonNull @Override
        public Screen onCreateScreen(@NonNull Intent intent) {
            active = true;
            getCarContext().getCarService(AppManager.class).setSurfaceCallback(surfaceCb);
            getCarContext().getCarService(NavigationManager.class).setNavigationManagerCallback(new NavigationManagerCallback() {
                @Override public void onStopNavigation() { js("window.carStop&&carStop()"); }
            });
            tts = new TextToSpeech(getCarContext(), st -> {
                if (st == TextToSpeech.SUCCESS) {
                    int r = tts.setLanguage(new Locale("es", "ES"));
                    if (r < 0) tts.setLanguage(Locale.getDefault());
                    tts.setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
                    ttsReady = true;
                }
            });
            try { tone = new ToneGenerator(AudioManager.STREAM_MUSIC, 90); } catch (Exception ignored) { }
            tiles = new TileCache(getCarContext());
            startGps();
            takeIntent(intent);
            getLifecycle().addObserver(new androidx.lifecycle.DefaultLifecycleObserver() {
                @Override public void onDestroy(@NonNull androidx.lifecycle.LifecycleOwner o) { shutdown(); }
            });
            mapScreen = new MapScreen(getCarContext(), this);
            return mapScreen;
        }

        @Override
        public void onNewIntent(@NonNull Intent intent) { takeIntent(intent); }

        /** «Navegar a…» desde el asistente o desde otra app */
        void takeIntent(Intent i) {
            if (i == null || i.getData() == null) return;
            String d = i.getData().toString();
            if (web != null) js("window.onShared&&onShared(" + JSONObject.quote(d) + ")");
            else pendingShare = d;
        }

        void shutdown() {
            active = false;
            try { lm.removeUpdates(this); } catch (Exception ignored) { }
            releaseSurface();
            try { if (tts != null) tts.shutdown(); } catch (Exception ignored) { }
            try { if (tone != null) tone.release(); } catch (Exception ignored) { }
            pool.shutdownNow();
        }

        // ---------------- Pantalla del coche ----------------

        final SurfaceCallback surfaceCb = new SurfaceCallback() {
            @Override public void onSurfaceAvailable(@NonNull SurfaceContainer sc) {
                if (sc.getSurface() == null) return;
                density = Math.max(1f, sc.getDpi() / 160f);
                if (vd != null) {
                    vd.setSurface(sc.getSurface());
                    vd.resize(sc.getWidth(), sc.getHeight(), sc.getDpi());
                    return;
                }
                makeDisplay(sc);
            }
            @Override public void onVisibleAreaChanged(@NonNull Rect r) { visible = r; sendArea(); }
            @Override public void onStableAreaChanged(@NonNull Rect r) { }
            @Override public void onSurfaceDestroyed(@NonNull SurfaceContainer sc) { releaseSurface(); }
            @Override public void onScroll(float dx, float dy) { js("window.carPan&&carPan(" + (dx / density) + "," + (dy / density) + ")"); }
            @Override public void onFling(float vx, float vy) { }
            @Override public void onScale(float fx, float fy, float f) {
                js("window.carScale&&carScale(" + (fx / density) + "," + (fy / density) + "," + f + ")");
            }
        };

        @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
        void makeDisplay(SurfaceContainer sc) {
            try {
                DisplayManager dm = getCarContext().getSystemService(DisplayManager.class);
                vd = dm.createVirtualDisplay("ProMapsCoche", sc.getWidth(), sc.getHeight(), sc.getDpi(), sc.getSurface(),
                        DisplayManager.VIRTUAL_DISPLAY_FLAG_OWN_CONTENT_ONLY);
                pres = new Presentation(getCarContext(), vd.getDisplay());
                web = new WebView(pres.getContext());
                web.setBackgroundColor(0xFF0E1A2B);
                WebSettings s = web.getSettings();
                s.setJavaScriptEnabled(true);
                s.setDomStorageEnabled(true);
                s.setDatabaseEnabled(true);
                s.setAllowFileAccess(true);
                s.setMediaPlaybackRequiresUserGesture(false);
                s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                web.setWebViewClient(new WebViewClient() {
                    @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
                        String url = req.getUrl().toString();
                        if ("GET".equals(req.getMethod()) && TileCache.handles(url)) {
                            WebResourceResponse r = tiles.serve(url);
                            if (r != null) return r;
                        }
                        return super.shouldInterceptRequest(v, req);
                    }
                    @Override public void onPageFinished(WebView v, String url) { sendArea(); }
                });
                web.addJavascriptInterface(new Bridge(), "Nativo");
                pres.setContentView(web);
                pres.show();
                web.loadUrl("file:///android_asset/index.html?car=1");
            } catch (Exception e) {
                toast("No se pudo abrir el mapa en el coche: " + e.getMessage());
            }
        }

        void releaseSurface() {
            try { if (pres != null) pres.dismiss(); } catch (Exception ignored) { }
            try { if (web != null) web.destroy(); } catch (Exception ignored) { }
            try { if (vd != null) vd.release(); } catch (Exception ignored) { }
            pres = null; web = null; vd = null;
        }

        void sendArea() {
            if (web == null || vd == null || visible == null) return;
            float l = visible.left / density, t = visible.top / density;
            float r = Math.max(0, (pixW() - visible.right) / density), b = Math.max(0, (pixH() - visible.bottom) / density);
            js("window.carSetArea&&carSetArea(" + l + "," + t + "," + r + "," + b + ")");
        }
        int webW() { return web != null ? web.getWidth() : 0; }
        int pixW() { return web != null && web.getWidth() > 0 ? web.getWidth() : visible.right; }
        int pixH() { return web != null && web.getHeight() > 0 ? web.getHeight() : visible.bottom; }

        void js(String code) {
            handler.post(() -> { if (web != null) web.evaluateJavascript(code, null); });
        }

        void toast(String m) {
            handler.post(() -> { try { CarToast.makeText(getCarContext(), m, CarToast.LENGTH_LONG).show(); } catch (Exception ignored) { } });
        }

        // ---------------- GPS ----------------

        @SuppressLint("MissingPermission")
        void startGps() {
            lm = (LocationManager) getCarContext().getSystemService(CarContext.LOCATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 23 && getCarContext().checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED) {
                toast("Abre Pro Maps en el móvil y dale permiso de ubicación");
                return;
            }
            try {
                if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER))
                    lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000, 0, this, Looper.getMainLooper());
                if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER))
                    lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 4000, 0, this, Looper.getMainLooper());
            } catch (Exception e) { toast("No se pudo iniciar el GPS"); }
        }

        Location lastLoc;
        @Override public void onLocationChanged(@NonNull Location l) {
            boolean isGps = LocationManager.GPS_PROVIDER.equals(l.getProvider());
            long now = System.currentTimeMillis();
            if (isGps) lastGpsFix = now; else if (now - lastGpsFix < 10000) return;
            lastLoc = l;
            sendLoc(l, isGps);
        }
        void sendLoc(Location l, boolean isGps) {
            js("window.onGps&&window.onGps(" + l.getLatitude() + "," + l.getLongitude() + "," + (l.hasSpeed() ? l.getSpeed() : -1) + ","
                    + (l.hasBearing() ? l.getBearing() : -1) + "," + (l.hasAccuracy() ? l.getAccuracy() : 50) + "," + (isGps ? 1 : 0) + ")");
        }
        @Override public void onProviderEnabled(@NonNull String p) { }
        @Override public void onProviderDisabled(@NonNull String p) { }
        @Override public void onStatusChanged(String p, int s, Bundle b) { }

        // ---------------- Lo que pide la página ----------------

        void reply(String id, boolean ok, String body) {
            js("window.__net&&window.__net(" + JSONObject.quote(id) + "," + ok + "," + JSONObject.quote(body) + ")");
        }

        final class Bridge {
            @JavascriptInterface public void get(String id, String url) {
                pool.execute(() -> {
                    Request req = new Request.Builder().url(url).header("User-Agent", "ProMaps/" + version() + " (Android Auto)").build();
                    try (Response r = HTTP.newCall(req).execute()) {
                        String body = r.body() != null ? r.body().string() : "";
                        reply(id, r.isSuccessful(), r.isSuccessful() ? body : ("HTTP " + r.code() + " " + body));
                    } catch (Exception e) { reply(id, false, String.valueOf(e.getMessage())); }
                });
            }
            @JavascriptInterface public void post(String id, String url, String body, String headersJson) {
                pool.execute(() -> {
                    try {
                        Request.Builder b = new Request.Builder().url(url)
                                .post(okhttp3.RequestBody.create(body == null ? "" : body, okhttp3.MediaType.parse("text/plain; charset=utf-8")));
                        if (headersJson != null && !headersJson.isEmpty()) {
                            JSONObject h = new JSONObject(headersJson);
                            java.util.Iterator<String> it = h.keys();
                            while (it.hasNext()) { String k = it.next(); b.header(k, h.optString(k)); }
                        }
                        try (Response r = HTTP.newCall(b.build()).execute()) {
                            String txt = r.body() != null ? r.body().string() : "";
                            reply(id, r.isSuccessful(), r.isSuccessful() ? txt : ("HTTP " + r.code()));
                        }
                    } catch (Exception e) { reply(id, false, String.valueOf(e.getMessage())); }
                });
            }
            @JavascriptInterface public void dgt(String id) {
                pool.execute(() -> {
                    Request req = new Request.Builder().url(Dgt.URL).header("User-Agent", "ProMaps (Android)").build();
                    try (Response r = HTTP.newCall(req).execute()) {
                        if (!r.isSuccessful() || r.body() == null) { reply(id, false, "HTTP " + r.code()); return; }
                        reply(id, true, Dgt.parse(r.body().byteStream()).toString());
                    } catch (Exception e) { reply(id, false, String.valueOf(e.getMessage())); }
                });
            }
            @JavascriptInterface public void fuel(String id) {
                pool.execute(() -> {
                    String err = "sin datos";
                    for (String u : Fuel.URLS) {
                        Request req = new Request.Builder().url(u).header("Accept", "application/json").header("User-Agent", "ProMaps (Android)").build();
                        try (Response r = HTTP.newCall(req).execute()) {
                            if (!r.isSuccessful() || r.body() == null) { err = "HTTP " + r.code(); continue; }
                            JSONArray arr = Fuel.parse(r.body().byteStream());
                            if (arr.length() == 0) { err = "lista vacía"; continue; }
                            reply(id, true, arr.toString()); return;
                        } catch (Exception e) { err = String.valueOf(e.getMessage()); }
                    }
                    reply(id, false, err);
                });
            }
            @JavascriptInterface public void resolve(String id, String url) {
                pool.execute(() -> {
                    Request req = new Request.Builder().url(url).header("User-Agent", "Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile").build();
                    try (Response r = HTTP.newCall(req).execute()) {
                        String body = "";
                        try { if (r.body() != null) { body = r.body().string(); if (body.length() > 20000) body = body.substring(0, 20000); } } catch (Exception ignored) { }
                        reply(id, true, r.request().url() + "\n" + body);
                    } catch (Exception e) { reply(id, false, String.valueOf(e.getMessage())); }
                });
            }
            @JavascriptInterface public void prefetch(String id, String urls) { reply(id, true, "0/0"); }
            @JavascriptInterface public String cacheSize() { return String.valueOf(tiles.size()); }
            @JavascriptInterface public void clearCache() { }
            @JavascriptInterface public String takeShared() {
                handler.post(() -> { if (lastLoc != null) sendLoc(lastLoc, true); });
                String s = pendingShare; pendingShare = null; return s == null ? "" : s;
            }
            @JavascriptInterface public void speak(String t) { if (ttsReady) tts.speak(t, TextToSpeech.QUEUE_ADD, null, "c" + System.nanoTime()); }
            @JavascriptInterface public void speakNow(String t) { if (ttsReady) tts.speak(t, TextToSpeech.QUEUE_FLUSH, null, "c" + System.nanoTime()); }
            @JavascriptInterface public void stopSpeak() { if (ttsReady) tts.stop(); }
            @JavascriptInterface public void beep(int kind) {
                if (tone == null) return;
                try { tone.startTone(kind == 2 ? ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD : ToneGenerator.TONE_PROP_BEEP2, kind == 2 ? 600 : 250); } catch (Exception ignored) { }
            }
            @JavascriptInterface public void vibrate(int ms) { }
            @JavascriptInterface public String version() { return Updater.installedName(getCarContext()); }
            @JavascriptInterface public void checkUpdate() { }
            @JavascriptInterface public void toast(String m) { CarSession.this.toast(m); }
            @JavascriptInterface public void exit() { }
            @JavascriptInterface public void openUrl(String u) { }
            @JavascriptInterface public void share(String t, boolean w) { }
            @JavascriptInterface public void listen() { js("window.onVoiceError&&onVoiceError('Usa el micrófono de Android Auto')"); }
            @JavascriptInterface public String cameraInfo() { return "{}"; }
            @JavascriptInterface public String mediaState() { return "{\"allowed\":true}"; }
            @JavascriptInterface public void mediaCmd(String c) { }
            @JavascriptInterface public void mediaPermission() { }
            @JavascriptInterface public void appDetails() { }
            @JavascriptInterface public void openApp(String p) { }

            /** Estado de la navegación para la tarjeta de Android Auto */
            @JavascriptInterface public void carNav(String json) {
                handler.post(() -> {
                    try { navState = new JSONObject(json); } catch (Exception e) { navState = new JSONObject(); }
                    String err = navState.optString("err", "");
                    if (!err.isEmpty()) { toast(err); mapScreen.calculating = false; mapScreen.invalidate(); return; }
                    boolean nowNav = navState.optInt("nav", 0) == 1;
                    NavigationManager nm = getCarContext().getCarService(NavigationManager.class);
                    if (nowNav && !navigating) { try { nm.navigationStarted(); } catch (Exception ignored) { } }
                    if (!nowNav && navigating) { try { nm.navigationEnded(); } catch (Exception ignored) { } }
                    navigating = nowNav;
                    if (nowNav) mapScreen.calculating = false;
                    mapScreen.invalidate();
                });
            }
            /** Resultados de una búsqueda hecha desde el coche */
            @JavascriptInterface public void carResults(String json) {
                handler.post(() -> { if (searchScreen != null) searchScreen.setResults(json); });
            }
        }

        // ---------------- Acciones ----------------

        void go(JSONObject d) {
            mapScreen.calculating = true;
            mapScreen.invalidate();
            js("window.carGo&&carGo(" + d.optDouble("lat") + "," + d.optDouble("lon") + "," + JSONObject.quote(d.optString("name")) + ","
                    + JSONObject.quote(d.optString("sub")) + ")");
        }
    }

    // =====================================================================
    // Iconos dibujados (flechas de maniobra y botones)

    static CarIcon glyph(String text, int color) {
        Bitmap b = Bitmap.createBitmap(96, 96, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(b);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(color); p.setTextAlign(Paint.Align.CENTER); p.setTextSize(text.length() > 1 && !Character.isSurrogate(text.charAt(0)) ? 44 : 64);
        p.setFakeBoldText(true);
        Paint.FontMetrics fm = p.getFontMetrics();
        c.drawText(text, 48, 48 - (fm.ascent + fm.descent) / 2, p);
        return new CarIcon.Builder(IconCompat.createWithBitmap(b)).build();
    }

    /** Flecha girada: 0 recto, -90 izquierda, 90 derecha, 180 cambio de sentido */
    static CarIcon arrow(float angle, boolean roundabout, boolean destination) {
        Bitmap b = Bitmap.createBitmap(128, 128, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(b);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(Color.WHITE);
        if (destination) {
            p.setStyle(Paint.Style.FILL);
            c.drawRect(38, 18, 44, 112, p);
            Path f = new Path(); f.moveTo(44, 18); f.lineTo(100, 36); f.lineTo(44, 58); f.close(); c.drawPath(f, p);
            return new CarIcon.Builder(IconCompat.createWithBitmap(b)).build();
        }
        p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(13); p.setStrokeCap(Paint.Cap.ROUND); p.setStrokeJoin(Paint.Join.ROUND);
        if (roundabout) c.drawOval(new RectF(36, 50, 92, 106), p);
        c.save();
        c.rotate(angle, 64, 78);
        c.drawLine(64, 112, 64, 34, p);
        p.setStyle(Paint.Style.FILL);
        Path h = new Path(); h.moveTo(64, 8); h.lineTo(90, 40); h.lineTo(38, 40); h.close(); c.drawPath(h, p);
        c.restore();
        return new CarIcon.Builder(IconCompat.createWithBitmap(b)).build();
    }

    static Maneuver maneuver(String kind) {
        int t; float a = 0; boolean rb = false, dst = false;
        switch (kind) {
            case "left": t = Maneuver.TYPE_TURN_NORMAL_LEFT; a = -90; break;
            case "right": t = Maneuver.TYPE_TURN_NORMAL_RIGHT; a = 90; break;
            case "slight_left": t = Maneuver.TYPE_TURN_SLIGHT_LEFT; a = -45; break;
            case "slight_right": t = Maneuver.TYPE_TURN_SLIGHT_RIGHT; a = 45; break;
            case "sharp_left": t = Maneuver.TYPE_TURN_SHARP_LEFT; a = -135; break;
            case "sharp_right": t = Maneuver.TYPE_TURN_SHARP_RIGHT; a = 135; break;
            case "uturn": t = Maneuver.TYPE_U_TURN_LEFT; a = 180; break;
            case "roundabout": t = Maneuver.TYPE_ROUNDABOUT_ENTER_CCW; rb = true; break;
            case "roundabout_exit": t = Maneuver.TYPE_ROUNDABOUT_EXIT_CCW; a = 45; rb = true; break;
            case "dest": case "stop": t = Maneuver.TYPE_DESTINATION; dst = true; break;
            case "start": t = Maneuver.TYPE_DEPART; break;
            default: t = Maneuver.TYPE_STRAIGHT; break;
        }
        return new Maneuver.Builder(t).setIcon(arrow(a, rb, dst)).build();
    }

    static Distance distance(double m) {
        if (m >= 1000) return Distance.create(Math.round(m / 100.0) / 10.0, Distance.UNIT_KILOMETERS);
        return Distance.create(m >= 100 ? Math.round(m / 10.0) * 10 : Math.round(m), Distance.UNIT_METERS);
    }

    static String fmtDist(int m) {
        if (m < 0) return "";
        if (m < 1000) return m + " m";
        return String.format(Locale.forLanguageTag("es-ES"), m < 10000 ? "%.1f km" : "%.0f km", m / 1000.0);
    }

    // =====================================================================
    // Pantalla del mapa (con la tarjeta de maniobra)

    static final class MapScreen extends Screen {
        final CarSession s;
        boolean calculating;
        String sound = "all";

        MapScreen(@NonNull CarContext ctx, CarSession s) { super(ctx); this.s = s; }

        @NonNull @Override
        public Template onGetTemplate() {
            NavigationTemplate.Builder b = new NavigationTemplate.Builder();
            b.setBackgroundColor(CarColor.createCustom(0xFF16243A, 0xFF16243A));
            ActionStrip.Builder strip = new ActionStrip.Builder();
            Action soundBtn = new Action.Builder()
                    .setIcon(glyph("all".equals(sound) ? "🔊" : "alerts".equals(sound) ? "🔔" : "🔇", Color.WHITE))
                    .setOnClickListener(() -> { if (s.web != null) s.web.evaluateJavascript("carSound()", v -> {
                        sound = v == null ? "all" : v.replace("\"", "");
                        s.toast("all".equals(sound) ? "Voz y avisos" : "alerts".equals(sound) ? "Solo avisos" : "Sin sonido");
                        invalidate();
                    }); }).build();
            Action report = new Action.Builder().setTitle("Avisar")
                    .setOnClickListener(() -> getScreenManager().push(new ReportScreen(getCarContext(), s))).build();
            if (s.navigating) {
                JSONObject n = s.navState;
                String kind = n.optString("kind", "straight");
                int dm = n.optInt("dist", 0);
                String street = n.optString("street", "");
                String cue = !street.isEmpty() ? street : n.optString("text", "");
                Step.Builder step = new Step.Builder(cue.isEmpty() ? " " : cue).setManeuver(maneuver(kind));
                if (!street.isEmpty()) step.setRoad(street);
                RoutingInfo.Builder ri = new RoutingInfo.Builder().setCurrentStep(step.build(), distance(dm));
                String then = n.optString("then", "");
                if (!then.isEmpty()) ri.setNextStep(new Step.Builder(" ").setManeuver(maneuver(then)).build());
                b.setNavigationInfo(ri.build());
                int rest = n.optInt("rest", 0), remT = n.optInt("remT", 0);
                long eta = System.currentTimeMillis() + remT * 1000L;
                b.setDestinationTravelEstimate(new TravelEstimate.Builder(distance(rest), DateTimeWithZone.create(eta, TimeZone.getDefault()))
                        .setRemainingTimeSeconds(remT).build());
                strip.addAction(report).addAction(soundBtn)
                        .addAction(new Action.Builder().setTitle("Parar").setOnClickListener(() -> s.js("carStop()")).build());
            } else {
                if (calculating) b.setNavigationInfo(new RoutingInfo.Builder().setLoading(true).build());
                strip.addAction(new Action.Builder().setTitle("Buscar").setIcon(glyph("🔍", Color.WHITE))
                                .setOnClickListener(() -> { s.searchScreen = new SearchScreen(getCarContext(), s); getScreenManager().push(s.searchScreen); }).build())
                        .addAction(new Action.Builder().setTitle("Destinos")
                                .setOnClickListener(() -> getScreenManager().push(new DestScreen(getCarContext(), s))).build())
                        .addAction(report).addAction(soundBtn);
            }
            b.setActionStrip(strip.build());
            b.setMapActionStrip(new ActionStrip.Builder()
                    .addAction(Action.PAN)
                    .addAction(new Action.Builder().setIcon(glyph("+", Color.WHITE)).setOnClickListener(() -> s.js("carZoom(1)")).build())
                    .addAction(new Action.Builder().setIcon(glyph("−", Color.WHITE)).setOnClickListener(() -> s.js("carZoom(-1)")).build())
                    .addAction(new Action.Builder().setIcon(glyph("◎", Color.WHITE)).setOnClickListener(() -> s.js("carCenter()")).build())
                    .build());
            b.setPanModeListener(on -> { });
            return b.build();
        }
    }

    // =====================================================================
    // Destinos: Casa, Trabajo, favoritos y recientes

    static final class DestScreen extends Screen {
        final CarSession s;
        JSONArray list;

        DestScreen(@NonNull CarContext ctx, CarSession s) {
            super(ctx); this.s = s;
            if (s.web != null) s.web.evaluateJavascript("window.carDests?carDests():[]", v -> {
                try { list = new JSONArray(v); } catch (Exception e) { list = new JSONArray(); }
                invalidate();
            }); else list = new JSONArray();
        }

        @NonNull @Override
        public Template onGetTemplate() {
            ListTemplate.Builder b = new ListTemplate.Builder().setTitle("Destinos").setHeaderAction(Action.BACK);
            if (list == null) return b.setLoading(true).build();
            ItemList.Builder il = new ItemList.Builder().setNoItemsMessage("Guarda Casa, Trabajo o favoritos desde el móvil");
            for (int i = 0; i < list.length() && i < 12; i++) {
                JSONObject d = list.optJSONObject(i);
                if (d == null) continue;
                String ic = d.optString("ic");
                String e = "casa".equals(ic) ? "🏠" : "trabajo".equals(ic) ? "💼" : "fav".equals(ic) ? "⭐" : "🕘";
                String sub = (fmtDist(d.optInt("d", -1)) + (d.optString("sub").isEmpty() ? "" : " · " + d.optString("sub"))).replaceFirst("^ · ", "");
                Row.Builder r = new Row.Builder().setTitle(d.optString("name", "Destino")).setImage(glyph(e, Color.WHITE))
                        .setOnClickListener(() -> { s.go(d); getScreenManager().popToRoot(); });
                if (!sub.isEmpty()) r.addText(sub);
                il.addItem(r.build());
            }
            return b.setSingleList(il.build()).build();
        }
    }

    // =====================================================================
    // Buscar una dirección (con el teclado o el micrófono de Android Auto)

    static final class SearchScreen extends Screen {
        final CarSession s;
        JSONArray results = new JSONArray();
        boolean loading;

        SearchScreen(@NonNull CarContext ctx, CarSession s) { super(ctx); this.s = s; }

        void setResults(String json) {
            try { results = new JSONArray(json); } catch (Exception e) { results = new JSONArray(); }
            loading = false; invalidate();
        }

        void search(String q) {
            if (q == null || q.trim().length() < 3) return;
            loading = true; invalidate();
            s.js("window.carSearch&&carSearch(" + JSONObject.quote(q.trim()) + ")");
        }

        @NonNull @Override
        public Template onGetTemplate() {
            SearchTemplate.Builder b = new SearchTemplate.Builder(new SearchTemplate.SearchCallback() {
                @Override public void onSearchTextChanged(@NonNull String t) { }
                @Override public void onSearchSubmitted(@NonNull String t) { search(t); }
            }).setHeaderAction(Action.BACK).setSearchHint("Dirección o sitio").setShowKeyboardByDefault(true);
            if (loading) return b.setLoading(true).build();
            ItemList.Builder il = new ItemList.Builder();
            for (int i = 0; i < results.length() && i < 6; i++) {
                JSONObject d = results.optJSONObject(i);
                if (d == null) continue;
                Row.Builder r = new Row.Builder().setTitle(d.optString("name", "Sitio"))
                        .setOnClickListener(() -> { s.go(d); getScreenManager().popToRoot(); });
                String sub = (fmtDist(d.optInt("d", -1)) + (d.optString("sub").isEmpty() ? "" : " · " + d.optString("sub"))).replaceFirst("^ · ", "");
                if (!sub.isEmpty()) r.addText(sub);
                il.addItem(r.build());
            }
            return b.setItemList(il.build()).build();
        }
    }

    // =====================================================================
    // Avisar de algo en la carretera

    static final class ReportScreen extends Screen {
        final CarSession s;
        static final String[][] ITEMS = {
                {"policia", "👮", "Control"}, {"accidente", "💥", "Accidente"}, {"peligro", "⚠️", "Peligro"}, {"v16", "🚨", "Averiado"},
                {"atasco", "🚗", "Atasco"}, {"obras", "🚧", "Obras"}, {"movil", "📷", "Radar móvil"}, {"radar", "📸", "Radar fijo"}};

        ReportScreen(@NonNull CarContext ctx, CarSession s) { super(ctx); this.s = s; }

        @NonNull @Override
        public Template onGetTemplate() {
            ItemList.Builder il = new ItemList.Builder();
            for (String[] it : ITEMS) {
                il.addItem(new GridItem.Builder().setTitle(it[2]).setImage(glyph(it[1], Color.WHITE))
                        .setOnClickListener(() -> { s.js("carReport('" + it[0] + "')"); s.toast("Aviso guardado: " + it[2]); getScreenManager().pop(); })
                        .build());
            }
            return new GridTemplate.Builder().setTitle("Avisar aquí").setHeaderAction(Action.BACK).setSingleList(il.build()).build();
        }
    }
}
