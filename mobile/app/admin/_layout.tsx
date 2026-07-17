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
        if (isAuthenticated && user && user.userType !== 'ADMIN') {
            router.replace('/');
        }
    }, [user, isAuthenticated, router]);

    if (!isAuthenticated || !user || user.userType !== 'ADMIN') {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F8FAFC' } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="users" />
            <Stack.Screen name="stats" />
            <Stack.Screen name="jobs" />
            <Stack.Screen name="reports" />
            <Stack.Screen name="support" />
        </Stack>
    );
}
