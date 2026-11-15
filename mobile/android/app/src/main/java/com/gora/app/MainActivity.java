package com.gora.app;

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

        // Android 15+ draws apps edge to edge, so the keyboard no longer resizes the
        // window and the system pans the whole page up instead, hiding the header.
        // Shrink the content above the keyboard so headers (e.g. club chat) stay visible.
        View content = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, insets) -> {
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(0, 0, 0, ime.bottom);
            return insets;
        });
    }
}
