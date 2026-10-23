import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Modal, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/ui/AppButton';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { markOnboardingSeen } from '../../features/onboarding/onboardingStorage';
import { SUPPORTED_LANGUAGES } from '../../translations';
import { AppSpacing, AppTouch, AppTypography } from '../../theme/tokens';

const slides = [
  { id: 'safety', icon: 'shield-check-outline', titleKey: 'welcomeSlide1Title', textKey: 'welcomeSlide1Text' },
  { id: 'guardian', icon: 'qrcode', titleKey: 'welcomeSlide2Title', textKey: 'welcomeSlide2Text' },
  { id: 'student-phone', icon: 'qrcode-scan', titleKey: 'welcomeSlide3Title', textKey: 'welcomeSlide3Text' },
  { id: 'privacy', icon: 'lock-check-outline', titleKey: 'welcomeSlide4Title', textKey: 'welcomeSlide4Text' },
  { id: 'start', icon: 'rocket-launch-outline', titleKey: 'welcomeSlide5Title', textKey: 'welcomeSlide5Text' },
];
const AUTO_ADVANCE_MS = 6000;

export default function WelcomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { lang, setLanguage, t } = useLanguage();
  const { theme, isDark, toggleTheme } = useTheme();
  const colors = theme.colors;
  const listRef = useRef(null);
  const fade = useRef(new Animated.Value(1)).current;
  const [activeIndex, setActiveIndex] = useState(0);
  const [langModalVisible, setLangModalVisible] = useState(false);

  const goToIndex = useCallback((index) => {
    const bounded = Math.max(0, Math.min(index, slides.length - 1));
    Animated.sequence([
      Animated.timing(fade, { toValue: 0.55, duration: 90, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
    listRef.current?.scrollToIndex({ index: bounded, animated: true });
    setActiveIndex(bounded);
  }, [fade]);

  const finish = useCallback(async (pathname) => {
    await markOnboardingSeen();
    router.replace(pathname);
  }, [router]);

  const next = useCallback(() => {
    if (activeIndex >= slides.length - 1) {
      finish('/(auth)/register');
      return;
    }
    goToIndex(activeIndex + 1);
  }, [activeIndex, finish, goToIndex]);

  const previous = useCallback(() => {
    goToIndex(activeIndex - 1);
  }, [activeIndex, goToIndex]);

  const skip = useCallback(() => {
    finish('/(auth)/login');
  }, [finish]);

  useEffect(() => {
    if (activeIndex >= slides.length - 1 || langModalVisible) return undefined;

    const timer = setTimeout(() => {
      goToIndex(activeIndex + 1);
    }, AUTO_ADVANCE_MS);

    return () => clearTimeout(timer);
  }, [activeIndex, goToIndex, langModalVisible]);

  const renderSlide = ({ item, index }) => (
    <Animated.View style={[styles.slide, { width, opacity: fade }]} accessibilityRole="header">
      <MaterialCommunityIcons name={item.icon} size={48} color={colors.primary} />
      <Text style={[styles.slideTitle, { color: colors.text }]}>{t(item.titleKey)}</Text>
      <Text style={[styles.slideText, { color: colors.textSecondary }]}>{t(item.textKey)}</Text>

      {index === slides.length - 1 && (
        <View style={styles.ctaStack}>
          <AppButton title={t('welcomeStart')} onPress={() => finish('/(auth)/register')} accessibilityLabel={t('welcomeStart')} />
          <AppButton title={t('welcomeHaveAccount')} variant="secondary" onPress={() => finish('/(auth)/login')} accessibilityLabel={t('welcomeHaveAccount')} />
          <AppButton
            title={t('welcomeStudentScan')}
            variant="ghost"
            onPress={() => finish({ pathname: '/scan-qr', params: { relink: '1' } })}
            accessibilityLabel={t('welcomeStudentScan')}
            accessibilityHint={t('welcomeStudentScanHint')}
          />
        </View>
      )}
    </Animated.View>
  );

  const renderLangItem = ({ item }) => {
    const isSelected = lang === item.code;
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${t('welcomeChangeLanguage')} ${item.label}`}
        style={[
          styles.langItem,
          { borderBottomColor: colors.border },
          isSelected && { backgroundColor: colors.surfaceSecondary },
          !item.available && { opacity: 0.5 },
        ]}
        onPress={() => {
          if (!item.available) return;
          setLanguage(item.code);
          setLangModalVisible(false);
        }}
      >
        <Text style={styles.langFlag}>{item.flag}</Text>
        <Text style={[styles.langLabel, { color: isSelected ? colors.primary : colors.text }]}>{t(({ es: 'langEs', en: 'langEn', fr: 'langFr', pt: 'langPt' })[item.code])}</Text>
        {isSelected && <MaterialCommunityIcons name="check" size={20} color={colors.accent} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.topButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setLangModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('welcomeChangeLanguage')}
        >
          <MaterialCommunityIcons name="web" size={24} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.topButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={toggleTheme}
          accessibilityRole="button"
          accessibilityLabel={t(isDark ? 'themeLight' : 'themeDark')}
        >
          <MaterialCommunityIcons name={isDark ? 'white-balance-sunny' : 'moon-waning-crescent'} size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.skipButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={skip}
          accessibilityRole="button"
          accessibilityLabel={t('welcomeSkip')}
        >
          <Text style={[styles.skipText, { color: colors.primary }]}>{t('welcomeSkip')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logoWrap}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          contentFit="contain"
          accessibilityRole="image"
          accessibilityLabel="Logo de GPS Guardian Escolar"
        />
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={renderSlide}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onScrollToIndexFailed={({ index }) => {
          listRef.current?.scrollToOffset({ offset: width * index, animated: true });
          setActiveIndex(index);
        }}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          setActiveIndex(nextIndex);
        }}
      />

      <View style={styles.footer}>
        <View style={styles.indicators} accessibilityRole="text" accessibilityLabel={t('welcomePage').replace('{current}', String(activeIndex + 1)).replace('{total}', String(slides.length))}>
          {slides.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.indicator,
                { backgroundColor: index === activeIndex ? colors.primary : colors.border },
              ]}
            />
          ))}
        </View>
        {activeIndex < slides.length - 1 && (
          <View style={styles.navRow}>
            <AppButton
              title={t('welcomeBack')}
              variant="secondary"
              disabled={activeIndex === 0}
              onPress={previous}
              accessibilityLabel={t('welcomeBack')}
            />
            <AppButton
              title={t('welcomeNext')}
              onPress={next}
              accessibilityLabel={t('welcomeNext')}
            />
          </View>
        )}
      </View>

      <Modal visible={langModalVisible} transparent animationType="fade" onRequestClose={() => setLangModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setLangModalVisible(false)}
                style={styles.modalIconBtn}
                accessibilityRole="button"
                accessibilityLabel={t('close')}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>{t('profileSelectLang')}</Text>
            </View>
            <FlatList
              data={SUPPORTED_LANGUAGES}
              keyExtractor={item => item.code}
              renderItem={renderLangItem}
              scrollEnabled={false}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.md,
    paddingTop: AppSpacing.sm,
    zIndex: 10,
  },
  topButton: {
    alignItems: 'center',
    borderRadius: AppTouch.icon / 2,
    borderWidth: 1,
    height: AppTouch.icon,
    justifyContent: 'center',
    width: AppTouch.icon,
  },
  skipButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: AppTouch.min,
    paddingHorizontal: AppSpacing.md,
  },
  skipText: {
    ...AppTypography.sm,
    fontWeight: '700',
  },
  logoWrap: {
    alignItems: 'center',
    paddingTop: AppSpacing.md,
  },
  logo: {
    height: 132,
    width: 132,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AppSpacing.xl,
  },
  slideTitle: {
    ...AppTypography.xxl,
    marginTop: AppSpacing.md,
    textAlign: 'center',
  },
  slideText: {
    ...AppTypography.md,
    marginTop: AppSpacing.sm,
    maxWidth: 380,
    textAlign: 'center',
  },
  ctaStack: {
    gap: AppSpacing.sm,
    marginTop: AppSpacing.lg,
    maxWidth: 360,
    width: '100%',
  },
  footer: {
    gap: AppSpacing.md,
    padding: AppSpacing.md,
  },
  indicators: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
    justifyContent: 'center',
  },
  indicator: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  navRow: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
    justifyContent: 'center',
  },
  modalOverlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: AppSpacing.lg,
  },
  modalContent: {
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 380,
    padding: AppSpacing.md,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: AppSpacing.sm,
  },
  modalIconBtn: {
    alignItems: 'center',
    height: AppTouch.icon,
    justifyContent: 'center',
    marginRight: AppSpacing.sm,
    width: AppTouch.icon,
  },
  modalTitle: {
    ...AppTypography.lg,
  },
  langItem: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    minHeight: AppTouch.min,
    paddingHorizontal: AppSpacing.sm,
  },
  langFlag: {
    fontSize: 24,
    marginRight: AppSpacing.md,
  },
  langLabel: {
    ...AppTypography.md,
    flex: 1,
  },
});
