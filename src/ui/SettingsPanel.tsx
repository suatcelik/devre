import React from 'react';

import { buttonTones, colors } from '../theme/colors';
import { CandyButton } from './CandyButton';
import { DText } from './DText';
import { Panel } from './Panel';
import { SettingsToggles } from './SettingsToggles';

export function SettingsPanel({ onClose, onReplayTutorial, onReplayIntro }: {
  onClose: () => void;
  onReplayTutorial?: () => void;
  /** İlk açılış tanıtımını yeniden gösterir */
  onReplayIntro?: () => void;
}) {
  return (
    <Panel label="Ayarlar">
      <DText variant="display" size={34} shadow={colors.textShadow}>Ayarlar</DText>
      <SettingsToggles />
      {onReplayTutorial && (
        <CandyButton label="Öğreticiyi oyna" tone={buttonTones.secondary} onPress={onReplayTutorial} />
      )}
      {onReplayIntro && (
        <CandyButton label="Tanıtımı izle" tone={buttonTones.accent} onPress={onReplayIntro} />
      )}
      <CandyButton label="Tamam" tone={buttonTones.primary} onPress={onClose} />
    </Panel>
  );
}
