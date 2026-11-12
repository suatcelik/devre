// Günün Tahtası sonucu, seri ve paylaşım (DEVRE_TASKS 4.7, 4.8, 4.9).
import { useCanvasRef } from '@shopify/react-native-skia';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DailyResult, bestStreak, formatDateTr, streak, timeUntilTomorrow, weekView } from '../daily/daily';
import { ShareCard } from '../daily/ShareCard';
import { shareCard } from '../daily/share';
import { todayKey, useGameStore } from '../store/gameStore';
import { buttonTones, colors, tones } from '../theme/colors';
import { screenPadding } from '../theme/sizes';
import { CandyButton, RoundIconButton, StatBox } from '../ui/CandyButton';
import { DText } from '../ui/DText';
import { formatScore } from '../ui/format';
import { Kivilcim } from '../ui/Kivilcim';
import { NightBackground } from '../ui/NightBackground';
import { StarIcon } from '../ui/StarRow';

/** Bu haftanın günleri: oynanan gün yıldızlı, bugün halkalı (4.8) */
function Week({ history, today }: { history: Record<string, DailyResult>; today: string }) {
  const days = weekView(history, today);
  return (
    <View style={styles.week} accessible
      accessibilityLabel={`Bu hafta ${days.filter((d) => d.played).length} gün oynandı`}>
      {days.map((d) => (
        <View key={d.key} style={styles.day}>
          <DText variant="label" size={11} color={d.isToday ? colors.text : colors.textSecondary}>{d.label}</DText>
          <View style={[styles.dot, d.played && styles.dotPlayed, d.isToday && styles.dotToday, d.isFuture && styles.dotFuture]}>
            {d.played && <StarIcon size={20} on />}
          </View>
        </View>
      ))}
    </View>
  );
}

export function DailyScreen({ onBack, onPlay, onLeaderboard }: {
  onBack: () => void;
  onPlay: () => void;
  onLeaderboard: () => void;
}) {
  const insets = useSafeAreaInsets();
  const history = useGameStore((s) => s.dailyHistory);
  const still = useGameStore((s) => s.settings.reduceMotion);
  const startDaily = useGameStore((s) => s.startDaily);
  const canvasRef = useCanvasRef();
  const [now, setNow] = useState(() => new Date());
  const [sharing, setSharing] = useState(false);

  // Kalan süre dakikada bir yenilenir.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const today = todayKey(now);
  const result = history[today];
  const current = streak(history, today);
  const best = bestStreak(history);

  const share = async () => {
    if (!result || sharing) return;
    setSharing(true);
    try {
      await shareCard(canvasRef.current, result, current);
    } finally {
      setSharing(false);
    }
  };

  return (
    <NightBackground still={still}>
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.header}>
          <RoundIconButton icon="back" tone={buttonTones.icon} label="Geri" size={48} onPress={onBack} />
          <View style={styles.title}>
            <DText variant="display" size={24}>Günün Tahtası</DText>
            <DText size={13} color={colors.textSecondary}>{formatDateTr(today)}</DText>
          </View>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {result ? (
            <View style={styles.card} accessible accessibilityRole="image"
              accessibilityLabel={`Paylaşım kartı: ${formatScore(result.score)} puan, ${result.circuits} lamba`}>
              <ShareCard result={result} streak={current} canvasRef={canvasRef} />
            </View>
          ) : (
            <View style={styles.waiting}>
              <Kivilcim width={110} mood="surprised" />
              <DText variant="display" size={26} style={styles.center}>Bugünün tahtası seni bekliyor</DText>
              <DText size={15} color={colors.textSecondary} style={styles.center}>
                Herkes aynı tahtayı oynar. Günde tek deneme var.
              </DText>
            </View>
          )}

          <View style={styles.stats}>
            <StatBox label="Seri" value={String(current)} />
            <StatBox label="En uzun" value={String(best)} />
            <StatBox label="Toplam" value={String(Object.keys(history).length)} />
          </View>

          <Week history={history} today={today} />

          {result && (
            <DText size={15} color={colors.textSecondary} style={styles.center}>
              Yeni tahta: {timeUntilTomorrow(now)}
            </DText>
          )}
        </ScrollView>

        <View style={styles.actions}>
          {result ? (
            <>
              <CandyButton label={sharing ? 'Hazırlanıyor…' : 'Paylaş'} tone={buttonTones.primary} height={60} fontSize={26}
                onPress={share} />
              <CandyButton label="Sıralama" tone={buttonTones.accent} onPress={onLeaderboard} />
            </>
          ) : (
            <CandyButton label="Oyna" tone={buttonTones.daily} height={60} fontSize={26}
              onPress={() => startDaily() && onPlay()} />
          )}
        </View>
      </View>
    </NightBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: screenPadding.game, gap: 12 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { alignItems: 'center' },
  content: { alignItems: 'center', gap: 18, paddingBottom: 12 },
  card: { borderRadius: 24, boxShadow: '0 8px 0 rgba(0,0,0,0.3)' },
  waiting: { alignItems: 'center', gap: 10, paddingVertical: 24, paddingHorizontal: 12 },
  stats: { flexDirection: 'row', gap: 12 },
  week: { flexDirection: 'row', gap: 8 },
  day: { alignItems: 'center', gap: 4 },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.emptyCell,
    borderWidth: 2,
    borderColor: colors.panelBorder,
  },
  dotPlayed: { backgroundColor: colors.panel, borderColor: tones.yellow.edge },
  dotToday: { borderColor: colors.starOn, borderWidth: 3 },
  dotFuture: { opacity: 0.45 },
  actions: { paddingHorizontal: 8, gap: 12 },
  center: { textAlign: 'center' },
});
