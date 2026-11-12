// İlk açılış tanıtımı: üç sayfa, kaydırarak ya da "İleri" ile geçilir. Bir kez gösterilir.
// Sayfalardaki tahta çizimleri oyunun gerçek hücre çizimleriyle yapılır (src/render/cells).
import { Canvas, Group, RoundedRect } from '@shopify/react-native-skia';
import React, { useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { E, PieceColor, W } from '../game/types';
import { BatteryCell, BlockCell, EmptyCell, LampCell } from '../render/cells';
import { buttonTones, colors, tones } from '../theme/colors';
import { button as BTN } from '../theme/sizes';
import { CandyButton } from '../ui/CandyButton';
import { DText } from '../ui/DText';
import { Kivilcim } from '../ui/Kivilcim';
import { NightBackground } from '../ui/NightBackground';
import { HandGraphic, TIP } from './game/TutorialHand';
import { SparkleField, Sunburst } from '../ui/Sunburst';

const PAGES = [
  {
    title: 'Merhaba, ben Kıvılcım!',
    body: 'Karanlık şehrin bütün ışıkları söndü. Birlikte hepsini yeniden yakalım!',
  },
  {
    title: 'Parçaları sürükle',
    body: 'Kablolu parçaları tepsiden tahtaya bırak. Kablo uçları birbirine değmeli.',
  },
  {
    title: 'Devreyi tamamla!',
    body: 'Pilden lambaya kesintisiz bir yol kur: lamba yanar, yol patlar, puanlar yağar!',
  },
] as const;

// ---------- Mini tahta ----------

const COLS = 5;
const ROWS = 3;
/** Ortadaki satır: pil → parça → (boşluk) → parça → lamba */
const ROW = 1;
const GAP_COL = 2;
/** Dekor bloklar: [satır, sütun, renk, kablolar] */
const DECOR: [number, number, PieceColor, number][] = [
  [0, 0, 'green', 4 | 2],
  [0, 1, 'green', 8],
  [2, 3, 'purple', 1 | 2],
  [2, 4, 'purple', 8],
  [0, 4, 'yellow', 4],
];

function useBoardMetrics(width: number) {
  const cell = Math.min(54, (width - 2 * 14 - (COLS - 1) * 6) / COLS);
  const gap = cell * 0.11;
  const pad = cell * 0.26;
  const pitch = cell + gap;
  return { cell, gap, pad, pitch, w: COLS * pitch - gap + 2 * pad, h: ROWS * pitch - gap + 2 * pad };
}

function MiniBoard({ width, lit, filled }: { width: number; lit: boolean; filled: boolean }) {
  const m = useBoardMetrics(width);
  const at = (r: number, c: number) => ({ x: m.pad + c * m.pitch, y: m.pad + r * m.pitch });
  const cells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const { x, y } = at(r, c);
    cells.push(<EmptyCell key={`e${r}${c}`} x={x} y={y} size={m.cell} />);
  }
  const row = (c: number) => at(ROW, c);
  return (
    <Canvas style={{ width: m.w, height: m.h + 8 }}>
      <RoundedRect x={0} y={6} width={m.w} height={m.h} r={m.cell * 0.5} color="rgba(0,0,0,0.3)" />
      <RoundedRect x={0} y={0} width={m.w} height={m.h} r={m.cell * 0.5} color={colors.panelBorder} />
      <RoundedRect x={3} y={3} width={m.w - 6} height={m.h - 6} r={m.cell * 0.5 - 3} color={colors.panel} />
      <Group>{cells}</Group>
      {DECOR.map(([r, c, color, wires]) => {
        const p = at(r, c);
        return <BlockCell key={`d${r}${c}`} x={p.x} y={p.y} size={m.cell} tone={tones[color]} wires={wires} />;
      })}
      <BatteryCell x={row(0).x} y={row(0).y} size={m.cell} dir={E} lit={lit} />
      <BlockCell x={row(1).x} y={row(1).y} size={m.cell} tone={tones.pink} wires={E | W} lit={lit} />
      {filled && <BlockCell x={row(2).x} y={row(2).y} size={m.cell} tone={tones.orange} wires={E | W} lit={lit} />}
      <BlockCell x={row(3).x} y={row(3).y} size={m.cell} tone={tones.blue} wires={E | W} lit={lit} />
      <LampCell x={row(4).x} y={row(4).y} size={m.cell} dir={W} lit={lit} />
    </Canvas>
  );
}

/** Sayfa 2: turuncu parça yukarıdan boşluğa süzülüp oturur, döngüyle tekrarlar. */
function DragDemo({ width, still }: { width: number; still: boolean }) {
  const m = useBoardMetrics(width);
  const t = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (still) return;
    t.value = withRepeat(withSequence(
      withTiming(0, { duration: 350 }),
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) }),
      withTiming(1, { duration: 900 }),
    ), -1);
    return () => cancelAnimation(t);
  }, [still, t]);
  const tx = m.pad + GAP_COL * m.pitch;
  const ty = m.pad + ROW * m.pitch;
  const startY = -m.cell * 1.9;
  const startX = tx + m.pitch * 1.2;
  const pieceStyle = useAnimatedStyle(() => {
    const k = t.value;
    const arc = Math.sin(k * Math.PI) * m.cell * 0.4;
    const landed = k > 0.98;
    return {
      transform: [
        { translateX: startX + (tx - startX) * k },
        { translateY: startY + (ty - startY) * k - arc },
        { scale: landed ? 1 : 1.12 },
        { rotate: `${(1 - k) * 8}deg` },
      ],
    };
  });
  const handStyle = useAnimatedStyle(() => ({
    opacity: t.value > 0.98 ? 0 : 1,
    transform: [
      { translateX: startX + (tx - startX) * t.value + m.cell * 0.5 - TIP.x },
      { translateY: startY + (ty - startY) * t.value + m.cell * 0.85 - TIP.y },
    ],
  }));
  return (
    <View style={{ width: m.w, height: m.h + 8 }}>
      <MiniBoard width={width} lit={false} filled={false} />
      <Animated.View style={[styles.abs, pieceStyle]}>
        <Canvas style={{ width: m.cell, height: m.cell * 1.15 }}>
          <BlockCell x={0} y={0} size={m.cell} tone={tones.orange} wires={E | W} />
        </Canvas>
      </Animated.View>
      <Animated.View style={[styles.abs, handStyle]}>
        <HandGraphic />
      </Animated.View>
    </View>
  );
}

/** Sayfa 3: yanan devre, nabız gibi parlayan tahta ve yükselen puan. */
function CircuitDemo({ width, still }: { width: number; still: boolean }) {
  const m = useBoardMetrics(width);
  const t = useSharedValue(still ? 0.5 : 0);
  useEffect(() => {
    if (still) return;
    t.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1);
    return () => cancelAnimation(t);
  }, [still, t]);
  const scoreStyle = useAnimatedStyle(() => ({
    opacity: still ? 1 : t.value < 0.15 ? t.value / 0.15 : 1 - Math.max(0, t.value - 0.7) / 0.3,
    transform: [{ translateY: -t.value * m.cell * 0.9 }, { scale: 0.8 + 0.3 * Math.min(1, t.value * 3) }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.35 + 0.4 * Math.sin(t.value * Math.PI) }));
  return (
    <View style={{ width: m.w, height: m.h + 8 }}>
      <Animated.View style={[styles.boardGlow, { borderRadius: m.cell * 0.5 }, glowStyle]} />
      <MiniBoard width={width} lit filled />
      <Animated.View style={[styles.score, { top: m.pad + ROW * m.pitch - m.cell * 0.9 }, scoreStyle]}>
        <DText variant="display" size={34} color={colors.starOn} shadow={colors.praiseShadow} shadowY={3}>+120</DText>
      </Animated.View>
    </View>
  );
}

// ---------- Sayfalar ----------

const SPARKLES = [
  [0.14, 0.18, 22],
  [0.86, 0.22, 16],
  [0.8, 0.78, 20],
  [0.18, 0.8, 14],
] as const;

function Page({ index, width, height, still }: { index: number; width: number; height: number; still: boolean }) {
  const p = PAGES[index];
  const art = Math.min(height * 0.42, 340);
  const boardWidth = Math.min(width - 48, 330);
  return (
    <View style={{ width, paddingHorizontal: 24, alignItems: 'center' }}>
      <View style={[styles.art, { width: width - 48, height: art }]}>
        <Sunburst cx={(width - 48) / 2} cy={art / 2} radius={art * 0.75} still={still} core={index !== 1} />
        <SparkleField width={width - 48} height={art} points={SPARKLES} still={still} />
        {index === 0 && <Kivilcim width={Math.min(150, art * 0.48)} mood="happy" />}
        {index === 1 && <DragDemo width={boardWidth} still={still} />}
        {index === 2 && <CircuitDemo width={boardWidth} still={still} />}
      </View>
      <View style={styles.card}>
        <DText variant="display" size={30} shadow={colors.textShadow} shadowY={3} style={styles.center}>{p.title}</DText>
        <DText size={17} color={colors.textSecondary} style={[styles.center, styles.body]}>{p.body}</DText>
      </View>
    </View>
  );
}

function Dots({ page }: { page: number }) {
  return (
    <View style={styles.dots} accessibilityLabel={`Sayfa ${page + 1} / ${PAGES.length}`}>
      {PAGES.map((_, i) => (
        <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
      ))}
    </View>
  );
}

export function OnboardingScreen({ onPlay, onSkip, reduceMotion }: {
  /** Son sayfadaki "Hadi Oynayalım!" */
  onPlay: () => void;
  /** "Geç": ana ekrana */
  onSkip: () => void;
  reduceMotion: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };
  const next = () => {
    if (last) {
      onPlay();
      return;
    }
    scroll.current?.scrollTo({ x: (page + 1) * width, animated: !reduceMotion });
    setPage(page + 1);
  };

  return (
    <NightBackground still={reduceMotion}>
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.top}>
          {!last && (
            <Pressable onPress={onSkip} accessibilityRole="button" accessibilityLabel="Tanıtımı geç" hitSlop={12}
              style={styles.skip}>
              <DText variant="label" size={14} color={colors.text}>Geç</DText>
            </Pressable>
          )}
        </View>
        <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd} style={styles.pager} contentContainerStyle={styles.pagerContent}>
          {PAGES.map((_, i) => (
            <Page key={i} index={i} width={width} height={height} still={reduceMotion} />
          ))}
        </ScrollView>
        <Dots page={page} />
        <View style={styles.button}>
          <CandyButton label={last ? 'Hadi Oynayalım!' : 'İleri'} tone={last ? buttonTones.primary : buttonTones.secondary}
            height={BTN.primaryHeight} fontSize={28} onPress={next} />
        </View>
      </View>
    </NightBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { height: 44, flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20 },
  skip: {
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 18,
    justifyContent: 'center',
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.panelBorder,
  },
  pager: { flexGrow: 1 },
  pagerContent: { alignItems: 'center' },
  art: { alignItems: 'center', justifyContent: 'center' },
  card: {
    width: '100%',
    maxWidth: 360,
    marginTop: 18,
    borderRadius: 28,
    backgroundColor: colors.panel,
    borderWidth: 4,
    borderColor: colors.panelBorder,
    boxShadow: '0 8px 0 rgba(0,0,0,0.3)',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 8,
  },
  center: { textAlign: 'center' },
  body: { lineHeight: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 18 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.starOff, boxShadow: '0 2px 0 rgba(0,0,0,0.3)' },
  dotOn: { width: 32, backgroundColor: colors.starOn, boxShadow: `0 2px 0 ${colors.starOnStroke}` },
  button: { paddingHorizontal: 40 },
  abs: { position: 'absolute', left: 0, top: 0 },
  boardGlow: {
    ...StyleSheet.absoluteFill,
    bottom: 8,
    boxShadow: `0 0 28px 10px ${colors.lampGlow}`,
  },
  score: { position: 'absolute', right: 6 },
});
