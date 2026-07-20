import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'has_seen_onboarding';
const WRITE_TIMEOUT_MS = 1500;

let completedInThisSession = false;

export async function hasCompletedOnboarding(): Promise<boolean> {
  if (completedInThisSession) return true;

  const value = await SecureStore.getItemAsync(ONBOARDING_KEY);
  completedInThisSession = value === 'true';
  return completedInThisSession;
}

export async function completeOnboarding(): Promise<void> {
  // Prevent the root navigation effect from racing the native storage write
  // when the onboarding screen redirects to the next route.
  completedInThisSession = true;

  const write = SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
  await Promise.race([
    write,
    new Promise<void>((resolve) => setTimeout(resolve, WRITE_TIMEOUT_MS)),
  ]);

  // Keep observing a slow native write without blocking navigation.
  write.catch((error) => console.warn('Onboarding state could not be saved:', error));
}
