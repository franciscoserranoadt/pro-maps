package com.fserrano.promaps;

import android.content.Context;
import android.webkit.WebResourceResponse;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

/**
 * Guarda en el móvil los trozos del mapa (OpenFreeMap) que se van viendo o que se descargan
 * para una ruta o una zona, y los sirve aunque no haya cobertura.
 */
final class TileCache {

    private static final long MAX_BYTES = 1500L * 1024 * 1024; // 1,5 GB como máximo
    private final File dir;
    private final OkHttpClient http = new OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS).readTimeout(30, TimeUnit.SECONDS).build();

    TileCache(Context c) {
        dir = new File(c.getFilesDir(), "mapa");
        if (!dir.exists()) dir.mkdirs();
    }

    static boolean handles(String url) {
        return url != null && url.startsWith("https://tiles.openfreemap.org/");
    }

    private static String key(String url) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            byte[] h = md.digest(url.getBytes("UTF-8"));
            StringBuilder sb = new StringBuilder();
            for (byte b : h) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return String.valueOf(url.hashCode());
        }
    }

    private static String mime(String url) {
        String u = url.split("\\?")[0];
        if (u.endsWith(".png")) return "image/png";
        if (u.endsWith(".json") || u.contains("/styles/") || !u.contains(".")) return "application/json";
        return "application/x-protobuf";
    }

    private File fileFor(String url) {
        String k = key(url);
        File sub = new File(dir, k.substring(0, 2));
        if (!sub.exists()) sub.mkdirs();
        return new File(sub, k);
    }

    boolean has(String url) { return fileFor(url).exists(); }

    /** Descarga y guarda. Devuelve true si quedó guardado. */
    boolean fetch(String url) {
        File f = fileFor(url);
        if (f.exists()) return true;
        Request req = new Request.Builder().url(url).header("User-Agent", "ProMaps (Android)").build();
        try (Response r = http.newCall(req).execute()) {
            if (!r.isSuccessful() || r.body() == null) return false;
            byte[] data = r.body().bytes();
            File tmp = new File(f.getPath() + ".tmp");
            try (FileOutputStream out = new FileOutputStream(tmp)) { out.write(data); }
            return tmp.renameTo(f);
        } catch (Exception e) {
            return false;
        }
    }

    /** Respuesta para el WebView: del móvil si está guardado; si no, se descarga y se guarda. */
    WebResourceResponse serve(String url) {
        File f = fileFor(url);
        boolean styleOrJson = mime(url).equals("application/json");
        // Los estilos y la información del mapa se piden siempre a internet si hay conexión (pueden cambiar)
        if (styleOrJson) {
            File tmp = new File(f.getPath() + ".n");
            Request req = new Request.Builder().url(url).header("User-Agent", "ProMaps (Android)").build();
            try (Response r = http.newCall(req).execute()) {
                if (r.isSuccessful() && r.body() != null) {
                    byte[] data = r.body().bytes();
                    try (FileOutputStream out = new FileOutputStream(tmp)) { out.write(data); }
                    tmp.renameTo(f);
                }
            } catch (Exception ignored) { }
        } else if (!f.exists()) {
            fetch(url);
        }
        if (!f.exists()) return null;
        try {
            f.setLastModified(System.currentTimeMillis());
            Map<String, String> h = new HashMap<>();
            h.put("Access-Control-Allow-Origin", "*");
            h.put("Cache-Control", "max-age=86400");
            return new WebResourceResponse(mime(url), null, 200, "OK", h, new FileInputStream(f));
        } catch (Exception e) {
            return null;
        }
    }

    long size() {
        long t = 0;
        File[] subs = dir.listFiles();
        if (subs == null) return 0;
        for (File s : subs) { File[] fs = s.listFiles(); if (fs != null) for (File f : fs) t += f.length(); }
        return t;
    }

    /** Si se pasa del máximo, borra lo que lleva más tiempo sin usarse. */
    void trim() {
        File[] subs = dir.listFiles();
        if (subs == null) return;
        java.util.List<File> all = new java.util.ArrayList<>();
        long total = 0;
        for (File s : subs) { File[] fs = s.listFiles(); if (fs != null) for (File f : fs) { all.add(f); total += f.length(); } }
        if (total <= MAX_BYTES) return;
        File[] arr = all.toArray(new File[0]);
        Arrays.sort(arr, (a, b) -> Long.compare(a.lastModified(), b.lastModified()));
        for (File f : arr) {
            if (total <= MAX_BYTES * 0.85) break;
            total -= f.length();
            f.delete();
        }
    }

    void clear() {
        File[] subs = dir.listFiles();
        if (subs == null) return;
        for (File s : subs) { File[] fs = s.listFiles(); if (fs != null) for (File f : fs) f.delete(); s.delete(); }
    }
}
