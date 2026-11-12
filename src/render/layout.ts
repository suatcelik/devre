import { BOARD_SIZE } from '../game/types';
import { board as B, screenPadding } from '../theme/sizes';

/** Tasarımdaki tahta genişliği (390 px ekranda): 8 hücre + 7 boşluk + iç boşluk + çerçeve. */
const NATURAL = BOARD_SIZE * B.cell + (BOARD_SIZE - 1) * B.gap + 2 * B.padding + 2 * B.border;

export interface BoardLayout {
  scale: number;
  cell: number;
  gap: number;
  pitch: number;
  /** Panelin dış kenarından ilk hücreye uzaklık (çerçeve + iç boşluk). */
  inset: number;
  /** Panelin dış boyu (kare). */
  size: number;
  /** Panel altındaki gölge dahil tuval yüksekliği. */
  canvasHeight: number;
  radius: number;
  border: number;
}

export function boardLayout(screenWidth: number): BoardLayout {
  const scale = Math.min((screenWidth - 2 * screenPadding.game) / NATURAL, 1.3);
  const cell = B.cell * scale;
  const gap = B.gap * scale;
  const size = NATURAL * scale;
  return {
    scale,
    cell,
    gap,
    pitch: cell + gap,
    inset: (B.padding + B.border) * scale,
    size,
    canvasHeight: size + B.dropShadowY * scale,
    radius: B.radius * scale,
    border: B.border * scale,
  };
}

/** Hücrenin panel içindeki sol üst köşesi. */
export function cellOrigin(layout: BoardLayout, r: number, c: number) {
  return { x: layout.inset + c * layout.pitch, y: layout.inset + r * layout.pitch };
}

// ---------- Sürükle-bırak geometrisi (DEVRE_TASKS 2.3, 2.4) ----------
// Sürüklenen parçanın çizildiği yer ile gölgenin/bırakmanın hücresi AYNI hesaptan çıkar.
// Tüm koordinatlar oyun ekranının kök görünümüne göredir (pencereye göre ölçüm Android'de
// durum çubuğu kadar kayabildiği için kullanılmaz).

export interface Point {
  x: number;
  y: number;
}

/** Parçanın parmağın üstünde durduğu sol üst köşe: yatayda ortalı, gövdenin altı parmağın `lift` üstünde. */
export function dragTopLeft(finger: Point, width: number, bodyHeight: number, lift: number): Point {
  'worklet';
  return { x: finger.x - width / 2, y: finger.y - lift - bodyHeight };
}

/** Sol üst köşesi `topLeft`ta çizilen parçanın oturacağı hücre: en yakın hücre köşesi. */
export function cellUnderPiece(topLeft: Point, boardOrigin: Point, inset: number, pitch: number): { r: number; c: number } {
  'worklet';
  return {
    r: Math.round((topLeft.y - boardOrigin.y - inset) / pitch),
    c: Math.round((topLeft.x - boardOrigin.x - inset) / pitch),
  };
}
