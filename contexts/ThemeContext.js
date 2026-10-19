import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme } from '../theme/darkTheme';
import { lightTheme } from '../theme/lightTheme';

const THEME_KEY = '@guardian_theme';

const ThemeContext = createContext({
  theme: lightTheme,
  isDark: false,
  setThemeMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved === 'dark' || saved === 'light') {
          setIsDark(saved === 'dark');
        }
      } catch (error) {
        console.warn('Error loading theme:', error);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const setThemeMode = useCallback(async (mode) => {
    const nextIsDark = mode === 'dark';
    setIsDark(nextIsDark);
    try {
      await AsyncStorage.setItem(THEME_KEY, nextIsDark ? 'dark' : 'light');
    } catch (error) {
      console.warn('Error saving theme:', error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(isDark ? 'light' : 'dark');
  }, [isDark, setThemeMode]);

  if (!isLoaded) return null;

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

export const createPaperTheme = (isDark) => {
  const themeColors = isDark ? darkTheme.colors : lightTheme.colors;

  return {
    dark: isDark,
    colors: {
      primary: themeColors.primary,
      secondary: themeColors.accent,
      tertiary: themeColors.info,
      background: themeColors.background,
      surface: themeColors.surface,
      surfaceVariant: themeColors.surfaceSecondary,
      error: themeColors.error,
      onError: themeColors.onError,
      outline: themeColors.border,
      outlineVariant: themeColors.borderLight,
      onPrimary: themeColors.textOnPrimary,
      onSecondary: themeColors.textOnAccent,
      onBackground: themeColors.text,
      onSurface: themeColors.text,
      onSurfaceVariant: themeColors.textSecondary,
      inverseSurface: themeColors.text,
      inverseOnSurface: themeColors.background,
      elevation: {
        level0: themeColors.background,
        level1: themeColors.surface,
        level2: themeColors.surfaceElevated,
        level3: themeColors.surfaceElevated,
        level4: themeColors.surfaceElevated,
        level5: themeColors.surfaceElevated,
      },
    },
  };
};
