package com.fserrano.promaps;

import android.app.Application;

import java.security.Security;

/**
 * Arranca antes que nada. Instala Conscrypt como sistema de conexiones seguras de la app:
 * la Junsun (Android 9 por dentro) no sabe usar el cifrado moderno (TLS 1.3) que exigen
 * algunos servidores y fallaba con «Handshake failed».
 */
public class App extends Application {
    static {
        try { Security.insertProviderAt(org.conscrypt.Conscrypt.newProvider(), 1); } catch (Throwable ignored) { }
    }
}
