// Oyun bitti / bölüm tamamlandı paneli (DEVRE_TASKS 3.7.4):
// panel yukarıdan düşer, yıldızlar tek tek "çat" diye oturur, puan sayar, konfeti yağar.
// Sonsuz mod, bölüm kazanma ve bölüm kaybetme aynı paneli farklı içerikle kullanır.
import React, { ReactNode, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  CONFETTI_COUNT,
  CONFETTI_COUNT_MAX,
  RESULT_COUNT_MS,
  RESULT_COUNT_START_MS,
  RESULT_STAR_STAGGER_MS,
  RESULT_STARS_START_MS,
  STAR_SLAM_MS,
} from '../../anim/constants';
import { haptic } from '../../audio/haptics';
import { SfxName, playSfx } from '../../audio/sound';
import { endlessStars, starCount } from '../../game/results';
import type { GameState } from '../../game/types';
import { buttonTones, colors } from '../../theme/colors';
import { CandyButton, StatBox } from '../../ui/CandyButton';
import { Confetti } from '../../ui/Confetti';
import { DText } from '../../ui/DText';
import { formatScore } from '../../ui/format';
import { Kivilcim } from '../../ui/Kivilcim';
import { Panel, PanelRow } from '../../ui/Panel';
import { ScoreBadge } from '../../ui/ScoreBadge';
import { StarRow, StarSlot } from '../../ui/StarRow';

const STAR_SFX: SfxName[] = ['star1', 'star2', 'star3'];

/** Kazanılan yıldızların oturma anları: yalnızca kazanılanlar sırayla. */
export function starTimes(met: boolean[]): number[] {
  let k = 0;
  return met.map((m) => (m ? RESULT_STARS_START_MS + k++ * RESULT_STAR_STAGGER_MS : 0));
}

interface Action {
  label: string;
  onPress: () => void;
}

export function ResultPanel({
  label,
  title,
  stars,
  score,
  record = false,
  note,
  stats,
  rescue,
  primary,
  secondary,
  seed,
  still,
}: {
  label: string;
  title: string;
  stars: StarSlot[];
  score: number;
  record?: boolean;
  /** Puanın altında kısa açıklama (ör. hamle bonusu) */
  note?: ReactNode;
  stats?: { label: string; value: string }[];
  /** Güçlendiriciyle devam düğmeleri (yer kalmadığında) */
  rescue?: ReactNode;
  primary: Action;
  secondary?: Action;
  seed: number;
  /** Hareketi azalt: yıldızlar ve puan animasyonsuz, konfeti yok */
  still: boolean;
}) {
  const count = starCount(stars);
  const times = useMemo(() => starTimes(stars.map((g) => g.met)), [stars]);
  const lastSlam = Math.max(0, ...times.filter((_, i) => stars[i].met)) + STAR_SLAM_MS;
  const confetti = count > 0 && !still;

  // Sesler ve titreşimler yıldızların oturduğu anlarda.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let k = 0;
    stars.forEach((g, i) => {
      if (!g.met) return;
      const n = k++;
      timers.push(
        setTimeout(() => {
          playSfx(STAR_SFX[n]);
          haptic(n === 2 ? 'longCircuit' : 'place');
        }, still ? RESULT_STARS_START_MS + n * 120 : times[i] + STAR_SLAM_MS),
      );
    });
    if (confetti) timers.push(setTimeout(() => playSfx('confetti'), lastSlam + 60));
    return () => timers.forEach(clearTimeout);
  }, [stars, times, still, confetti, lastSlam]);

  return (
    <>
      <Panel label={label} variant={still ? 'zoom' : 'drop'}>
        {/* Kıvılcım başlığın yanında: küçük ekranlarda panel taşmasın */}
        <View style={styles.header}>
          <Kivilcim width={46} mood={count >= 2 ? 'happy' : count === 1 ? 'idle' : 'sad'} />
          <DText variant="display" size={title.length > 14 ? 28 : 34} shadow={colors.textShadow}>{title}</DText>
        </View>
        <StarRow stars={stars} times={times} still={still} />
        <ScoreBadge label="Puan" value={score} record={record} still={still}
          delay={RESULT_COUNT_START_MS} duration={RESULT_COUNT_MS} />
        {note}
        {stats && (
          <PanelRow>
            {stats.map((s) => (
              <StatBox key={s.label} label={s.label} value={s.value} />
            ))}
          </PanelRow>
        )}
        {rescue}
        <CandyButton label={primary.label} tone={buttonTones.primary} height={60} fontSize={26} onPress={primary.onPress} />
        {secondary && <CandyButton label={secondary.label} tone={buttonTones.icon} onPress={secondary.onPress} />}
      </Panel>
      {confetti && (
        <Confetti count={count === 3 ? CONFETTI_COUNT_MAX : CONFETTI_COUNT} delay={lastSlam} seed={seed} />
      )}
    </>
  );
}

const ENDLESS_TITLES = ['Yer Kalmadı!', 'Fena Değil!', 'Harika Oyun!', 'Muhteşem!'];

/** Sonsuz ve günlük mod oyun sonu. Günün Tahtası'nda tekrar yok; sonuç ve paylaşım ekranına gidilir. */
export function EndlessResult({ game, bestBefore, best, still, daily = false, rescue, onRestart, onHome, onDaily }: {
  game: GameState;
  bestBefore: number;
  best: number;
  still: boolean;
  daily?: boolean;
  rescue?: ReactNode;
  onRestart: () => void;
  onHome: () => void;
  onDaily?: () => void;
}) {
  const goals = useMemo(() => endlessStars(game, bestBefore), [game, bestBefore]);
  return (
    <ResultPanel label="Oyun bitti" title={daily ? 'Günün Tahtası' : ENDLESS_TITLES[starCount(goals)]} stars={goals}
      score={game.score} record={goals[2].met} seed={game.seed} still={still} rescue={daily ? undefined : rescue}
      stats={[
        { label: 'En iyi', value: formatScore(best) },
        { label: 'Lamba', value: String(game.circuits) },
        { label: 'En uzun', value: String(game.longestCircuit) },
      ]}
      primary={daily && onDaily ? { label: 'Seri ve Paylaş', onPress: onDaily } : { label: 'Tekrar Oyna', onPress: onRestart }}
      secondary={{ label: 'Ana Menü', onPress: onHome }} />
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
