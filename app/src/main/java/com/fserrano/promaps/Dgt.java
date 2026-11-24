package com.fserrano.promaps;

import android.util.Xml;

import org.json.JSONArray;
import org.json.JSONObject;
import org.xmlpull.v1.XmlPullParser;

import java.io.InputStream;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Lee el fichero DATEX II v3 de incidencias de la DGT (actualizado cada minuto)
 * y lo convierte en una lista compacta en JSON para el mapa.
 */
final class Dgt {

    static final String URL = "https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml";

    /** Campos que guardamos de cada incidencia (el primero que aparezca). */
    private static final Set<String> KEYS = new HashSet<>(java.util.Arrays.asList(
            "causeType", "detailedCauseType", "vehicleObstructionType", "roadMaintenanceType",
            "accidentType", "abnormalTrafficType", "obstructionType", "animalPresenceType",
            "poorEnvironmentType", "nonWeatherRelatedRoadConditionType", "weatherRelatedRoadConditionType",
            "roadOrCarriagewayOrLaneManagementType", "genericSituationRecordName", "publicEventType",
            "roadName", "kilometerPoint", "municipality", "province", "tpegDirectionRoad", "direction",
            "overallStartTime", "overallEndTime", "probabilityOfOccurrence", "severity",
            "validityStatus", "value", "comment", "generalMessageToRoadUsers", "speedManagementType",
            "winterEquipmentManagementType", "trafficConstrictionType", "networkManagementType",
            "complianceOption", "vehicleType", "operatorActionStatus", "roadworksDuration", "subjects"));

    private static String local(String name) {
        if (name == null) return "";
        int i = name.indexOf(':');
        return i >= 0 ? name.substring(i + 1) : name;
    }

    static JSONArray parse(InputStream in) throws Exception {
        XmlPullParser p = Xml.newPullParser();
        p.setFeature(XmlPullParser.FEATURE_PROCESS_NAMESPACES, false);
        p.setInput(in, "UTF-8");

        JSONArray out = new JSONArray();
        boolean inRecord = false;
        String situationId = "";
        String type = "";
        String tag = "";
        Map<String, String> fields = new HashMap<>();
        double[] coords = new double[8]; // hasta 4 puntos (lat, lon)
        int n = 0;
        double pendingLat = Double.NaN;

        int ev = p.getEventType();
        while (ev != XmlPullParser.END_DOCUMENT) {
            if (ev == XmlPullParser.START_TAG) {
                tag = local(p.getName());
                if (tag.equals("situation")) {
                    String id = p.getAttributeValue(null, "id");
                    situationId = id == null ? "" : id;
                } else if (tag.equals("situationRecord")) {
                    inRecord = true;
                    String t = p.getAttributeValue(null, "xsi:type");
                    type = local(t);
                    String id = p.getAttributeValue(null, "id");
                    fields.clear();
                    if (id != null) fields.put("id", id);
                    n = 0;
                    pendingLat = Double.NaN;
                }
            } else if (ev == XmlPullParser.TEXT && inRecord) {
                String txt = p.getText();
                if (txt != null) {
                    txt = txt.trim();
                    if (!txt.isEmpty()) {
                        if (tag.equals("latitude")) {
                            try { pendingLat = Double.parseDouble(txt); } catch (Exception ignored) { }
                        } else if (tag.equals("longitude")) {
                            try {
                                double lon = Double.parseDouble(txt);
                                if (!Double.isNaN(pendingLat) && n < 4) {
                                    coords[n * 2] = pendingLat;
                                    coords[n * 2 + 1] = lon;
                                    n++;
                                }
                            } catch (Exception ignored) { }
                            pendingLat = Double.NaN;
                        } else if (KEYS.contains(tag) && !fields.containsKey(tag)) {
                            fields.put(tag, txt.length() > 200 ? txt.substring(0, 200) : txt);
                        }
                    }
                }
            } else if (ev == XmlPullParser.END_TAG) {
                String end = local(p.getName());
                if (end.equals("situationRecord") && inRecord) {
                    inRecord = false;
                    if (n > 0) {
                        JSONObject o = new JSONObject();
                        o.put("sid", situationId);
                        o.put("type", type);
                        o.put("lat", coords[0]);
                        o.put("lon", coords[1]);
                        if (n > 1) {
                            o.put("lat2", coords[(n - 1) * 2]);
                            o.put("lon2", coords[(n - 1) * 2 + 1]);
                        }
                        for (Map.Entry<String, String> e : fields.entrySet()) o.put(e.getKey(), e.getValue());
                        out.put(o);
                    }
                }
                tag = "";
            }
            ev = p.next();
        }
        return out;
    }
}
