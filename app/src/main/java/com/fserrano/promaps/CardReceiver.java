package com.fserrano.promaps;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;

/**
 * «Modo tarjeta»: Pro Inicio pide que Pro Maps se dibuje encajada en la tarjeta del mapa
 * (op = show, con la posición y el tamaño) o que se quite (op = hide).
 * Pro Maps contesta a Pro Inicio con el resultado (ok / noperm / error).
 */
public class CardReceiver extends BroadcastReceiver {

    public static final String ACTION = "com.fserrano.promaps.CARD";
    public static final String REPLY = "es.proinicio.app.CARD_STATUS";

    @Override
    public void onReceive(Context c, Intent i) {
        if (i == null || !ACTION.equals(i.getAction())) return;
        String op = i.getStringExtra("op");
        String replyPkg = i.getStringExtra("reply");
        MainActivity a = MainActivity.current();
        if (!"show".equals(op)) {
            if (a != null) a.cardHide();
            return;
        }
        int[] r = {i.getIntExtra("x", 0), i.getIntExtra("y", 0), i.getIntExtra("w", 0), i.getIntExtra("h", 0), i.getIntExtra("r", 0)};
        if (r[2] < 50 || r[3] < 50) return;
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(c)) {
            status(c, replyPkg, "noperm");
            return;
        }
        if (a != null && !a.isFinishing()) {
            a.cardShow(r);
            status(c, replyPkg, "ok");
            return;
        }
        // Pro Maps no estaba abierta: se abre y en cuanto arranca se pasa a la tarjeta
        try {
            Intent s = new Intent(c, MainActivity.class).setAction(ACTION)
                    .putExtra("rect", r)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_ANIMATION);
            c.startActivity(s);
            status(c, replyPkg, "ok");
        } catch (Exception e) {
            status(c, replyPkg, "error");
        }
    }

    static void status(Context c, String pkg, String st) {
        if (pkg == null || pkg.isEmpty()) return;
        try {
            Intent r = new Intent(REPLY).setPackage(pkg).putExtra("status", st)
                    .putExtra("version", Updater.installedName(c));
            c.sendBroadcast(r);
        } catch (Exception ignored) { }
    }
}
