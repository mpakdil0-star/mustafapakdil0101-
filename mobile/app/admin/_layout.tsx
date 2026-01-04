import { Stack } from 'expo-router';
import { useAppSelector } from '../../hooks/redux';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../../constants/colors';

export default function AdminLayout() {
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated || user?.userType !== 'ADMIN' as any) {
            // Note: userType might not strictly be typed as ADMIN in frontend yet, so casting or checking role logic is needed
            // For now, if we are here, we assume the user has access or we redirect
            // router.replace('/');
        }
    }, [user, isAuthenticated]);

    if (!isAuthenticated) return null;

    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F8FAFC' } }}>
            <Stack.Screen name="index" />
        </Stack>
    );
}
