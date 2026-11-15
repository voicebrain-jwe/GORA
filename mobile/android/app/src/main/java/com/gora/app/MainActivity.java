package com.gora.app;

import com.getcapacitor.BridgeActivity;

/**
 * The keyboard is handled by android:windowSoftInputMode="adjustResize" in the
 * manifest: the page shrinks above the keyboard, so headers stay on screen. Do not
 * add keyboard padding here as well; the page would shrink twice and leave an
 * empty gap above the keyboard.
 */
public class MainActivity extends BridgeActivity {}
