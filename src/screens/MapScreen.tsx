// Macera haritası (DEVRE_TASKS 4.2): gece şehri, yukarı doğru kıvrılan yol, bölüm düğümleri.
// Tamamlanan bölümler mahallenin pencerelerini yakar; mahalle bitince ışıl ışıl olur.
import { BlurMask, Canvas, DashPathEffect, Group, Path, Rect, Skia } from '@shopify/react-native-skia';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createRng } from '../game/rng';
import { CHAPTERS, LEVELS, chapterOf, goalText, isUnlocked, nextLevel, totalStars } from '../levels';
import { ChapterBand, MapLayout, mapLayout, mapTiles } from '../levels/mapLayout';
import { useGameStore } from '../store/gameStore';
import { Tone, buttonTones, colors, tones } from '../theme/colors';
import { button as BTN, screenPadding } from '../theme/sizes';
import { CandyButton, RoundIconButton } from '../ui/CandyButton';
import { CoinBadge } from '../ui/Coin';
import { ShopPanel } from '../ui/ShopPanel';
import { DText } from '../ui/DText';
import { withAccusative } from '../ui/format';
import { Icon } from '../ui/Icon';
import { Kivilcim } from '../ui/Kivilcim';
import { NightBackground } from '../ui/NightBackground';
import { StarIcon } from '../ui/StarRow';

/** Tamamlanan düğümlerin renk sırası */
const NODE_TONES: Tone[] = [tones.green, tones.blue, tones.pink, tones.orange, tones.purple];
const SIZE = { done: 60, current: 76, locked: 56 } as const;
const BUILDING = '#241A55';

// ---------- şehir ----------

interface Skyline {
  body: string;
  windows: { x: number; y: number }[];
}

/** Mahalle bandının alt kenarına dizilen binalar (tohumlu, her açılışta aynı) */
function buildSkyline(band: ChapterBand, width: number): Skyline {
  const rng = createRng(band.chapter.id * 977);
  const base = band.bottom - 4;
  let body = '';
  const windows: { x: number; y: number }[] = [];
  for (let x = 4; x < width - 20; ) {
    const w = 40 + rng.int(4) * 8;
    const h = 60 + rng.int(7) * 14;
    body += `M${x} ${base}V${base - h}H${x + w}V${base}Z`;
    for (let wy = base - h + 10; wy < base - 12; wy += 16) {
      for (let wx = x + 8; wx < x + w - 8; wx += 12) windows.push({ x: wx, y: wy });
    }
    x += w + 6 + rng.int(3) * 6;
  }
  // Pencereler tohumlu karışık sırada yanar: bölüm geçildikçe daha çok pencere.
  return { body, windows: rng.shuffle(windows) };
}

function City({ layout, lit }: { layout: MapLayout; lit: (bandIndex: number) => number }) {
  const skylines = useMemo(() => layout.bands.map((b) => buildSkyline(b, layout.width)), [layout]);
  return (
    <>
      {skylines.map((s, i) => {
        const fraction = lit(i);
        const count = Math.round(s.windows.length * fraction);
        const on = Skia.PathBuilder.Make();
        const off = Skia.PathBuilder.Make();
        s.windows.forEach((w, k) => (k < count ? on : off).addRRect(Skia.RRectXY(Skia.XYWHRect(w.x, w.y, 6, 8), 1, 1)));
        const band = layout.bands[i];
        return (
          <Group key={i}>
            {fraction >= 1 && (
              // Mahalle tamamen aydınlandı: binaların ardında sıcak bir hale
              <Rect x={0} y={band.bottom - 160} width={layout.width} height={160} color={colors.wireGlow} opacity={0.12}>
                <BlurMask blur={40} style="normal" />
              </Rect>
            )}
            <Path path={s.body} color={BUILDING} />
            <Path path={off.detach()} color={colors.emptyCell} />
            <Path path={on.detach()} color={colors.windowOn} />
          </Group>
        );
      })}
    </>
  );
}

// ---------- yol ----------

function Road({ layout, litUpTo }: { layout: MapLayout; litUpTo: number }) {
  const points = layout.nodes;
  const full = points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join('') +
    // Son bölümden yukarı "yakında" bölgesine uzanan devam
    ` L${points[points.length - 1].x} 40`;
  const litPoints = points.filter((p) => p.id <= litUpTo);
  const lit = litPoints.length > 1 ? litPoints.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join('') : null;
  return (
    <>
      <Path path={full} color={colors.panelBorder} style="stroke" strokeWidth={8} strokeCap="round" strokeJoin="round">
        <DashPathEffect intervals={[2, 16]} />
      </Path>
      {lit && (
        <>
          <Path path={lit} color={colors.wireGlow} style="stroke" strokeWidth={14} strokeCap="round" strokeJoin="round" opacity={0.6}>
            <BlurMask blur={6} style="normal" />
          </Path>
          <Path path={lit} color={colors.wireIdle} style="stroke" strokeWidth={8} strokeCap="round" strokeJoin="round" />
        </>
      )}
    </>
  );
}

// ---------- düğümler ----------

function MiniStars({ count }: { count: number }) {
  return (
    <View style={styles.miniStars} accessible={false}>
      {[0, 1, 2].map((i) => (
        <StarIcon key={i} size={18} on={i < count} />
      ))}
    </View>
  );
}

function CurrentNode({ id, x, y, still, onPress }: { id: number; x: number; y: number; still: boolean; onPress: () => void }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (still) return;
    pulse.value = withRepeat(withSequence(withTiming(1.08, { duration: 650 }), withTiming(1, { duration: 650 })), -1);
  }, [still, pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const s = SIZE.current;
  return (
    <Animated.View style={[styles.node, { left: x - s / 2, top: y - s / 2, width: s, height: s }, style]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Bölüm ${id}, sıradaki`}
        style={[styles.nodeFace, {
          width: s, height: s, borderRadius: s / 2,
          backgroundImage: `linear-gradient(180deg, ${tones.yellow.light} 0%, ${tones.yellow.base} 70%)`,
          boxShadow: `0 6px 0 ${tones.yellow.edge}, inset 0 2px 0 rgba(255,255,255,0.55), 0 0 0 8px rgba(255,210,63,0.3), 0 0 26px 6px rgba(255,210,63,0.6)`,
        }]}>
        <DText variant="display" size={32} color={colors.textOnButton}>{id}</DText>
      </Pressable>
    </Animated.View>
  );
}

function DoneNode({ id, x, y, stars, onPress }: { id: number; x: number; y: number; stars: number; onPress: () => void }) {
  const tone = NODE_TONES[(id - 1) % NODE_TONES.length];
  const s = SIZE.done;
  return (
    <View style={[styles.node, { left: x - s / 2, top: y - s / 2, width: s }]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Bölüm ${id}, ${stars} yıldız`}
        style={({ pressed }) => [styles.nodeFace, {
          width: s, height: s, borderRadius: s / 2,
          backgroundImage: `linear-gradient(180deg, ${tone.light} 0%, ${tone.base} 70%)`,
          boxShadow: `0 ${pressed ? 2 : 6}px 0 ${tone.edge}, inset 0 2px 0 rgba(255,255,255,0.55)`,
          transform: [{ translateY: pressed ? 4 : 0 }],
        }]}>
        <DText variant="display" size={24} color={colors.textOnButton}>{id}</DText>
      </Pressable>
      <MiniStars count={stars} />
    </View>
  );
}

function LockedNode({ id, x, y }: { id: number; x: number; y: number }) {
  const s = SIZE.locked;
  return (
    <View accessible accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel={`Bölüm ${id}, kilitli`}
      style={[styles.node, styles.nodeFace, {
        left: x - s / 2, top: y - s / 2, width: s, height: s, borderRadius: s / 2,
        backgroundColor: colors.levelLocked, boxShadow: `0 5px 0 ${colors.levelLockedEdge}`,
      }]}>
      <Icon name="lock" size={22} color={colors.textSecondary} />
    </View>
  );
}

/** Kıvılcım sıradaki bölümün yanında süzülür. */
function Guide({ x, y, width, still }: { x: number; y: number; width: number; still: boolean }) {
  const bob = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    bob.value = withRepeat(withSequence(withTiming(-8, { duration: 900 }), withTiming(0, { duration: 900 })), -1);
  }, [still, bob]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));
  const left = x + 90 > width ? x - 100 : x + 42;
  return (
    <Animated.View pointerEvents="none" style={[styles.guide, { left, top: y - 70 }, style]}>
      <Kivilcim width={50} />
    </Animated.View>
  );
}

// ---------- ekran ----------

export function MapScreen({ onBack, onPlay }: { onBack: () => void; onPlay: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const mapWidth = width - 2 * screenPadding.game;
  const layout = useMemo(() => mapLayout(mapWidth, CHAPTERS), [mapWidth]);

  const stars = useGameStore((s) => s.progress.stars);
  const startLevel = useGameStore((s) => s.startLevel);
  const still = useGameStore((s) => s.settings.reduceMotion);
  const coins = useGameStore((s) => s.coins);
  const [shopOpen, setShopOpen] = useState(false);

  const current = nextLevel(stars);
  const allDone = LEVELS.every((l) => (stars[l.id] ?? 0) > 0);
  const chapter = chapterOf(current);
  const currentNode = layout.nodes.find((n) => n.id === current)!;

  const play = useCallback((id: number) => {
    startLevel(id);
    onPlay();
  }, [startLevel, onPlay]);

  /** Mahallenin aydınlık oranı: geçilen bölüm / bölüm sayısı */
  const litFraction = (bandIndex: number) => {
    const c = layout.bands[bandIndex].chapter;
    let done = 0;
    for (let id = c.first; id <= c.last; id++) if ((stars[id] ?? 0) > 0) done++;
    return done / (c.last - c.first + 1);
  };

  // Açılışta sıradaki bölüm görünür olsun.
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  // Görünüm yüksekliği ve içerik boyu ikisi de belli olunca bir kez kaydırılır.
  const viewport = useRef(0);
  const scrolled = useRef(false);
  const scrollToCurrent = () => {
    if (scrolled.current || !viewport.current) return;
    const h = viewport.current;
    const y = Math.max(0, Math.min(layout.height - h, currentNode.y - h * 0.55));
    scrollRef.current?.scrollTo({ y, animated: false });
    scrolled.current = true;
  };
  const onViewport = (e: LayoutChangeEvent) => {
    viewport.current = e.nativeEvent.layout.height;
    scrollToCurrent();
  };

  return (
    <NightBackground still={still}>
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.header}>
          <RoundIconButton icon="back" tone={buttonTones.icon} label="Geri" size={48} onPress={onBack} />
          <View style={styles.title}>
            <DText variant="display" size={24}>{chapter.name}</DText>
            <DText size={13} color={colors.textSecondary}>Bölüm {chapter.first}–{chapter.last}</DText>
          </View>
          <View style={styles.headerSide} />
        </View>
        <View style={styles.wallet}>
          <View style={styles.starPill} accessible accessibilityLabel={`Toplam ${totalStars(stars)} yıldız`}>
            <StarIcon size={20} on />
            <DText variant="display" size={20}>{totalStars(stars)}</DText>
          </View>
          <CoinBadge coins={coins} onPress={() => setShopOpen(true)} />
        </View>

        <View style={styles.card} onLayout={onViewport}>
          <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} onContentSizeChange={scrollToCurrent}
            contentContainerStyle={{ width: mapWidth, height: layout.height }}>
            {mapTiles(layout.height).map(({ top, height }) => (
              // Harita tek dev tuval yerine dilimlere bölünür: Android'de bir tuval ~16.384 pikseli aşınca uygulama çöker
              // (80 bölümle harita ~9.600 nokta = ~26.000 piksel). Her dilim aynı sahnenin kendi kısmını çizer.
              <Canvas key={top} style={{ width: mapWidth, height, position: 'absolute', top }} pointerEvents="none">
                <Group transform={[{ translateY: -top }]}>
                  <City layout={layout} lit={litFraction} />
                  <Road layout={layout} litUpTo={allDone ? LEVELS.length : current} />
                </Group>
              </Canvas>
            ))}

            {layout.bands.map((band) => (
              <View key={band.chapter.id} style={[styles.sign, { top: band.bottom - (band.chapter.first === 1 ? 70 : 64) }]}
                accessible accessibilityRole="header">
                <DText variant="label" size={12} color={colors.text}>{band.chapter.name}</DText>
              </View>
            ))}

            <View style={[styles.soon, { top: 56 }]}>
              <DText variant="display" size={20} color={allDone ? colors.starOn : colors.textSecondary}>
                {allDone ? 'Şehrin tamamı aydınlandı!' : 'Şehrin ışıkları seni bekliyor'}
              </DText>
            </View>

            {layout.nodes.map((n) => {
              const s = stars[n.id] ?? 0;
              if (n.id === current && !allDone) {
                return <CurrentNode key={n.id} id={n.id} x={n.x} y={n.y} still={still} onPress={() => play(n.id)} />;
              }
              if (s > 0) return <DoneNode key={n.id} id={n.id} x={n.x} y={n.y} stars={s} onPress={() => play(n.id)} />;
              if (isUnlocked(n.id, stars)) {
                return <CurrentNode key={n.id} id={n.id} x={n.x} y={n.y} still onPress={() => play(n.id)} />;
              }
              return <LockedNode key={n.id} id={n.id} x={n.x} y={n.y} />;
            })}
            {!allDone && <Guide x={currentNode.x} y={currentNode.y} width={mapWidth} still={still} />}
          </ScrollView>
        </View>

        <View style={styles.cta}>
          {allDone ? (
            <DText variant="display" size={22} color={colors.starOn} style={styles.center}>
              Tüm bölümler tamam! Şehir ışıl ışıl.
            </DText>
          ) : (
            <>
              <DText size={14} color={colors.textSecondary} style={styles.center}>
                Hedef: {goalText(LEVELS[current - 1].goal)}
              </DText>
              <CandyButton label={`Bölüm ${withAccusative(current)} oyna`} tone={buttonTones.primary}
                height={BTN.primaryHeight - 8} fontSize={24} onPress={() => play(current)} />
            </>
          )}
        </View>
      </View>
      {shopOpen && <ShopPanel onClose={() => setShopOpen(false)} />}
    </NightBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: screenPadding.game, gap: 12 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { alignItems: 'center' },
  headerSide: { width: 48 },
  wallet: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  starPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.panel,
    borderWidth: 3,
    borderColor: colors.panelBorder,
  },
  card: { flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(21,16,51,0.35)' },
  node: { position: 'absolute', alignItems: 'center' },
  nodeFace: { alignItems: 'center', justifyContent: 'center' },
  miniStars: { flexDirection: 'row', marginTop: 4 },
  guide: { position: 'absolute' },
  sign: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 14,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.panelBorder,
  },
  soon: { position: 'absolute', alignSelf: 'center' },
  cta: { gap: 8, paddingHorizontal: 8 },
  center: { textAlign: 'center' },
});
