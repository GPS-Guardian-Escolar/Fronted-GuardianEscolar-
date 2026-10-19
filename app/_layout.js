import { Slot, useRouter, useSegments } from 'expo-router';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';

import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { createPaperTheme, ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { hasSeenOnboarding } from '../features/onboarding/onboardingStorage';
import { handleLocationTask, LOCATION_TASK_NAME } from '../services/background/locationTracking';

import { SafeAreaProvider } from 'react-native-safe-area-context';

if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
  TaskManager.defineTask(LOCATION_TASK_NAME, handleLocationTask);
}

function RootLayoutNav() {
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { theme: themeData } = useTheme();
  const [onboardingSeen, setOnboardingSeen] = useState(null);

  useEffect(() => {
    let mounted = true;
    hasSeenOnboarding()
      .then(seen => {
        if (mounted) setOnboardingSeen(seen);
      })
      .catch(() => {
        if (mounted) setOnboardingSeen(false);
      });
    return () => {
      mounted = false;
    };
  }, [segments]);

  useEffect(() => {
    if (loading || onboardingSeen === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const isWelcome = inAuthGroup && segments[1] === 'welcome';
    const isStudentDashboard = segments[0] === 'student-dashboard';
    const isScanQr = segments[0] === 'scan-qr';

    if (!onboardingSeen && !isWelcome && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (!isAuthenticated && !inAuthGroup && !isStudentDashboard && !isScanQr) {
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && !inTabsGroup && !isStudentDashboard && !isScanQr) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, loading, onboardingSeen, router, segments]);

  if (loading || onboardingSeen === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeData.colors.background }}>
        <ActivityIndicator size="large" color={themeData.colors.primary} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;

    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlWidth: html.style.width,
      bodyMargin: body.style.margin,
      bodyWidth: body.style.width,
      bodyOverflowX: body.style.overflowX,
    };

    html.style.width = '100%';
    body.style.margin = '0';
    body.style.width = '100%';
    body.style.overflowX = 'hidden';

    return () => {
      html.style.width = previous.htmlWidth;
      body.style.margin = previous.bodyMargin;
      body.style.width = previous.bodyWidth;
      body.style.overflowX = previous.bodyOverflowX;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;

    // Expo Web can reject the icon-font verification promise when the development
    // server is slow or temporarily unreachable. Keep that optional font failure
    // from replacing the whole application with the development error overlay.
    const ignoreOptionalFontTimeout = (event) => {
      const reason = event.reason;
      const message = String(reason?.message || reason || '');
      const stack = String(reason?.stack || '');
      if (message.includes('timeout exceeded') && stack.includes('fontfaceobserver')) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', ignoreOptionalFontTimeout);
    return () => window.removeEventListener('unhandledrejection', ignoreOptionalFontTimeout);
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutContent() {
  const { isDark } = useTheme();
  const paperTheme = isDark ? MD3DarkTheme : MD3LightTheme;
  const customTheme = createPaperTheme(isDark);

  return (
    <PaperProvider theme={{ ...paperTheme, colors: customTheme.colors }}>
      <AuthProvider>
        <LanguageProvider>
          <RootLayoutNav />
        </LanguageProvider>
      </AuthProvider>
    </PaperProvider>
  );
}
