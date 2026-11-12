// Jokerlerin görünen adı, açıklaması, simgesi ve rengi (oyun ekranı ve dükkân ortak kullanır).
import type { PowerupKind } from '../game/powerups';
import { Tone, buttonTones } from '../theme/colors';
import type { IconName } from './Icon';

export interface JokerInfo {
  name: string;
  /** Dükkândaki kısa açıklama */
  desc: string;
  icon: IconName;
  tone: Tone;
  /** Tahtaya dokunarak kullanılan jokerde yönlendirme yazısı */
  aim?: string;
}

export const JOKERS: Record<PowerupKind, JokerInfo> = {
  shuffle: { name: 'Karıştır', desc: 'Tepsideki parçaları yeniler.', icon: 'shuffle', tone: buttonTones.secondary },
  hammer: {
    name: 'Çekiç',
    desc: 'Seçtiğin bir bloğu kırar.',
    icon: 'hammer',
    tone: buttonTones.danger,
    aim: 'Kırılacak bloğa dokun',
  },
  rotate: {
    name: 'Döndür',
    desc: 'Seçtiğin parçayı çevirir; yol tamamlanırsa lamba yanar.',
    icon: 'rotate',
    tone: buttonTones.primary,
    aim: 'Döndürülecek parçaya dokun',
  },
  lightning: {
    name: 'Yıldırım',
    desc: 'Tahtadaki bütün blokları kırar, kilitliler dahil.',
    icon: 'bolt',
    tone: buttonTones.daily,
    aim: 'Yıldırımı indirmek için tahtaya dokun',
  },
};
