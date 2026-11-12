// Bölüm sonu (DEVRE_TASKS 4.3, 4.5): kazanınca yıldızlar ve hamle bonusu; kaybedince hedef durumu.
import React, { ReactNode, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { GameState } from '../../game/types';
import { LevelData, Outcome, getLevel, goalProgress, goalText } from '../../levels';
import { buttonTones, colors } from '../../theme/colors';
import { DText } from '../../ui/DText';
import { formatScore } from '../../ui/format';
import { CandyButton } from '../../ui/CandyButton';
import { Kivilcim } from '../../ui/Kivilcim';
import { Panel } from '../../ui/Panel';
import { ResultPanel } from './ResultPanel';
import { useGameStore } from '../../store/gameStore';
import { Coin } from '../../ui/Coin';

export function LevelResult({
  level,
  game,
  outcome,
  still,
  rescue,
  onNext,
  onRetry,
  onMap,
}: {
  level: LevelData;
  game: GameState;
  outcome: Exclude<Outcome, { status: 'playing' }>;
  still: boolean;
  /** Yer kalmadıysa güçlendiriciyle devam düğmeleri */
  rescue?: ReactNode;
  onNext: (id: number) => void;
  onRetry: () => void;
  onMap: () => void;
}) {
  const coinsEarned = useGameStore((s) => s.coinsEarned);
  const stars = useMemo(
    () =>
      outcome.status === 'won'
        ? [
            { label: 'Hedef tamam', met: true },
            { label: `${formatScore(level.stars[1])} puan`, met: outcome.stars >= 2 },
            { label: `${formatScore(level.stars[2])} puan`, met: outcome.stars >= 3 },
          ]
        : [],
    [outcome, level],
  );

  if (outcome.status === 'won') {
    const next = getLevel(level.id + 1);
    return (
      <ResultPanel label={`Bölüm ${level.id} tamamlandı`} title={`Bölüm ${level.id} tamam!`} stars={stars}
        score={outcome.score} seed={level.seed} still={still}
        note={outcome.bonus > 0 || coinsEarned ? (
          <View style={styles.notes}>
            {outcome.bonus > 0 && (
              <DText size={15} color={colors.textSecondary}>
                Kalan hamle bonusu: +{formatScore(outcome.bonus)}
              </DText>
            )}
            {!!coinsEarned && (
              <View style={styles.coins} accessible accessibilityLabel={`${coinsEarned} altın kazandın`}>
                <Coin size={24} />
                <DText variant="display" size={22} color={colors.starOn} shadow={colors.textShadow} shadowY={2}>
                  +{coinsEarned} altın
                </DText>
              </View>
            )}
          </View>
        ) : undefined}
        primary={next ? { label: 'Sonraki Bölüm', onPress: () => onNext(next.id) } : { label: 'Harita', onPress: onMap }}
        secondary={next ? { label: 'Harita', onPress: onMap } : undefined} />
    );
  }

  const p = goalProgress(level.goal, game);
  return (
    <Panel label="Bölüm başarısız">
      <Kivilcim width={64} mood="sad" />
      <DText variant="display" size={34} shadow={colors.textShadow}>
        {outcome.reason === 'moves' ? 'Hamle Bitti!' : 'Yer Kalmadı!'}
      </DText>
      <DText size={17} color={colors.textSecondary} style={styles.center}>
        Hedef: {goalText(level.goal)}{'\n'}
        {level.goal.type === 'score'
          ? `${formatScore(p.current)} / ${formatScore(p.target)}`
          : `${p.current} / ${p.target}`}
      </DText>
      {rescue}
      <CandyButton label="Tekrar Dene" tone={buttonTones.primary} height={60} fontSize={26} onPress={onRetry} />
      <CandyButton label="Harita" tone={buttonTones.icon} onPress={onMap} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  notes: { alignItems: 'center', gap: 6 },
  coins: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
