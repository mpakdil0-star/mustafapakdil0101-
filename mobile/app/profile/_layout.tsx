import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';

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
      <Ionicons name="chevron-back" size={20} color={colors.white} />
      <Text style={styles.backText}>Geri</Text>
    </TouchableOpacity>
  );

  return (
    <Stack
      screenOptions={{
        headerShown: false, // Her sayfa kendi PremiumHeader'ını kullanacak
        contentStyle: {
          backgroundColor: '#F8FAFC',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  backText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.bold,
    marginLeft: 2,
  },
});
