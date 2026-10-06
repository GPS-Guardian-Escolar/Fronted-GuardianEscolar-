import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_VERSION = '2';

const ONBOARDING_VERSION_KEY = '@guardian_onboarding_version';

export async function hasSeenOnboarding() {
  const savedVersion = await AsyncStorage.getItem(ONBOARDING_VERSION_KEY);
  return savedVersion === ONBOARDING_VERSION;
}

export async function markOnboardingSeen() {
  await AsyncStorage.setItem(ONBOARDING_VERSION_KEY, ONBOARDING_VERSION);
}

export async function resetOnboarding() {
  await AsyncStorage.removeItem(ONBOARDING_VERSION_KEY);
}
