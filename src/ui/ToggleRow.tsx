import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, tones } from '../theme/colors';
import { DText } from './DText';

/** Açık/kapalı ayar satırı; dokunma alanı en az 48 px (DEVRE_TASKS 3.7). */
export function ToggleRow({ label, hint, value, onChange }: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label}
      accessibilityHint={hint} onPress={() => onChange(!value)} style={styles.row}>
      <View style={{ flex: 1 }}>
        <DText variant="display" size={20}>{label}</DText>
        {hint && <DText size={13} color={colors.textSecondary}>{hint}</DText>}
      </View>
      <View style={[styles.track, value && styles.trackOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 56, width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: {
    width: 58,
    height: 34,
    borderRadius: 17,
    padding: 3,
    backgroundColor: colors.emptyCell,
    boxShadow: 'inset 0 3px 0 rgba(0,0,0,0.25)',
  },
  trackOn: { backgroundColor: tones.green.base },
  knob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.text,
    boxShadow: '0 3px 0 rgba(0,0,0,0.25)',
  },
  knobOn: { transform: [{ translateX: 24 }] },
});
