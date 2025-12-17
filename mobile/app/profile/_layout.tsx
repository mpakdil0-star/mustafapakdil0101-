import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

export default function ProfileLayout() {
  const router = useRouter();

  // Ortak Geri Butonu Bileşeni
  const BackButton = () => (
    <TouchableOpacity
      onPress={() => {
        // Doğrudan Profil sekmesine yönlendir, back() state kaybı yaşatabiliyor
        router.navigate('/(tabs)/profile');
      }}
      style={styles.backButton}
    >
      <Text style={styles.backIcon}>←</Text>
      <Text style={styles.backText}>Geri</Text>
    </TouchableOpacity>
  );

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShadowVisible: false,
        headerLeft: () => <BackButton />, // Custom back button is safer for visibility
        headerBackVisible: false, // Hide native one to avoid duplicates
        headerBackTitle: 'Geri',
        contentStyle: {
          backgroundColor: colors.backgroundLight,
        },
      }}
    >
      <Stack.Screen
        name="edit"
        options={{
          title: 'Profil Düzenle',
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: 'Bildirim Ayarları',
        }}
      />
      <Stack.Screen
        name="security"
        options={{
          title: 'Güvenlik',
        }}
      />
      <Stack.Screen
        name="help"
        options={{
          title: 'Yardım ve Destek',
        }}
      />
      <Stack.Screen
        name="addresses/index"
        options={{
          title: 'Adreslerim',
        }}
      />
      <Stack.Screen
        name="addresses/add"
        options={{
          title: 'Yeni Adres Ekle',
        }}
      />
      <Stack.Screen
        name="addresses/edit"
        options={{
          title: 'Adresi Düzenle',
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: 'Geçmiş İşlerim',
        }}
      />
      <Stack.Screen
        name="favorites"
        options={{
          title: 'Favori Ustalarım',
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  backIcon: {
    fontSize: 24,
    color: colors.white,
    marginRight: 4,
    fontWeight: 'bold',
  },
  backText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
