import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StatusBar, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AppLaunchSplashProps {
  onComplete: () => void;
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export const AppLaunchSplash: React.FC<AppLaunchSplashProps> = ({ onComplete }) => {
  const ambient = useRef(new Animated.Value(0)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslate = useRef(new Animated.Value(18)).current;
  const lineScale = useRef(new Animated.Value(0)).current;
  const nodesOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ambientLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ambient, {
          toValue: 1,
          duration: 1250,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(ambient, {
          toValue: 0,
          duration: 1250,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );

    ambientLoop.start();
    Animated.parallel([
      Animated.timing(nodesOpacity, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
        isInteraction: false,
      }),
      Animated.sequence([
        Animated.delay(130),
        Animated.parallel([
          Animated.timing(brandOpacity, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
            isInteraction: false,
          }),
          Animated.timing(brandTranslate, {
            toValue: 0,
            duration: 620,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
            isInteraction: false,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(280),
        Animated.timing(lineScale, {
          toValue: 1,
          duration: 1280,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    ]).start();

    const timer = setTimeout(onComplete, 1750);
    return () => {
      clearTimeout(timer);
      ambientLoop.stop();
    };
  }, [ambient, brandOpacity, brandTranslate, lineScale, nodesOpacity, onComplete]);

  const ambientTranslate = ambient.interpolate({ inputRange: [0, 1], outputRange: [-10, 12] });
  const ambientScale = ambient.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] });

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <LinearGradient
        colors={['#04111E', '#072B35', '#063F42']}
        locations={[0, 0.56, 1]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <AnimatedLinearGradient
        colors={['rgba(45,212,191,0.24)', 'rgba(14,165,233,0.02)']}
        style={[
          styles.ambientOrb,
          styles.ambientOrbTop,
          { transform: [{ translateY: ambientTranslate }, { scale: ambientScale }] },
        ]}
      />
      <Animated.View
        style={[
          styles.ambientOrb,
          styles.ambientOrbBottom,
          { transform: [{ translateY: Animated.multiply(ambientTranslate, -0.7) }, { scale: ambientScale }] },
        ]}
      />

      <Animated.View style={[styles.network, { opacity: nodesOpacity }]} pointerEvents="none">
        <View style={[styles.connectionLine, styles.connectionLineOne]} />
        <View style={[styles.connectionLine, styles.connectionLineTwo]} />
        <View style={[styles.connectionLine, styles.connectionLineThree]} />
        <View style={[styles.node, styles.nodeOne]} />
        <View style={[styles.node, styles.nodeTwo]} />
        <View style={[styles.node, styles.nodeThree]} />
        <View style={[styles.node, styles.nodeFour]} />
      </Animated.View>

      <View style={styles.content}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.orbitGroup,
            { transform: [{ scale: ambientScale }, { translateY: ambientTranslate }] },
          ]}
        >
          <View style={styles.orbitLarge} />
          <View style={styles.orbitSmall} />
          <View style={styles.orbitPoint} />
        </Animated.View>
        <Animated.View style={{ opacity: brandOpacity, transform: [{ translateY: brandTranslate }] }}>
          <Text style={styles.wordmark}>İşBitir</Text>
          <View style={styles.wordmarkUnderline} />
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { transform: [{ scaleX: lineScale }] }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: '#04111E' },
  ambientOrb: { position: 'absolute', borderRadius: 999 },
  ambientOrbTop: { width: 330, height: 330, top: -105, right: -120 },
  ambientOrbBottom: {
    width: 260,
    height: 260,
    left: -130,
    bottom: 55,
    backgroundColor: 'rgba(14,165,233,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(94,234,212,0.08)',
  },
  network: { ...StyleSheet.absoluteFillObject },
  connectionLine: { position: 'absolute', height: 1, backgroundColor: 'rgba(153,246,228,0.12)' },
  connectionLineOne: { width: 180, right: -15, top: '29%', transform: [{ rotate: '-28deg' }] },
  connectionLineTwo: { width: 150, left: -25, bottom: '30%', transform: [{ rotate: '34deg' }] },
  connectionLineThree: { width: 115, right: 20, bottom: '23%', transform: [{ rotate: '62deg' }] },
  node: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#5EEAD4',
    borderWidth: 2,
    borderColor: 'rgba(153,246,228,0.28)',
  },
  nodeOne: { right: 35, top: '24%' },
  nodeTwo: { right: 145, top: '35%' },
  nodeThree: { left: 44, bottom: '27%' },
  nodeFour: { right: 63, bottom: '19%' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 34 },
  orbitGroup: {
    position: 'absolute',
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitLarge: {
    position: 'absolute',
    width: 238,
    height: 238,
    borderRadius: 119,
    borderWidth: 1,
    borderColor: 'rgba(94,234,212,0.12)',
  },
  orbitSmall: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.08)',
  },
  orbitPoint: {
    position: 'absolute',
    width: 7,
    height: 7,
    right: 26,
    top: 67,
    borderRadius: 4,
    backgroundColor: '#5EEAD4',
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  wordmark: { color: '#F8FAFC', fontSize: 56, lineHeight: 64, fontWeight: '800', letterSpacing: -3.1 },
  wordmarkUnderline: { width: 36, height: 3, marginTop: 8, alignSelf: 'center', borderRadius: 3, backgroundColor: '#2DD4BF' },
  footer: { paddingHorizontal: 54, paddingBottom: 44 },
  progressTrack: { height: 2, overflow: 'hidden', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.10)' },
  progressBar: { width: '100%', height: '100%', borderRadius: 2, backgroundColor: '#2DD4BF' },
});
