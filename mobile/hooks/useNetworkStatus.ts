import { useState, useEffect, useCallback } from 'react';
import * as Network from 'expo-network';

interface NetworkStatus {
    isConnected: boolean;
    isInternetReachable: boolean;
    type: string;
}

/**
 * Hook to monitor network connectivity status
 * Uses expo-network which is built into Expo SDK
 */
export function useNetworkStatus() {
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
        isConnected: true,
        isInternetReachable: true,
        type: 'unknown'
    });

    const checkNetwork = useCallback(async () => {
        try {
            const networkState = await Network.getNetworkStateAsync();
            setNetworkStatus({
                isConnected: networkState.isConnected ?? true,
                isInternetReachable: networkState.isInternetReachable ?? true,
                type: networkState.type ?? 'unknown'
            });
        } catch (error) {
            console.warn('Network check failed:', error);
        }
    }, []);

    useEffect(() => {
        // Initial check
        checkNetwork();

        // Poll network status every 5 seconds
        const interval = setInterval(checkNetwork, 5000);

        return () => {
            clearInterval(interval);
        };
    }, [checkNetwork]);

    return {
        ...networkStatus,
        isOffline: !networkStatus.isConnected || !networkStatus.isInternetReachable,
        refresh: checkNetwork
    };
}

export default useNetworkStatus;
