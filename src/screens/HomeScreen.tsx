import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { streak } from '../daily/daily';
import { PlayMode, todayKey, useGameStore } from '../store/gameStore';
import { buttonTones, colors } from '../theme/colors';
import { button as BTN } from '../theme/sizes';
import { CandyButton, RoundIconButton } from '../ui/CandyButton';
import { CandyLogo } from '../ui/CandyLogo';
import { CoinBadge } from '../ui/Coin';
import { ShopPanel } from '../ui/ShopPanel';
import { DText } from '../ui/DText';
import { formatScore } from '../ui/format';
import { Kivilcim } from '../ui/Kivilcim';
import { NightBackground } from '../ui/NightBackground';
import { SettingsPanel } from '../ui/SettingsPanel';

export function HomeScreen({ onPlay, onMap, onDaily, onLeaderboard, onIntro }: {
  onPlay: () => void;
  /** Tanıtım ekranlarını yeniden aç */
  onIntro: () => void;
  onMap: () => void;
  onDaily: () => void;
  onLeaderboard: () => void;
}) {
  const insets = useSafeAreaInsets();
  const start = useGameStore((s) => s.start);
  const startTutorial = useGameStore((s) => s.startTutorial);
  const tutorialDone = useGameStore((s) => s.tutorialDone);
  const best = useGameStore((s) => s.best);
  const reduceMotion = useGameStore((s) => s.settings.reduceMotion);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const coins = useGameStore((s) => s.coins);
  const dailyHistory = useGameStore((s) => s.dailyHistory);
  const startDaily = useGameStore((s) => s.startDaily);
  const today = todayKey();
  const dailyStreak = streak(dailyHistory, today);
  /** Günün Tahtası: bugün oynandıysa sonuç ve paylaşım; değilse günde tek deneme başlar (4.7). */
  const daily = () => {
    if (dailyHistory[today]) {
      onDaily();
      return;
    }
    if (!tutorialDone) {
      startTutorial('daily');
      onPlay();
      return;
    }
    if (startDaily()) onPlay();
  };

  /** İlk oyunda önce öğretici açılır, bitince seçilen moda geçilir (DEVRE_TASKS 3.7.5). */
  const play = (mode: PlayMode) => {
    if (tutorialDone) start(mode);
    else startTutorial(mode);
    onPlay();
  };
  /** Macera: harita; ilk kez oynayana önce öğretici, ardından doğrudan 1. bölüm (4.2). */
  const adventure = () => {
    if (tutorialDone) {
      onMap();
    } else {
      startTutorial('adventure');
      onPlay();
    }
  };

  return (
    <NightBackground skyline still={reduceMotion}>
      <View style={[styles.root, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.title}>
          <CandyLogo still={reduceMotion} />
          <DText size={18} color={colors.textSecondary}>Karanlık şehri aydınlat</DText>
        </View>
        <Kivilcim width={130} />
        <View style={styles.buttons}>
          <CandyButton label="Oyna" tone={buttonTones.primary} height={BTN.primaryHeight} fontSize={30}
            onPress={adventure} />
          <CandyButton label="Günün Tahtası" tone={buttonTones.daily}
            accessibilityHint="Bugün herkes aynı tahtayı oynar"
            onPress={daily}
            badge={dailyStreak > 0 ? (
              <View style={styles.streakBadge}>
                <DText size={13} color={colors.textOnButton} style={styles.badgeText}>{dailyStreak} gün seri</DText>
              </View>
            ) : undefined} />
          <CandyButton label="Sonsuz Mod" tone={buttonTones.secondary} onPress={() => play('endless')} />
          {best > 0 && (
            <DText size={16} color={colors.textSecondary} style={{ textAlign: 'center' }}>
              En iyi puan: {formatScore(best)}
            </DText>
          )}
        </View>
        <View style={styles.bottomRow}>
          <RoundIconButton icon="settings" tone={buttonTones.icon} label="Ayarlar" onPress={() => setSettingsOpen(true)} />
          {/* Tasarımdaki kupa: günlük sıralama (5.3) */}
          <RoundIconButton icon="trophy" tone={buttonTones.accent} label="Sıralama" onPress={onLeaderboard} />
          <RoundIconButton icon="shop" tone={buttonTones.primary} label="Joker dükkânı" onPress={() => setShopOpen(true)} />
        </View>
      </View>
      <View style={[styles.wallet, { top: insets.top + 10 }]}>
        <CoinBadge coins={coins} onPress={() => setShopOpen(true)} />
      </View>
      {shopOpen && <ShopPanel onClose={() => setShopOpen(false)} />}
      {settingsOpen && (
        <SettingsPanel
          onClose={() => setSettingsOpen(false)}
          onReplayTutorial={() => {
            setSettingsOpen(false);
            startTutorial('endless');
            onPlay();
          }}
          onReplayIntro={() => {
            setSettingsOpen(false);
            onIntro();
          }}
        />
      )}
    </NightBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', gap: 22, paddingHorizontal: 24 },
  title: { alignItems: 'center', gap: 2 },
  buttons: { width: 280, gap: 20 },
  bottomRow: { marginTop: 'auto', flexDirection: 'row', gap: 24 },
  wallet: { position: 'absolute', right: 16 },
  // Tasarımdaki "12 gün seri" rozeti
  streakBadge: {
    position: 'absolute',
    right: -8,
    top: -12,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    justifyContent: 'center',
    backgroundColor: colors.badge,
    boxShadow: '0 3px 0 rgba(0,0,0,0.25)',
  },
  badgeText: { fontFamily: 'Nunito_800ExtraBold' },
});
