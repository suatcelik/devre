import React from 'react';
import { View } from 'react-native';

import { requestPermission } from '../notify/reminders';
import { useGameStore } from '../store/gameStore';
import { buttonTones } from '../theme/colors';
import { VISIONS, VISION_LABELS } from '../theme/colorVision';
import { CandyButton } from './CandyButton';
import { ToggleRow } from './ToggleRow';

/** Ses, müzik, titreşim ve hareket ayarları (DEVRE_TASKS 3.5.9, 3.6.1). */
export function SettingsToggles() {
  const settings = useGameStore((s) => s.settings);
  const update = useGameStore((s) => s.updateSettings);
  const vision = useGameStore((s) => s.visionPreview);
  const setVision = useGameStore((s) => s.setVisionPreview);
  const showFps = useGameStore((s) => s.showFps);
  const setShowFps = useGameStore((s) => s.setShowFps);
  return (
    <View style={{ width: '100%', gap: 4 }}>
      <ToggleRow label="Ses efektleri" value={settings.sound} onChange={(v) => update({ sound: v })} />
      <ToggleRow label="Müzik" value={settings.music} onChange={(v) => update({ music: v })} />
      <ToggleRow label="Titreşim" value={settings.haptics} onChange={(v) => update({ haptics: v })} />
      <ToggleRow label="Günlük hatırlatma" hint="Her akşam 19:00'da Günün Tahtası hatırlatması"
        value={settings.reminders} onChange={(v) => {
          update({ reminders: v });
          // Açınca izin yoksa sistem sorar; reddedilirse anahtar kapanır.
          if (v) void requestPermission().then((ok) => { if (!ok) update({ reminders: false }); });
        }} />
      <ToggleRow label="Hareketi azalt" hint="Sarsıntı, parlama ve eğilme kapanır"
        value={settings.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
      {__DEV__ && (
        // Yalnızca geliştirme araçları; yayın sürümünde görünmez.
        <>
          <ToggleRow label="FPS göstergesi" hint="Geliştirici: 60 FPS ölçümü" value={showFps} onChange={setShowFps} />
          {/* Tahtayı renk görme türüyle önizler (3.2.2) */}
          <CandyButton label={`Renk: ${VISION_LABELS[vision]}`} tone={buttonTones.accent} height={48} fontSize={20}
            accessibilityHint="Tahtayı farklı renk görme türleriyle önizler"
            onPress={() => setVision(VISIONS[(VISIONS.indexOf(vision) + 1) % VISIONS.length])} />
        </>
      )}
    </View>
  );
}
