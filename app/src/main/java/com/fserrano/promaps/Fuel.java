package com.fserrano.promaps;

import android.util.JsonReader;
import android.util.JsonToken;

import org.json.JSONArray;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.text.Normalizer;

/**
 * Lee los precios oficiales de todas las gasolineras de España (Ministerio)
 * y devuelve una lista compacta:
 * [id, rótulo, lat, lon, dirección, localidad, horario, g95, g98, diésel, diésel+, glp]
 */
final class Fuel {

    static final String[] URLS = {
            "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/",
            "https://energia.serviciosmin.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/"
    };

    private static String norm(String k) {
        String s = Normalizer.normalize(k, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return s.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    private static double num(String v) {
        if (v == null) return 0;
        v = v.trim().replace(',', '.');
        if (v.isEmpty()) return 0;
        try { return Double.parseDouble(v); } catch (Exception e) { return 0; }
    }

    static JSONArray parse(InputStream in) throws Exception {
        JSONArray out = new JSONArray();
        try (JsonReader r = new JsonReader(new InputStreamReader(in, "UTF-8"))) {
            r.beginObject();
            while (r.hasNext()) {
                String name = r.nextName();
                if (norm(name).equals("listaeessprecio") && r.peek() == JsonToken.BEGIN_ARRAY) {
                    r.beginArray();
                    while (r.hasNext()) {
                        String id = "", rot = "", dir = "", loc = "", hor = "";
                        double lat = 0, lon = 0, g95 = 0, g98 = 0, ga = 0, gap = 0, glp = 0;
                        r.beginObject();
                        while (r.hasNext()) {
                            String k = norm(r.nextName());
                            if (r.peek() != JsonToken.STRING) { r.skipValue(); continue; }
                            String v = r.nextString();
                            switch (k) {
                                case "ideess": id = v; break;
                                case "rotulo": rot = v; break;
                                case "direccion": dir = v; break;
                                case "localidad": loc = v; break;
                                case "horario": hor = v; break;
                                case "latitud": lat = num(v); break;
                                case "longitudwgs84": lon = num(v); break;
                                case "preciogasolina95e5": g95 = num(v); break;
                                case "preciogasolina98e5": g98 = num(v); break;
                                case "preciogasoleoa": ga = num(v); break;
                                case "preciogasoleopremium": gap = num(v); break;
                                case "preciogaseslicuadosdelpetroleo": glp = num(v); break;
                                default: break;
                            }
                        }
                        r.endObject();
                        if (lat == 0 || lon == 0) continue;
                        JSONArray s = new JSONArray();
                        s.put(id); s.put(rot); s.put(lat); s.put(lon); s.put(dir); s.put(loc); s.put(hor);
                        s.put(g95); s.put(g98); s.put(ga); s.put(gap); s.put(glp);
                        out.put(s);
                    }
                    r.endArray();
                } else {
                    r.skipValue();
                }
            }
            r.endObject();
        }
        return out;
    }
}
