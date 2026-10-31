const appConfig = {
  name: "VLPM Partners",
  slug: "vlpmp",
  scheme: "vlpm",
  version: "2.0.1",
  orientation: "portrait" as const,
  icon: "./assets/icon.png",
  userInterfaceStyle: "light" as const,
  newArchEnabled: true,
  owner: "ryan-ahn",
  ios: {
    bundleIdentifier: "com.vlpmpartnersrelease",
    supportsTablet: false,
  },
  android: {
    package: "com.vlpmpartnersrelease",
    versionCode: 10010,
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#8C3A2F",
    },
    blockedPermissions: [
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_BACKGROUND_LOCATION",
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
    ],
  },
  plugins: [
    "expo-dev-client",
    "expo-router",
    "expo-font",
    "expo-web-browser",
    [
      "expo-splash-screen",
      {
        image: "./assets/icon.png",
        imageWidth: 140,
        resizeMode: "contain",
        backgroundColor: "#F6F3EE",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          minSdkVersion: 24,
        },
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: "c51a4d83-63e9-48e6-aeac-3d32f7e09663",
    },
  },
};

export default appConfig;
