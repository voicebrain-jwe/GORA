package com.gora.app;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Up to Android 14, android:windowSoftInputMode="adjustResize" (manifest) already
        // shrinks the page above the keyboard. Adding padding there too shrinks it twice
        // and leaves an empty gap above the keyboard.
        //
        // Android 15+ draws apps edge to edge and stops resizing the window for the
        // keyboard, so there the page is shrunk by hand to keep headers on screen.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            return;
        }

        View content = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, insets) -> {
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.navigationBars());
            // The navigation bar area is already handled by the page's safe-area padding.
            view.setPadding(0, 0, 0, Math.max(0, ime.bottom - bars.bottom));
            return insets;
        });
    }
}
