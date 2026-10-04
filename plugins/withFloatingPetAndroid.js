const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const pkg = require('../package.json');

const SERVICE_NAME = '.FloatingPetService';
const SPECIAL_USE_PERMISSION = 'android.permission.FOREGROUND_SERVICE_SPECIAL_USE';
const ENABLED_PETS = new Set([
  'Aquarius', 'Aries', 'Cancer', 'Capricorn', 'Gemini', 'Leo',
  'Libra', 'Pisces', 'Sagittarius', 'Scorpio', 'Taurus', 'Virgo',
]);
const FULL_STAGE_PETS = ENABLED_PETS;

function ensurePermission(manifest, permission) {
  manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'] || [];
  const exists = manifest.manifest['uses-permission'].some(
    (item) => item.$['android:name'] === permission
  );
  if (!exists) {
    manifest.manifest['uses-permission'].push({ $: { 'android:name': permission } });
  }
}

function ensureService(manifest) {
  const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  app.service = app.service || [];

  let service = app.service.find((item) => item.$['android:name'] === SERVICE_NAME);
  if (!service) {
    service = { $: { 'android:name': SERVICE_NAME } };
    app.service.push(service);
  }

  service.$['android:enabled'] = 'true';
  service.$['android:exported'] = 'false';
  service.$['android:foregroundServiceType'] = 'specialUse';
  service.property = [
    {
      $: {
        'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
        'android:value': 'floating_pet_overlay',
      },
    },
  ];
}

function packageToDir(packageName) {
  return packageName.split('.').join(path.sep);
}

function readStaticVector(value, fallback) {
  if (!value || !value.k) {
    return fallback;
  }
  if (Array.isArray(value.k)) {
    return value.k;
  }
  return [value.k, value.k];
}

function unionBounds(a, b) {
  if (!b) return a;
  if (!a) return { ...b };
  return {
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
  };
}

function transformBounds(bounds, layer) {
  if (!bounds || !layer?.ks) {
    return bounds;
  }

  const position = readStaticVector(layer.ks.p, [0, 0]);
  const anchor = readStaticVector(layer.ks.a, [0, 0]);
  const scale = readStaticVector(layer.ks.s, [100, 100]);
  const scaleX = (scale[0] ?? 100) / 100;
  const scaleY = (scale[1] ?? scale[0] ?? 100) / 100;
  const x = position[0] ?? 0;
  const y = position[1] ?? 0;
  const anchorX = anchor[0] ?? 0;
  const anchorY = anchor[1] ?? 0;

  return {
    left: x + (bounds.left - anchorX) * scaleX,
    top: y + (bounds.top - anchorY) * scaleY,
    right: x + (bounds.right - anchorX) * scaleX,
    bottom: y + (bounds.bottom - anchorY) * scaleY,
  };
}

function pngAlphaBounds(dataUrl) {
  const marker = 'base64,';
  const markerIndex = dataUrl.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  const buffer = Buffer.from(dataUrl.slice(markerIndex + marker.length), 'base64');
  const png = PNG.sync.read(buffer);
  let left = png.width;
  let top = png.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const alpha = png.data[(png.width * y + x) * 4 + 3];
      if (alpha > 0) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x + 1);
        bottom = Math.max(bottom, y + 1);
      }
    }
  }

  if (right < 0 || bottom < 0) {
    return null;
  }

  return { left, top, right, bottom };
}

function getAssetBounds(asset, assetsById, cache) {
  if (!asset) {
    return null;
  }
  if (cache.has(asset.id)) {
    return cache.get(asset.id);
  }

  let bounds = null;
  if (typeof asset.p === 'string' && asset.p.startsWith('data:image/png;base64,')) {
    bounds = pngAlphaBounds(asset.p);
  } else if (Array.isArray(asset.layers)) {
    for (const layer of asset.layers) {
      const child = getAssetBounds(assetsById.get(layer.refId), assetsById, cache);
      bounds = unionBounds(bounds, transformBounds(child, layer));
    }
  }

  cache.set(asset.id, bounds);
  return bounds;
}

function getLottieVisualBounds(filePath) {
  const lottie = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const assetsById = new Map((lottie.assets || []).map((asset) => [asset.id, asset]));
  const cache = new Map();
  let bounds = null;

  for (const layer of lottie.layers || []) {
    const assetBounds = getAssetBounds(assetsById.get(layer.refId), assetsById, cache);
    bounds = unionBounds(bounds, transformBounds(assetBounds, layer));
  }

  if (!bounds) {
    bounds = {
      left: 0,
      top: 0,
      right: lottie.w || 256,
      bottom: lottie.h || 256,
    };
  }

  const width = Math.max(1, bounds.right - bounds.left);
  const height = Math.max(1, bounds.bottom - bounds.top);
  return {
    left: bounds.left,
    top: bounds.top,
    width,
    height,
    centerX: bounds.left + width / 2,
    centerY: bounds.top + height / 2,
    compWidth: lottie.w || 256,
    compHeight: lottie.h || 256,
  };
}

function javaPackage(packageName, className, body) {
  return `package ${packageName};

${body.trim()}
`;
}

const floatingPetPackageBody = `
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class FloatingPetPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new FloatingPetModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`;

const floatingPetModuleBody = `
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class FloatingPetModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    FloatingPetModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "FloatingPet";
    }

    @ReactMethod
    public void checkOverlayPermission(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(reactContext));
        } else {
            promise.resolve(true);
        }
    }

    @ReactMethod
    public void requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
            Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + reactContext.getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
        }
    }

    @ReactMethod
    public void startFloatingPet(String skinName, double size, Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
                promise.reject("PERMISSION_DENIED", "Overlay permission not granted");
                return;
            }

            Intent intent = new Intent(reactContext, FloatingPetService.class);
            intent.putExtra("skinName", skinName);
            intent.putExtra("size", (int) size);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent);
            } else {
                reactContext.startService(intent);
            }

            promise.resolve(true);
        } catch (Exception error) {
            promise.reject("ERROR", error.getMessage());
        }
    }

    @ReactMethod
    public void stopFloatingPet(Promise promise) {
        try {
            Intent intent = new Intent(reactContext, FloatingPetService.class);
            reactContext.stopService(intent);
            promise.resolve(true);
        } catch (Exception error) {
            promise.reject("ERROR", error.getMessage());
        }
    }

    @ReactMethod
    public void isFloatingPetActive(Promise promise) {
        promise.resolve(FloatingPetService.isRunning());
    }

    @ReactMethod
    public void setFloatingPetVisible(boolean visible) {
        FloatingPetService.setOverlayVisible(visible);
    }
}
`;

function floatingPetServiceBody(packageName) {
  return `
import android.animation.Animator;
import android.animation.ValueAnimator;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.view.GestureDetector;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.WindowManager;
import android.view.animation.OvershootInterpolator;
import android.widget.FrameLayout;

import androidx.core.app.NotificationCompat;

import com.airbnb.lottie.LottieAnimationView;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import org.json.JSONObject;

public class FloatingPetService extends Service {
    private static final String CHANNEL_ID = "floating_pet_channel";
    private static final String PREFS_NAME = "floating_pet";
    private static final String ACTION_STOP = "${packageName}.FLOATING_PET_STOP";
    private static final String[] DEFAULT_STAGE_PATHS = {
            "stages_1/A1.json",
            "stages_1/A2.json",
            "stages_1/A3.json",
            "stages_1/A4.json",
            "stages_1/A5.json",
            "stages_1/A6.json",
            "stages_1/A7.json",
            "states_2/8s.json",
            "states_2/happy_3.json",
            "states_2/happy_4.json",
            "states_2/nhay.json"
    };
    private static final String[] SCORPIO_STAGE_PATHS = {
            "stages_1/A1_256x256.json",
            "stages_1/A2_256x256.json",
            "stages_1/A3_256x256.json",
            "stages_1/A4_256x256.json",
            "stages_1/A5_256x256.json",
            "stages_1/A6_256x256.json",
            "stages_1/A7_256x256.json",
            "states_2/8s.json",
            "states_2/happy_3.json",
            "states_2/happy_4.json",
            "states_2/nhay.json"
    };
    private static boolean running = false;
    private static FloatingPetService activeService;
    private static boolean overlayVisible = true;

    private WindowManager windowManager;
    private View floatingView;
    private LottieAnimationView lottieView;
    private WindowManager.LayoutParams params;
    private GestureDetector gestureDetector;
    private SharedPreferences preferences;
    private String petFolder = "Aries";
    private int petSize = 336;
    private int overlayBleed = 168;
    private int overlaySize = 672;
    private int initialX;
    private int initialY;
    private float initialTouchX;
    private float initialTouchY;
    private boolean isDragging = false;
    private int touchSlop;
    private int currentStageIndex = -1;
    private JSONObject visualBounds;

    public static boolean isRunning() {
        return running;
    }

    public static void setOverlayVisible(boolean visible) {
        overlayVisible = visible;
        FloatingPetService service = activeService;
        if (service == null) {
            return;
        }
        new Handler(Looper.getMainLooper()).post(() -> service.applyOverlayVisibility());
    }

    @Override
    public void onCreate() {
        super.onCreate();
        running = true;
        activeService = this;
        preferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        touchSlop = ViewConfiguration.get(this).getScaledTouchSlop();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        if (intent != null) {
            petFolder = normalizeSkinName(intent.getStringExtra("skinName"));
            petSize = Math.max(160, Math.min(520, intent.getIntExtra("size", 336)));
            overlayBleed = Math.round(petSize * 0.5f);
            overlaySize = petSize + (overlayBleed * 2);
            currentStageIndex = preferences.getInt("stageIndex_" + petFolder, -1);
        }

        startForeground(1, createNotification());
        createOrUpdateFloatingView();
        return START_STICKY;
    }

    private void createOrUpdateFloatingView() {
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        if (windowManager == null) {
            stopSelf();
            return;
        }

        if (floatingView != null) {
            windowManager.removeView(floatingView);
            floatingView = null;
        }

        LayoutInflater inflater = (LayoutInflater) getSystemService(LAYOUT_INFLATER_SERVICE);
        floatingView = inflater.inflate(R.layout.floating_pet_layout, null);
        lottieView = floatingView.findViewById(R.id.lottie_animation);
        lottieView.setClipToOutline(false);
        FrameLayout.LayoutParams lottieParams = new FrameLayout.LayoutParams(petSize, petSize, Gravity.CENTER);
        lottieView.setLayoutParams(lottieParams);
        loadVisualBounds();
        loadAnimation("homescreen.json");

        params = new WindowManager.LayoutParams(
                overlaySize,
                overlaySize,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.TOP | Gravity.START;
        params.x = preferences.getInt("x", 80) - overlayBleed;
        params.y = preferences.getInt("y", 240) - overlayBleed;

        gestureDetector = new GestureDetector(this, new PetGestureListener());
        lottieView.setOnTouchListener(this::handleTouch);
        windowManager.addView(floatingView, params);
        applyOverlayVisibility();
    }

    private void applyOverlayVisibility() {
        if (floatingView != null) {
            floatingView.setVisibility(overlayVisible ? View.VISIBLE : View.GONE);
        }
    }

    private boolean handleTouch(View view, MotionEvent event) {
        if (gestureDetector != null) {
            gestureDetector.onTouchEvent(event);
        }

        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                initialX = params.x;
                initialY = params.y;
                initialTouchX = event.getRawX();
                initialTouchY = event.getRawY();
                isDragging = false;
                view.animate().scaleX(0.94f).scaleY(0.94f).setDuration(90).start();
                return true;

            case MotionEvent.ACTION_MOVE:
                int deltaX = (int) (event.getRawX() - initialTouchX);
                int deltaY = (int) (event.getRawY() - initialTouchY);
                if (!isDragging && Math.hypot(deltaX, deltaY) > touchSlop) {
                    isDragging = true;
                }
                if (isDragging) {
                    params.x = initialX + deltaX;
                    params.y = initialY + deltaY;
                    windowManager.updateViewLayout(floatingView, params);
                }
                return true;

            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                view.animate().scaleX(1f).scaleY(1f).setDuration(120).start();
                if (isDragging) {
                    snapToNearestEdge();
                }
                return true;

            default:
                return true;
        }
    }

    private void snapToNearestEdge() {
        int screenWidth = getResources().getDisplayMetrics().widthPixels;
        int logicalX = params.x + overlayBleed;
        int targetLogicalX = logicalX + (petSize / 2) < screenWidth / 2 ? 0 : screenWidth - petSize;
        int targetX = targetLogicalX - overlayBleed;
        int startX = params.x;
        preferences.edit().putInt("x", targetLogicalX).putInt("y", params.y + overlayBleed).apply();

        ValueAnimator animator = ValueAnimator.ofInt(startX, targetX);
        animator.setDuration(280);
        animator.setInterpolator(new OvershootInterpolator(0.8f));
        animator.addUpdateListener(animation -> {
            params.x = (int) animation.getAnimatedValue();
            try {
                windowManager.updateViewLayout(floatingView, params);
            } catch (IllegalArgumentException ignored) {
            }
        });
        animator.start();
    }

    private void savePosition() {
        preferences.edit().putInt("x", params.x + overlayBleed).putInt("y", params.y + overlayBleed).apply();
    }

    private String[] getStagePaths() {
        return "Scorpio".equals(petFolder) ? SCORPIO_STAGE_PATHS : DEFAULT_STAGE_PATHS;
    }

    private void advanceStage(int step) {
        String[] stagePaths = getStagePaths();
        currentStageIndex = (currentStageIndex + step) % stagePaths.length;
        if (currentStageIndex < 0) {
            currentStageIndex += stagePaths.length;
        }
        preferences.edit().putInt("stageIndex_" + petFolder, currentStageIndex).apply();
        loadAnimation(stagePaths[currentStageIndex]);
    }

    private void setStage(int stageIndex) {
        String[] stagePaths = getStagePaths();
        currentStageIndex = stageIndex % stagePaths.length;
        if (currentStageIndex < 0) {
            currentStageIndex += stagePaths.length;
        }
        preferences.edit().putInt("stageIndex_" + petFolder, currentStageIndex).apply();
        loadAnimation(stagePaths[currentStageIndex]);
    }

    private void loadAnimation(String relativePath) {
        if (lottieView == null) {
            return;
        }

        lottieView.removeAllAnimatorListeners();
        lottieView.cancelAnimation();

        String path = "Pets/" + petFolder + "/256/" + relativePath;
        String fallbackPath = "Pets/" + petFolder + "/256/" + relativePath.replace(".json", "_256x256.json");
        String loadedPath = path;
        try {
            getAssets().open(path).close();
            lottieView.setAnimation(path);
        } catch (IOException error) {
            try {
                getAssets().open(fallbackPath).close();
                lottieView.setAnimation(fallbackPath);
                loadedPath = fallbackPath;
            } catch (IOException fallbackError) {
                String petHomePath = "Pets/" + petFolder + "/256/homescreen.json";
                try {
                    getAssets().open(petHomePath).close();
                    loadedPath = petHomePath;
                    lottieView.setAnimation(loadedPath);
                } catch (IOException petHomeError) {
                    loadedPath = "Pets/Aries/256/homescreen.json";
                    lottieView.setAnimation(loadedPath);
                }
            }
        }
        lottieView.setRepeatCount(0);
        lottieView.addAnimatorListener(new Animator.AnimatorListener() {
            @Override
            public void onAnimationStart(Animator animation) {
            }

            @Override
            public void onAnimationEnd(Animator animation) {
                new Handler(Looper.getMainLooper()).post(() -> advanceStage(1));
            }

            @Override
            public void onAnimationCancel(Animator animation) {
            }

            @Override
            public void onAnimationRepeat(Animator animation) {
            }
        });
        lottieView.playAnimation();
        applyVisualNormalization(loadedPath);
    }

    private void loadVisualBounds() {
        if (visualBounds != null) {
            return;
        }
        try (InputStream stream = getAssets().open("Pets/visual_bounds.json")) {
            byte[] bytes = new byte[stream.available()];
            stream.read(bytes);
            visualBounds = new JSONObject(new String(bytes, StandardCharsets.UTF_8));
        } catch (Exception ignored) {
            visualBounds = new JSONObject();
        }
    }

    private void applyVisualNormalization(String assetPath) {
        if (lottieView == null || visualBounds == null) {
            return;
        }

        JSONObject bounds = visualBounds.optJSONObject(assetPath);
        if (bounds == null) {
            lottieView.setScaleX(1f);
            lottieView.setScaleY(1f);
            lottieView.setTranslationX(0f);
            lottieView.setTranslationY(0f);
            return;
        }

        float compWidth = (float) bounds.optDouble("compWidth", 256);
        float compHeight = (float) bounds.optDouble("compHeight", 256);
        float visualHeight = (float) bounds.optDouble("height", compHeight);
        float centerX = (float) bounds.optDouble("centerX", compWidth / 2f);
        float centerY = (float) bounds.optDouble("centerY", compHeight / 2f);
        float scale = compHeight / Math.max(1f, visualHeight);

        lottieView.setPivotX(petSize / 2f);
        lottieView.setPivotY(petSize / 2f);
        lottieView.setScaleX(scale);
        lottieView.setScaleY(scale);
        lottieView.setTranslationX((compWidth / 2f - centerX) * (petSize / compWidth) * scale);
        lottieView.setTranslationY((compHeight / 2f - centerY) * (petSize / compHeight) * scale);
    }

    private String normalizeSkinName(String skinName) {
        if (skinName == null || skinName.trim().isEmpty()) {
            return "Aries";
        }
        String[] parts = skinName.trim().split("\\\\s+");
        return parts.length > 0 && !parts[0].isEmpty() ? parts[0] : "Aries";
    }

    private android.app.Notification createNotification() {
        Intent openAppIntent = new Intent(this, MainActivity.class);
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
                this,
                0,
                openAppIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        Intent stopIntent = new Intent(this, FloatingPetService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(
                this,
                1,
                stopIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Robot Pet")
                .setContentText("Pet đang chơi ngoài ứng dụng")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentIntent(openAppPendingIntent)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Tắt pet", stopPendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Floating Pet",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Hiển thị pet tương tác ngoài ứng dụng");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        running = false;
        if (lottieView != null) {
            lottieView.removeAllAnimatorListeners();
            lottieView.cancelAnimation();
        }
        if (floatingView != null && windowManager != null) {
            try {
                windowManager.removeView(floatingView);
            } catch (IllegalArgumentException ignored) {
            }
        }
        if (activeService == this) {
            activeService = null;
        }
        floatingView = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private class PetGestureListener extends GestureDetector.SimpleOnGestureListener {
        @Override
        public boolean onSingleTapConfirmed(MotionEvent event) {
            if (!isDragging) {
                setStage(5);
            }
            return true;
        }

        @Override
        public boolean onDoubleTap(MotionEvent event) {
            if (!isDragging) {
                setStage(10);
            }
            return true;
        }

        @Override
        public void onLongPress(MotionEvent event) {
            if (!isDragging) {
                setStage(6);
            }
        }

        @Override
        public boolean onDown(MotionEvent event) {
            return true;
        }
    }
}
`;
}

const layoutXml = `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@android:color/transparent"
    android:clipChildren="false"
    android:clipToPadding="false">

    <com.airbnb.lottie.LottieAnimationView
        android:id="@+id/lottie_animation"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:clipChildren="false"
        android:clipToPadding="false"
        app:lottie_autoPlay="true"
        app:lottie_loop="false" />

</FrameLayout>
`;

function patchMainApplication(content, packageName) {
  if (content.includes('FloatingPetPackage')) {
    if (content.includes('FloatingPetPackage()')) {
      return content;
    }
  }

  if (content.includes('class MainApplication') && content.includes('PackageList(this).packages')) {
    const importLine = `import ${packageName}.FloatingPetPackage\n`;
    let next = content.includes(importLine) ? content : content.replace(/^import /m, `${importLine}import `);
    if (next.includes('PackageList(this).packages.apply {')) {
      return next.replace(
        /(PackageList\(this\)\.packages\.apply \{\s*)/,
        '$1\n              add(FloatingPetPackage())'
      );
    }
    return next.replace(
      /val packages = PackageList\(this\)\.packages\s*\n\s*return packages/,
      'val packages = PackageList(this).packages\n          packages.add(FloatingPetPackage())\n          return packages'
    );
  }

  const importLine = `import ${packageName}.FloatingPetPackage;\n`;
  let next = content.includes(importLine) ? content : content.replace(/^import /m, `${importLine}import `);
  return next.replace(
    /(List<ReactPackage> packages = new PackageList\(this\)\.getPackages\(\);\s*)/,
    '$1\n          packages.add(new FloatingPetPackage());\n'
  );
}

function patchAppBuildGradle(content) {
  const dependency = 'implementation("com.airbnb.android:lottie:6.5.2")';
  if (content.includes(dependency) || content.includes("implementation 'com.airbnb.android:lottie:6.5.2'")) {
    return content;
  }

  return content.replace(
    /implementation\("com\.facebook\.react:react-android"\)/,
    `implementation("com.facebook.react:react-android")\n    ${dependency}`
  );
}

function copyPetAssets(projectRoot) {
  const source = path.join(projectRoot, 'assets', 'Pets');
  const target = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'Pets');
  const visualBounds = {};
  if (!fs.existsSync(source)) {
    return;
  }
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });

  for (const petFolder of fs.readdirSync(source)) {
    if (petFolder.startsWith('.') || petFolder === '.DS_Store' || !ENABLED_PETS.has(petFolder)) {
      continue;
    }

    const petSource = path.join(source, petFolder, '256');
    if (!fs.existsSync(petSource)) {
      continue;
    }

    const petTarget = path.join(target, petFolder, '256');
    fs.mkdirSync(path.dirname(petTarget), { recursive: true });
    if (FULL_STAGE_PETS.has(petFolder)) {
      fs.cpSync(petSource, petTarget, {
        recursive: true,
        filter: (sourcePath) => path.basename(sourcePath) !== '.DS_Store',
      });
    } else {
      fs.mkdirSync(petTarget, { recursive: true });
      const homeSource = path.join(petSource, 'homescreen.json');
      if (fs.existsSync(homeSource)) {
        fs.copyFileSync(homeSource, path.join(petTarget, 'homescreen.json'));
      }
    }

    const jsonFiles = [];
    const collectJsonFiles = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const entryPath = path.join(dir, entry.name);
        if (entry.name === '.DS_Store') {
          continue;
        }
        if (entry.isDirectory()) {
          collectJsonFiles(entryPath);
        } else if (entry.name.endsWith('.json')) {
          jsonFiles.push(entryPath);
        }
      }
    };

    if (FULL_STAGE_PETS.has(petFolder)) {
      collectJsonFiles(petSource);
    } else {
      const homeSource = path.join(petSource, 'homescreen.json');
      if (fs.existsSync(homeSource)) jsonFiles.push(homeSource);
    }
    for (const jsonFile of jsonFiles) {
      const relative = path.relative(petSource, jsonFile).split(path.sep).join('/');
      const assetKey = `Pets/${petFolder}/256/${relative}`;
      visualBounds[assetKey] = getLottieVisualBounds(jsonFile);
    }
  }

  fs.writeFileSync(
    path.join(target, 'visual_bounds.json'),
    JSON.stringify(visualBounds)
  );
}

function writeNativeFiles(projectRoot, packageName) {
  const javaDir = path.join(
    projectRoot,
    'android',
    'app',
    'src',
    'main',
    'java',
    packageToDir(packageName)
  );
  fs.mkdirSync(javaDir, { recursive: true });

  fs.writeFileSync(
    path.join(javaDir, 'FloatingPetPackage.java'),
    javaPackage(packageName, 'FloatingPetPackage', floatingPetPackageBody)
  );
  fs.writeFileSync(
    path.join(javaDir, 'FloatingPetModule.java'),
    javaPackage(packageName, 'FloatingPetModule', floatingPetModuleBody)
  );
  fs.writeFileSync(
    path.join(javaDir, 'FloatingPetService.java'),
    javaPackage(packageName, 'FloatingPetService', floatingPetServiceBody(packageName))
  );

  const layoutDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'layout');
  fs.mkdirSync(layoutDir, { recursive: true });
  fs.writeFileSync(path.join(layoutDir, 'floating_pet_layout.xml'), layoutXml);

  const mainAppKt = path.join(javaDir, 'MainApplication.kt');
  const mainAppJava = path.join(javaDir, 'MainApplication.java');
  const mainAppPath = fs.existsSync(mainAppKt) ? mainAppKt : mainAppJava;
  if (fs.existsSync(mainAppPath)) {
    fs.writeFileSync(mainAppPath, patchMainApplication(fs.readFileSync(mainAppPath, 'utf8'), packageName));
  }

  const appBuildGradle = path.join(projectRoot, 'android', 'app', 'build.gradle');
  if (fs.existsSync(appBuildGradle)) {
    fs.writeFileSync(appBuildGradle, patchAppBuildGradle(fs.readFileSync(appBuildGradle, 'utf8')));
  }
}

function withFloatingPetAndroid(config) {
  config = withAndroidManifest(config, (mod) => {
    ensurePermission(mod.modResults, 'android.permission.SYSTEM_ALERT_WINDOW');
    ensurePermission(mod.modResults, 'android.permission.FOREGROUND_SERVICE');
    ensurePermission(mod.modResults, SPECIAL_USE_PERMISSION);
    ensurePermission(mod.modResults, 'android.permission.POST_NOTIFICATIONS');
    ensureService(mod.modResults);
    return mod;
  });

  return withDangerousMod(config, [
    'android',
    (mod) => {
      const packageName =
        mod.modRequest.config?.android?.package ||
        mod.modRequest.exp?.android?.package ||
        'com.robotpet.manager';
      writeNativeFiles(mod.modRequest.projectRoot, packageName);
      copyPetAssets(mod.modRequest.projectRoot);
      return mod;
    },
  ]);
}

module.exports = createRunOncePlugin(withFloatingPetAndroid, 'with-floating-pet-android', pkg.version);
