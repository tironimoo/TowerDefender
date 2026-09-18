package de.towerdefender.spiel;

import android.os.Bundle;
import android.view.View;

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

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
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
