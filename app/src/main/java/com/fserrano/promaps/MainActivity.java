package com.fserrano.promaps;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.tts.TextToSpeech;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

public class MainActivity extends Activity implements LocationListener {

    private WebView web;
    private TextToSpeech tts;
    private boolean ttsReady;
    private LocationManager lm;
    private SharedPreferences prefs;
    private ToneGenerator tone;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService pool = Executors.newFixedThreadPool(4);
    private String pendingShare = null;
    private android.webkit.PermissionRequest pendingCam = null;
    private TileCache tiles;
    private android.speech.SpeechRecognizer recognizer;
    private final ExecutorService prefetchPool = Executors.newFixedThreadPool(4);
    private boolean pageReady = false;

    private static final OkHttpClient HTTP = new OkHttpClient.Builder()
            .connectTimeout(12, TimeUnit.SECONDS)
            .readTimeout(90, TimeUnit.SECONDS)
            .followRedirects(true)
            .build();

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("promaps", MODE_PRIVATE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(0xFF0E1A2B);
        getWindow().setNavigationBarColor(0xFF0E1A2B);
        setVolumeControlStream(AudioManager.STREAM_MUSIC);

        web = new WebView(this);
        web.setBackgroundColor(0xFF0E1A2B);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        tiles = new TileCache(this);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, android.webkit.WebResourceRequest req) {
                String url = req.getUrl().toString();
                if ("GET".equals(req.getMethod()) && TileCache.handles(url)) {
                    android.webkit.WebResourceResponse r = tiles.serve(url);
                    if (r != null) return r;
                }
                return super.shouldInterceptRequest(view, req);
            }
        });
        pool.execute(() -> tiles.trim());
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(final android.webkit.PermissionRequest req) {
                handler.post(() -> {
                    boolean wantsCam = false;
                    for (String r : req.getResources()) if (android.webkit.PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) wantsCam = true;
                    if (!wantsCam) { req.deny(); return; }
                    if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                        pendingCam = req;
                        requestPermissions(new String[]{Manifest.permission.CAMERA}, 3);
                    } else {
                        req.grant(new String[]{android.webkit.PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    }
                });
            }
            @Override public boolean onConsoleMessage(ConsoleMessage m) {
                android.util.Log.d("Pro Maps", m.message() + " @" + m.lineNumber());
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(), "Nativo");
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");

        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                int r = tts.setLanguage(new Locale("es", "ES"));
                if (r < 0) tts.setLanguage(Locale.getDefault());
                tts.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
                ttsReady = true;
            }
        });
        try { tone = new ToneGenerator(AudioManager.STREAM_MUSIC, 90); } catch (Exception ignored) { }

        lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        askLocation();
        handler.postDelayed(() -> checkUpdate(false), 4000);
        takeIntent(getIntent());
    }

    // ---------- Ubicaciones compartidas (WhatsApp, Google Maps, geo:) ----------

    private void takeIntent(Intent i) {
        if (i == null) return;
        String data = null;
        if (Intent.ACTION_VIEW.equals(i.getAction()) && i.getData() != null) data = i.getData().toString();
        else if (Intent.ACTION_SEND.equals(i.getAction())) {
            CharSequence t = i.getCharSequenceExtra(Intent.EXTRA_TEXT);
            if (t != null) data = t.toString();
        }
        if (data == null || data.isEmpty()) return;
        if (pageReady && web != null) {
            String js = "window.onShared&&window.onShared(" + JSONObject.quote(data) + ")";
            web.evaluateJavascript(js, null);
        } else {
            pendingShare = data;
        }
    }

    // ---------- GPS ----------

    private void askLocation() {
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION}, 1);
        } else {
            startGps();
        }
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (code == 3) {
            if (pendingCam != null) {
                if (res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED)
                    pendingCam.grant(new String[]{android.webkit.PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                else pendingCam.deny();
                pendingCam = null;
            }
            return;
        }
        if (code == 2) {
            if (res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED) startListening();
            else voiceJs("onVoiceError", "Sin permiso de micrófono no puedo escucharte");
            return;
        }
        if (res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED) startGps();
        else toast("Sin permiso de ubicación no puedo guiarte. Actívalo en Ajustes > Apps > Pro Maps.");
    }

    @SuppressLint("MissingPermission")
    private void startGps() {
        try {
            lm.removeUpdates(this);
            if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER))
                lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000, 0, this);
            if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER))
                lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 4000, 0, this);
            Location last = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            if (last == null) last = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            if (last != null) onLocationChanged(last);
            if (!lm.isProviderEnabled(LocationManager.GPS_PROVIDER))
                toast("Activa la ubicación (GPS) del móvil para navegar");
        } catch (Exception e) {
            toast("No se pudo iniciar el GPS: " + e.getMessage());
        }
    }

    private long lastGpsFix = 0;

    @Override
    public void onLocationChanged(Location l) {
        boolean isGps = LocationManager.GPS_PROVIDER.equals(l.getProvider());
        long now = System.currentTimeMillis();
        if (isGps) lastGpsFix = now;
        else if (now - lastGpsFix < 10000) return; // si hay GPS, ignoramos la red
        String js = "window.onGps&&window.onGps(" + l.getLatitude() + "," + l.getLongitude() + ","
                + (l.hasSpeed() ? l.getSpeed() : -1) + "," + (l.hasBearing() ? l.getBearing() : -1) + ","
                + (l.hasAccuracy() ? l.getAccuracy() : 50) + "," + (isGps ? 1 : 0) + ")";
        handler.post(() -> { if (web != null) web.evaluateJavascript(js, null); });
    }

    @Override public void onProviderEnabled(String p) { }
    @Override public void onProviderDisabled(String p) { }
    @Override public void onStatusChanged(String p, int s, Bundle b) { }

    // ---------- Puente con la página ----------

    private void reply(String id, boolean ok, String body) {
        String js = "window.__net&&window.__net(" + JSONObject.quote(id) + "," + ok + "," + JSONObject.quote(body) + ")";
        handler.post(() -> { if (web != null) web.evaluateJavascript(js, null); });
    }

    final class Bridge {
        @JavascriptInterface
        public void get(String id, String url) {
            pool.execute(() -> {
                Request req = new Request.Builder().url(url)
                        .header("User-Agent", "ProMaps/" + Updater.installedName(MainActivity.this) + " (Android)")
                        .build();
                try (Response r = HTTP.newCall(req).execute()) {
                    String body = r.body() != null ? r.body().string() : "";
                    reply(id, r.isSuccessful(), r.isSuccessful() ? body : ("HTTP " + r.code() + " " + body));
                } catch (Exception e) {
                    reply(id, false, String.valueOf(e.getMessage()));
                }
            });
        }

        /** Envía datos (POST) — se usa para pasar el aparcamiento de la pantalla del coche al móvil */
        @JavascriptInterface
        public void post(String id, String url, String body, String headersJson) {
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
                } catch (Exception e) {
                    reply(id, false, String.valueOf(e.getMessage()));
                }
            });
        }

        /** Compartir texto (WhatsApp si está instalado; si no, el menú de Android) */
        @JavascriptInterface
        public void share(String text, boolean whatsapp) {
            handler.post(() -> {
                Intent i = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text);
                if (whatsapp) {
                    try { startActivity(new Intent(i).setPackage("com.whatsapp")); return; } catch (Exception ignored) { }
                }
                try { startActivity(Intent.createChooser(i, "Compartir con…")); } catch (Exception ignored) { }
            });
        }

        /** Descarga para usar sin cobertura una lista de trozos del mapa. Avisa del progreso a la página. */
        @JavascriptInterface
        public void prefetch(String id, String urlsJson) {
            pool.execute(() -> {
                try {
                    JSONArray arr = new JSONArray(urlsJson);
                    final int total = arr.length();
                    final java.util.concurrent.atomic.AtomicInteger done = new java.util.concurrent.atomic.AtomicInteger(), ok = new java.util.concurrent.atomic.AtomicInteger();
                    java.util.List<java.util.concurrent.Future<?>> fs = new java.util.ArrayList<>();
                    for (int i = 0; i < total; i++) {
                        final String u = arr.getString(i);
                        fs.add(prefetchPool.submit(() -> {
                            if (tiles.fetch(u)) ok.incrementAndGet();
                            int d = done.incrementAndGet();
                            if (d % 25 == 0 || d == total) {
                                String js = "window.onPrefetch&&window.onPrefetch(" + JSONObject.quote(id) + "," + d + "," + total + "," + ok.get() + ")";
                                handler.post(() -> { if (web != null) web.evaluateJavascript(js, null); });
                            }
                        }));
                    }
                    for (java.util.concurrent.Future<?> f : fs) { try { f.get(); } catch (Exception ignored) { } }
                    tiles.trim();
                    reply(id, true, ok.get() + "/" + total);
                } catch (Exception e) {
                    reply(id, false, String.valueOf(e.getMessage()));
                }
            });
        }

        /** Diagnóstico: cámaras que ve Android y aparatos de vídeo conectados por USB */
        @JavascriptInterface
        public String cameraInfo() {
            JSONObject o = new JSONObject();
            try {
                JSONArray cams = new JSONArray();
                android.hardware.camera2.CameraManager cm = (android.hardware.camera2.CameraManager) getSystemService(Context.CAMERA_SERVICE);
                if (cm != null) for (String id : cm.getCameraIdList()) {
                    JSONObject c = new JSONObject();
                    c.put("id", id);
                    Integer f = cm.getCameraCharacteristics(id).get(android.hardware.camera2.CameraCharacteristics.LENS_FACING);
                    c.put("facing", f == null ? "?" : f == 0 ? "frontal" : f == 1 ? "trasera" : "externa (USB)");
                    cams.put(c);
                }
                o.put("cameras", cams);
            } catch (Exception e) { try { o.put("camErr", String.valueOf(e.getMessage())); } catch (Exception ignored) { } }
            try {
                JSONArray usb = new JSONArray();
                android.hardware.usb.UsbManager um = (android.hardware.usb.UsbManager) getSystemService(Context.USB_SERVICE);
                if (um != null) for (android.hardware.usb.UsbDevice d : um.getDeviceList().values()) {
                    boolean video = d.getDeviceClass() == 14 || d.getDeviceClass() == 239;
                    for (int i = 0; i < d.getInterfaceCount(); i++) if (d.getInterface(i).getInterfaceClass() == 14) video = true;
                    JSONObject u = new JSONObject();
                    u.put("name", (Build.VERSION.SDK_INT >= 21 && d.getProductName() != null) ? d.getProductName() : d.getDeviceName());
                    u.put("maker", Build.VERSION.SDK_INT >= 21 && d.getManufacturerName() != null ? d.getManufacturerName() : "");
                    u.put("ids", String.format("%04x:%04x", d.getVendorId(), d.getProductId()));
                    u.put("video", video);
                    usb.put(u);
                }
                o.put("usb", usb);
            } catch (Exception e) { try { o.put("usbErr", String.valueOf(e.getMessage())); } catch (Exception ignored) { } }
            try { o.put("model", Build.MANUFACTURER + " " + Build.MODEL + " · Android " + Build.VERSION.RELEASE); } catch (Exception ignored) { }
            return o.toString();
        }

        @JavascriptInterface
        public String cacheSize() { return String.valueOf(tiles.size()); }

        @JavascriptInterface
        public void clearCache() { pool.execute(() -> tiles.clear()); }

        /** Escucha una orden por voz (micrófono) y la devuelve a la página como texto */
        @JavascriptInterface
        public void listen() { handler.post(MainActivity.this::startListening); }

        @JavascriptInterface
        public void dgt(String id) {
            pool.execute(() -> {
                Request req = new Request.Builder().url(Dgt.URL).header("User-Agent", "ProMaps (Android)").build();
                try (Response r = HTTP.newCall(req).execute()) {
                    if (!r.isSuccessful() || r.body() == null) { reply(id, false, "HTTP " + r.code()); return; }
                    JSONArray arr = Dgt.parse(r.body().byteStream());
                    reply(id, true, arr.toString());
                } catch (Exception e) {
                    reply(id, false, String.valueOf(e.getMessage()));
                }
            });
        }

        @JavascriptInterface
        public void fuel(String id) {
            pool.execute(() -> {
                String err = "sin datos";
                for (String u : Fuel.URLS) {
                    Request req = new Request.Builder().url(u).header("Accept", "application/json")
                            .header("User-Agent", "ProMaps (Android)").build();
                    try (Response r = HTTP.newCall(req).execute()) {
                        if (!r.isSuccessful() || r.body() == null) { err = "HTTP " + r.code(); continue; }
                        JSONArray arr = Fuel.parse(r.body().byteStream());
                        if (arr.length() == 0) { err = "lista vacía"; continue; }
                        reply(id, true, arr.toString());
                        return;
                    } catch (Exception e) {
                        err = String.valueOf(e.getMessage());
                    }
                }
                reply(id, false, err);
            });
        }

        /** Sigue las redirecciones de un enlace corto (maps.app.goo.gl) y devuelve la dirección final */
        @JavascriptInterface
        public void resolve(String id, String url) {
            pool.execute(() -> {
                Request req = new Request.Builder().url(url)
                        .header("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36")
                        .build();
                try (Response r = HTTP.newCall(req).execute()) {
                    String fin = r.request().url().toString();
                    String body = "";
                    try { if (r.body() != null) { body = r.body().string(); if (body.length() > 20000) body = body.substring(0, 20000); } } catch (Exception ignored) { }
                    reply(id, true, fin + "\n" + body);
                } catch (Exception e) {
                    reply(id, false, String.valueOf(e.getMessage()));
                }
            });
        }

        @JavascriptInterface
        public String takeShared() {
            pageReady = true;
            String s = pendingShare;
            pendingShare = null;
            return s == null ? "" : s;
        }

        @JavascriptInterface
        public void speak(String text) {
            if (ttsReady) tts.speak(text, TextToSpeech.QUEUE_ADD, null, "p" + System.nanoTime());
        }

        @JavascriptInterface
        public void speakNow(String text) {
            if (ttsReady) tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "p" + System.nanoTime());
        }

        @JavascriptInterface
        public void stopSpeak() { if (ttsReady) tts.stop(); }

        @JavascriptInterface
        public void beep(int kind) {
            if (tone == null) return;
            try {
                tone.startTone(kind == 2 ? ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD
                        : ToneGenerator.TONE_PROP_BEEP2, kind == 2 ? 600 : 250);
            } catch (Exception ignored) { }
        }

        @JavascriptInterface
        public void vibrate(int ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (v == null) return;
                if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
                else v.vibrate(ms);
            } catch (Exception ignored) { }
        }

        @JavascriptInterface
        public String version() { return Updater.installedName(MainActivity.this); }

        @JavascriptInterface
        public void checkUpdate() { handler.post(() -> MainActivity.this.checkUpdate(true)); }

        @JavascriptInterface
        public void toast(String msg) { handler.post(() -> MainActivity.this.toast(msg)); }

        @JavascriptInterface
        public void exit() { handler.post(MainActivity.this::finish); }

        @JavascriptInterface
        public void openUrl(String url) {
            handler.post(() -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) { }
            });
        }
    }

    // ---------- Órdenes por voz ----------

    private void voiceJs(String fn, String arg) {
        String js = "window." + fn + "&&window." + fn + "(" + JSONObject.quote(arg) + ")";
        handler.post(() -> { if (web != null) web.evaluateJavascript(js, null); });
    }

    private void startListening() {
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 2);
            return;
        }
        if (!android.speech.SpeechRecognizer.isRecognitionAvailable(this)) {
            voiceJs("onVoiceError", "Este dispositivo no tiene reconocimiento de voz (instala o activa la app de Google)");
            return;
        }
        if (ttsReady) tts.stop();
        if (recognizer != null) { try { recognizer.destroy(); } catch (Exception ignored) { } }
        recognizer = android.speech.SpeechRecognizer.createSpeechRecognizer(this);
        recognizer.setRecognitionListener(new android.speech.RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle b) { voiceJs("onVoiceState", "escuchando"); }
            @Override public void onBeginningOfSpeech() { }
            @Override public void onRmsChanged(float v) { }
            @Override public void onBufferReceived(byte[] b) { }
            @Override public void onEndOfSpeech() { voiceJs("onVoiceState", "procesando"); }
            @Override public void onError(int e) {
                voiceJs("onVoiceError", e == android.speech.SpeechRecognizer.ERROR_NO_MATCH || e == android.speech.SpeechRecognizer.ERROR_SPEECH_TIMEOUT
                        ? "No te he oído bien" : e == android.speech.SpeechRecognizer.ERROR_NETWORK || e == android.speech.SpeechRecognizer.ERROR_NETWORK_TIMEOUT
                        ? "Sin conexión para entender la voz" : "No se pudo escuchar (" + e + ")");
            }
            @Override public void onResults(Bundle r) {
                java.util.ArrayList<String> l = r.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION);
                voiceJs("onVoice", l != null && !l.isEmpty() ? l.get(0) : "");
            }
            @Override public void onPartialResults(Bundle b) { }
            @Override public void onEvent(int t, Bundle b) { }
        });
        Intent i = new Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, "es-ES");
        i.putExtra(android.speech.RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        try { recognizer.startListening(i); } catch (Exception e) { voiceJs("onVoiceError", "No se pudo usar el micrófono"); }
    }

    // ---------- Actualizaciones ----------

    private void checkUpdate(boolean manual) {
        if (manual) toast("Buscando actualizaciones…");
        new Thread(() -> {
            final Updater.Info info = Updater.latest();
            final int mine = Updater.installedCode(this);
            handler.post(() -> {
                if (isFinishing()) return;
                if (info == null) { if (manual) toast("No se pudo comprobar. ¿Tienes internet?"); return; }
                if (info.code <= mine) { if (manual) toast("Ya tienes la última versión (v" + Updater.installedName(this) + ")"); return; }
                if (!manual && prefs.getInt("skipVersion", 0) == info.code) return;
                new AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_Alert)
                        .setTitle("Hay una versión nueva")
                        .setMessage("Pro Maps v" + info.name + " ya está disponible (tienes la v"
                                + Updater.installedName(this) + ")."
                                + (info.notes.isEmpty() ? "" : "\n\nNovedades:\n" + info.notes)
                                + "\n\nTus favoritos y avisos se mantienen.")
                        .setPositiveButton("Actualizar", (d, w) -> startUpdate())
                        .setNeutralButton("Esta no", (d, w) -> prefs.edit().putInt("skipVersion", info.code).apply())
                        .setNegativeButton("Más tarde", null)
                        .show();
            });
        }).start();
    }

    private void startUpdate() {
        if (Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
            new AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_Alert)
                    .setTitle("Falta un permiso")
                    .setMessage("Para actualizarse, Android tiene que permitir que Pro Maps instale apps.\n\n"
                            + "En la siguiente pantalla activa «Permitir de esta fuente», vuelve atrás y pulsa otra vez Actualizar.")
                    .setPositiveButton("Abrir ajustes", (d, w) -> {
                        try {
                            startActivity(new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                    Uri.parse("package:" + getPackageName())));
                        } catch (Exception ignored) { }
                    })
                    .setNegativeButton("Cancelar", null)
                    .show();
            return;
        }
        toast("Descargando la versión nueva…");
        new Thread(() -> {
            String err = Updater.downloadAndInstall(this);
            if (err != null) handler.post(() -> toast(err));
        }).start();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent == null) return;
        if (!Updater.ACTION_STATUS.equals(intent.getAction())) { takeIntent(intent); return; }
        int status = intent.getIntExtra(android.content.pm.PackageInstaller.EXTRA_STATUS, -999);
        if (status == android.content.pm.PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) {
                try { startActivity(confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); } catch (Exception ignored) { }
            }
        } else if (status != android.content.pm.PackageInstaller.STATUS_SUCCESS) {
            String msg = intent.getStringExtra(android.content.pm.PackageInstaller.EXTRA_STATUS_MESSAGE);
            toast("No se pudo instalar" + (msg == null ? "" : ": " + msg));
        }
    }

    // ---------- Ciclo de vida ----------

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.evaluateJavascript("window.onResume&&window.onResume()", null);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.onBack?window.onBack():false", v -> {
            if (!"true".equals(v)) {
                new AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_Alert)
                        .setMessage("¿Salir de Pro Maps?")
                        .setPositiveButton("Salir", (d, w) -> finish())
                        .setNegativeButton("No", null)
                        .show();
            }
        });
    }

    @Override
    protected void onDestroy() {
        try { lm.removeUpdates(this); } catch (Exception ignored) { }
        if (tts != null) tts.shutdown();
        if (tone != null) tone.release();
        if (recognizer != null) { try { recognizer.destroy(); } catch (Exception ignored) { } }
        prefetchPool.shutdownNow();
        pool.shutdownNow();
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }

    private void toast(String msg) { Toast.makeText(this, msg, Toast.LENGTH_LONG).show(); }
}
