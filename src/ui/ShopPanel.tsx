// Dükkân: bölümlerden kazanılan altınla joker alınır. Gerçek parayla satın alma yoktur.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { haptic } from '../audio/haptics';
import { playSfx } from '../audio/sound';
import { MAX_OWNED, POWERUP_KINDS, PRICES, PowerupKind } from '../game/powerups';
import { useGameStore } from '../store/gameStore';
import { buttonTones, colors, tones } from '../theme/colors';
import { CandyButton } from './CandyButton';
import { Coin, CoinBadge } from './Coin';
import { DText } from './DText';
import { Icon } from './Icon';
import { JOKERS } from './jokers';
import { Panel } from './Panel';

function Row({ kind }: { kind: PowerupKind }) {
  const owned = useGameStore((s) => s.powerups[kind]);
  const coins = useGameStore((s) => s.coins);
  const buy = useGameStore((s) => s.buyPowerup);
  const j = JOKERS[kind];
  const price = PRICES[kind];
  const full = owned >= MAX_OWNED;
  const can = !full && coins >= price;
  const onBuy = () => {
    if (buy(kind)) {
      playSfx('pop');
      haptic('place');
    } else playSfx('invalid');
  };
  return (
    <View style={styles.row}>
      <View>
        <View style={[styles.icon, {
          backgroundImage: `linear-gradient(180deg, ${j.tone.light} 0%, ${j.tone.base} 70%)`,
          boxShadow: `0 4px 0 ${j.tone.edge}`,
        }]}>
          <Icon name={j.icon} />
        </View>
        <View style={styles.count}>
          <DText variant="display" size={13} color={colors.textOnButton}>{owned}</DText>
        </View>
      </View>
      <View style={styles.text}>
        <DText variant="display" size={19}>{j.name}</DText>
        <DText size={12} color={colors.textSecondary}>{j.desc}</DText>
      </View>
      <Pressable onPress={onBuy} disabled={!can} accessibilityRole="button"
        accessibilityLabel={full ? `${j.name}: dolu` : `${j.name} al, ${price} altın`}
        accessibilityState={{ disabled: !can }}>
        {({ pressed }) => (
          <View style={[styles.buy, !can && styles.buyOff, pressed && styles.buyPressed]}>
            {full ? (
              <DText variant="display" size={15} color={colors.textOnButton}>Dolu</DText>
            ) : (
              <>
                <Coin size={18} />
                <DText variant="display" size={17} color={colors.textOnButton}>{price}</DText>
              </>
            )}
          </View>
        )}
      </Pressable>
    </View>
  );
}

export function ShopPanel({ onClose }: { onClose: () => void }) {
  const coins = useGameStore((s) => s.coins);
  return (
    <Panel label="Joker dükkânı">
      <DText variant="display" size={34} shadow={colors.textShadow}>Dükkân</DText>
      <CoinBadge coins={coins} />
      <View style={styles.list}>
        {POWERUP_KINDS.map((k) => <Row key={k} kind={k} />)}
      </View>
      <DText size={12} color={colors.textSecondary} style={styles.center}>
        Bölüm geçtikçe altın kazanırsın; yıldız ne kadar çoksa altın o kadar çok.
      </DText>
      <CandyButton label="Kapat" tone={buttonTones.primary} height={52} fontSize={22} onPress={onClose} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  list: { alignSelf: 'stretch', gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 18,
    backgroundColor: colors.emptyCell,
  },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  count: {
    position: 'absolute',
    right: -6,
    top: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 1 },
  buy: {
    minWidth: 70,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundImage: `linear-gradient(180deg, ${tones.green.light} 0%, ${tones.green.base} 70%)`,
    boxShadow: `0 4px 0 ${tones.green.edge}`,
  },
  buyOff: { opacity: 0.45 },
  buyPressed: { transform: [{ translateY: 3 }], boxShadow: `0 1px 0 ${tones.green.edge}` },
  center: { textAlign: 'center' },
});
