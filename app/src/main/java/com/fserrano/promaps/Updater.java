package com.fserrano.promaps;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.os.Build;

import java.io.InputStream;
import java.io.OutputStream;
import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

/** Busca versiones nuevas en GitHub y las instala con el instalador de Android. */
final class Updater {

    static final String ACTION_STATUS = "com.fserrano.promaps.INSTALL_STATUS";
    private static final String BASE = "https://github.com/franciscoserranoadt/pro-maps/releases/download/ultima/";

    static final class Info {
        final int code;
        final String name;
        final String notes;
        Info(int code, String name, String notes) { this.code = code; this.name = name; this.notes = notes; }
    }

    private static final OkHttpClient HTTP = new OkHttpClient.Builder()
            .connectTimeout(8, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .followRedirects(true)
            .build();

    static int installedCode(Activity a) {
        try {
            PackageInfo pi = a.getPackageManager().getPackageInfo(a.getPackageName(), 0);
            return Build.VERSION.SDK_INT >= 28 ? (int) pi.getLongVersionCode() : pi.versionCode;
        } catch (Exception e) {
            return 0;
        }
    }

    static String installedName(Activity a) {
        try {
            return a.getPackageManager().getPackageInfo(a.getPackageName(), 0).versionName;
        } catch (Exception e) {
            return "?";
        }
    }

    /** Devuelve la versión publicada, o null si no se puede consultar. Hilo secundario. */
    static Info latest() {
        Request req = new Request.Builder().url(BASE + "version.txt").header("Cache-Control", "no-cache").build();
        try (Response r = HTTP.newCall(req).execute()) {
            if (!r.isSuccessful() || r.body() == null) return null;
            String txt = r.body().string().trim();
            int nl = txt.indexOf('\n');
            String first = nl >= 0 ? txt.substring(0, nl) : txt;
            String notes = nl >= 0 ? txt.substring(nl + 1).trim() : "";
            String[] parts = first.trim().split("\\s+");
            int code = Integer.parseInt(parts[0]);
            String name = parts.length > 1 ? parts[1] : String.valueOf(code);
            return new Info(code, name, notes);
        } catch (Exception e) {
            return null;
        }
    }

    /** Descarga la APK y abre la pantalla de instalar. Hilo secundario. Devuelve un error o null. */
    static String downloadAndInstall(Activity a) {
        Request req = new Request.Builder().url(BASE + "ProMaps.apk").build();
        try (Response r = HTTP.newCall(req).execute()) {
            if (!r.isSuccessful() || r.body() == null) return "No se pudo descargar (error " + r.code() + ")";
            PackageInstaller installer = a.getPackageManager().getPackageInstaller();
            PackageInstaller.SessionParams params =
                    new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
            int id = installer.createSession(params);
            try (PackageInstaller.Session session = installer.openSession(id)) {
                try (InputStream in = r.body().byteStream();
                     OutputStream out = session.openWrite("ProMaps.apk", 0, r.body().contentLength())) {
                    byte[] buf = new byte[65536];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    session.fsync(out);
                }
                Intent i = new Intent(a, MainActivity.class).setAction(ACTION_STATUS)
                        .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= 31) flags |= PendingIntent.FLAG_MUTABLE;
                PendingIntent pi = PendingIntent.getActivity(a, 77, i, flags);
                session.commit(pi.getIntentSender());
            }
            return null;
        } catch (Exception e) {
            return "Error al actualizar: " + e.getMessage();
        }
    }
}
