// Yalnızca kullanılan kalınlıklar; paket kökünden içe aktarmak tüm dosyaları uygulamaya katar.
import { Baloo2_600SemiBold } from '@expo-google-fonts/baloo-2/600SemiBold';
import { Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2/800ExtraBold';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GameScreen } from './src/screens/game/GameScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { DailyScreen } from './src/screens/DailyScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { MapScreen } from './src/screens/MapScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SplashIntro } from './src/screens/SplashIntro';
import { nextLevel } from './src/levels';
import { askOnce, rescheduleReminders } from './src/notify/reminders';
import { useGameStore } from './src/store/gameStore';
import { colors } from './src/theme/colors';
import { FpsMeter } from './src/ui/FpsMeter';

type Screen = 'intro' | 'onboarding' | 'home' | 'map' | 'game' | 'daily' | 'leaderboard';

// Yerel açılış görseli yazı tipleri yüklenene dek kalır; ardından animasyonlu açılış (SplashIntro) devralır.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 250, fade: true });

export default function App() {
  const [fontsLoaded] = useFonts({
    Baloo2_600SemiBold,
    Baloo2_800ExtraBold,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  const [screen, setScreen] = useState<Screen>('intro');
  const init = useGameStore((s) => s.init);
  const showFps = useGameStore((s) => s.showFps);
  const ready = useGameStore((s) => s.ready);
  const reduceMotion = useGameStore((s) => s.settings.reduceMotion);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hide();
  }, [fontsLoaded]);

  /** Açılış bitince: ilk kez açana tanıtım, diğerlerine ana ekran. */
  const afterIntro = useCallback(() => {
    setScreen(useGameStore.getState().onboarded ? 'home' : 'onboarding');
  }, []);
  /** Tanıtımdan sonra ilk oyun: öğretici, ardından Macera'nın 1. bölümü (ana ekrandaki "Oyna" ile aynı). */
  const afterOnboarding = (play: boolean) => {
    const { finishOnboarding, tutorialDone, startTutorial } = useGameStore.getState();
    finishOnboarding();
    if (play && !tutorialDone) {
      startTutorial('adventure');
      setScreen('game');
    } else setScreen(play ? 'map' : 'home');
  };

  useEffect(() => {
    void init();
  }, [init]);

  // Günlük hatırlatmalar: veriler yüklenince, öne gelince ve günün tahtası/ilerleme/ayar değişince yeniden planlanır.
  // İzin, öğretici bitince (ya da öğreticiyi daha önce bitirmiş oyuncuya ilk açılışta) bir kez sorulur.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const replan = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const s = useGameStore.getState();
        if (!s.ready) return;
        const go = s.tutorialDone && s.settings.reminders ? askOnce() : Promise.resolve(false);
        void go.then(() => rescheduleReminders(s.settings.reminders, s.dailyHistory, nextLevel(s.progress.stars)));
      }, 800);
    };
    const unsub = useGameStore.subscribe((s, prev) => {
      if (s.ready !== prev.ready || s.tutorialDone !== prev.tutorialDone || Object.keys(s.dailyHistory).length !== Object.keys(prev.dailyHistory).length
        || s.settings.reminders !== prev.settings.reminders || s.progress !== prev.progress) replan();
    });
    const sub = AppState.addEventListener('change', (state) => state === 'active' && replan());
    replan();
    return () => {
      unsub();
      sub.remove();
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Uygulama öne gelince bekleyen Günün Tahtası sonuçları gönderilir (5.5).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const { online, connectOnline, syncDaily } = useGameStore.getState();
      if (online.status === 'offline') void connectOnline();
      else void syncDaily();
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bgBottom }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {!fontsLoaded ? (
          <View style={{ flex: 1, backgroundColor: colors.bgTop }} />
        ) : screen === 'intro' ? (
          <SplashIntro ready={ready} reduceMotion={reduceMotion} onDone={afterIntro} />
        ) : screen === 'onboarding' ? (
          <OnboardingScreen reduceMotion={reduceMotion} onPlay={() => afterOnboarding(true)}
            onSkip={() => afterOnboarding(false)} />
        ) : screen === 'home' ? (
          <HomeScreen onPlay={() => setScreen('game')} onMap={() => setScreen('map')} onDaily={() => setScreen('daily')}
            onLeaderboard={() => setScreen('leaderboard')} onIntro={() => setScreen('onboarding')} />
        ) : screen === 'daily' ? (
          <DailyScreen onBack={() => setScreen('home')} onPlay={() => setScreen('game')}
            onLeaderboard={() => setScreen('leaderboard')} />
        ) : screen === 'leaderboard' ? (
          <LeaderboardScreen onBack={() => setScreen('home')} />
        ) : screen === 'map' ? (
          <MapScreen onBack={() => setScreen('home')} onPlay={() => setScreen('game')} />
        ) : (
          <GameScreen onHome={() => setScreen('home')} onMap={() => setScreen('map')} onDaily={() => setScreen('daily')} />
        )}
        {__DEV__ && showFps && <FpsMeter />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
