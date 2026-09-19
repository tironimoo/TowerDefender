package de.towerdefender.spiel;

import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;

import androidx.core.content.pm.PackageInfoCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Einstiegspunkt der App.
 *
 * Das Spiel laeuft in einer WebView. Hier wird nur das Fenster eingerichtet:
 * Vollbild ohne Status- und Navigationsleiste, denn die Karte braucht jeden
 * Pixel. Die Leisten kommen mit einem Wisch vom Rand zurueck und verschwinden
 * danach wieder von selbst.
 */
public class MainActivity extends BridgeActivity {

    /** Eigener Ablageort. Der Spielstand liegt woanders und bleibt unberuehrt. */
    private static final String ABLAGE = "towerdefender.app";
    private static final String SCHLUESSEL_FASSUNG = "zuletztGestarteteFassung";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        leereZwischenspeicherBeiNeuerFassung();
        versteckeSystemleisten();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // Nach jedem Wechsel zurueck in die App wieder auf Vollbild gehen.
        if (hasFocus) {
            versteckeSystemleisten();
        }
    }

    /**
     * Wirft den Zwischenspeicher der WebView weg, wenn eine neue Fassung
     * installiert wurde.
     *
     * Ohne das ueberlebt der Zwischenspeicher die Neuinstallation: die App
     * bringt zwar neue Dateien mit, die WebView liefert aber weiter die alte
     * index.html aus und damit die alten Verweise auf die alten Skripte. Von
     * aussen sieht es dann so aus, als sei das Update nicht angekommen.
     *
     * Der Spielstand liegt in einer anderen Ablage und bleibt erhalten.
     */
    private void leereZwischenspeicherBeiNeuerFassung() {
        long jetzt = fassungsnummer();
        if (jetzt < 0) {
            return;
        }
        SharedPreferences ablage = getSharedPreferences(ABLAGE, MODE_PRIVATE);
        if (ablage.getLong(SCHLUESSEL_FASSUNG, -1L) == jetzt) {
            return;
        }

        WebView ansicht = getBridge() == null ? null : getBridge().getWebView();
        if (ansicht != null) {
            ansicht.clearCache(true);
            ansicht.clearHistory();
        }
        ablage.edit().putLong(SCHLUESSEL_FASSUNG, jetzt).apply();
    }

    /** Fassungsnummer der installierten App, oder minus eins, wenn unbekannt. */
    private long fassungsnummer() {
        try {
            return PackageInfoCompat.getLongVersionCode(
                    getPackageManager().getPackageInfo(getPackageName(), 0));
        } catch (PackageManager.NameNotFoundException fehlt) {
            // Kann fuer das eigene Paket nicht passieren. Falls doch, lieber
            // nichts loeschen als raten.
            return -1L;
        }
    }

    private void versteckeSystemleisten() {
        View wurzel = getWindow().getDecorView();
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        WindowInsetsControllerCompat steuerung =
                WindowCompat.getInsetsController(getWindow(), wurzel);
        steuerung.hide(WindowInsetsCompat.Type.systemBars());
        steuerung.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
