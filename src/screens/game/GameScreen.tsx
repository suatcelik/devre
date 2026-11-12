import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  GAMEOVER_PANEL_GAP_MS,
  RETURN_SHAKE_DEG,
  RETURN_SHAKE_STEP_MS,
  RETURN_SPRING,
  SCORE_FLY_MS,
} from '../../anim/constants';
import { previewCircuit } from '../../game/engine';
import { canPlace } from '../../game/placement';
import type { GameState } from '../../game/types';
import { BoardCanvas, Ghost, greyOutDuration } from '../../render/BoardCanvas';
import { boardLayout } from '../../render/layout';
import { pieceCanvasSize } from '../../render/PieceCanvas';
import { useGameStore } from '../../store/gameStore';
import { buttonTones, colors } from '../../theme/colors';
import { screenPadding } from '../../theme/sizes';
import { CandyButton, RoundIconButton, StatBox } from '../../ui/CandyButton';
import { DText } from '../../ui/DText';
import { formatScore } from '../../ui/format';
import { Kivilcim, Mood } from '../../ui/Kivilcim';
import { NightBackground } from '../../ui/NightBackground';
import { Panel } from '../../ui/Panel';
import { SettingsToggles } from '../../ui/SettingsToggles';
import { haptic } from '../../audio/haptics';
import { playTimeline } from '../../audio/playTimeline';
import { playSfx } from '../../audio/sound';
import { BOARD_SIZE } from '../../game/types';
import { POWERUP_KINDS, PowerupKind } from '../../game/powerups';
import { JOKERS } from '../../ui/jokers';
import { ShopPanel } from '../../ui/ShopPanel';
import { TUTORIAL_STEPS, nextHint } from '../../tutorial/steps';
import { DragLayer } from './DragLayer';
import { endlessStars } from '../../game/results';
import { GoalBar } from '../../ui/GoalBar';
import { EndlessResult } from './ResultPanel';
import { LevelResult } from './LevelResult';
import { IntroPanel } from './IntroPanel';
import { goalLabel, goalProgress as levelGoalProgress, goalText, movesLeft } from '../../levels';
import { TutorialHand } from './TutorialHand';
import { Bouncer, FlyingScore, Praise, ScoreCounter, ScreenFlash, useScreenFx } from './effects';
import { DragGeometry, MeasureInRoot, SlotView, Tray, trayCell } from './Tray';

export function GameScreen({ onHome, onMap, onDaily }: { onHome: () => void; onMap: () => void; onDaily: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const layout = useMemo(() => boardLayout(width), [width]);

  const game = useGameStore((s) => s.game);
  const mode = useGameStore((s) => s.mode);
  const best = useGameStore((s) => s.best);
  const bestAtStart = useGameStore((s) => s.bestAtStart);
  const timeline = useGameStore((s) => s.timeline);
  const locked = useGameStore((s) => s.locked);
  const reduceMotion = useGameStore((s) => s.settings.reduceMotion);
  const drop = useGameStore((s) => s.drop);
  const start = useGameStore((s) => s.start);
  const tutorial = useGameStore((s) => s.tutorial);
  const startTutorial = useGameStore((s) => s.startTutorial);
  const finishTutorial = useGameStore((s) => s.finishTutorial);
  const level = useGameStore((s) => s.level);
  const levelEnd = useGameStore((s) => s.levelEnd);
  const startLevel = useGameStore((s) => s.startLevel);
  const powerups = useGameStore((s) => s.powerups);
  const earned = useGameStore((s) => s.earned);
  const activatePowerup = useGameStore((s) => s.activatePowerup);
  /** Güçlendiriciler sonsuz modda ve bölümlerde; Günün Tahtası'nda herkes eşit koşulda oynar (4.10). */
  const powerupsAllowed = mode === 'endless' || mode === 'level';
  const isDaily = mode === 'daily';
  const restart = () => {
    if (tutorial) startTutorial(tutorial.next);
    else if (level) startLevel(level.id);
    else start(mode === 'daily' ? 'daily' : 'endless');
  };

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const [paused, setPaused] = useState(false);
  /** Yeni öğe tanıtımı bu bölüm için kapatıldı mı (ekran açık kaldıkça bir kez) */
  const [introSeenFor, setIntroSeenFor] = useState<number | null>(null);
  /** Tahtaya dokunarak kullanılan joker seçili (Çekiç, Döndür, Yıldırım): dokunuşu bekler */
  const [aim, setAim] = useState<PowerupKind | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  /** Joker düğmesi: elde yoksa dükkân açılır; Karıştır hemen işler; diğerleri tahtaya dokunuşu bekler. */
  const onJoker = (kind: PowerupKind) => {
    if (powerups[kind] === 0) {
      setAim(null);
      setShopOpen(true);
      return;
    }
    if (kind === 'shuffle') {
      setAim(null);
      if (!activatePowerup('shuffle')) playSfx('invalid');
      return;
    }
    setAim((on) => (on === kind ? null : kind));
  };
  /** Kazanılan güçlendirici bildirimi gösterildi mi */
  const [earnedSeen, setEarnedSeen] = useState<number | null>(null);
  useEffect(() => {
    if (!earned) return;
    const t = setTimeout(() => setEarnedSeen(earned.id), 2200);
    return () => clearTimeout(t);
  }, [earned]);

  // Sürükleme geometrisi UI iş parçacığında okunur.
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const tilt = useSharedValue(0);
  const boardOrigin = useSharedValue({ x: 0, y: 0 });
  const scoreTarget = useSharedValue({ x: width / 2, y: 60 });
  const geo: DragGeometry = useMemo(
    () => ({ dragX, dragY, dragScale, tilt, boardOrigin }),
    [dragX, dragY, dragScale, tilt, boardOrigin],
  );

  /** Ölçüm referansı: sürükleme, gölge, uçan puan ve el işareti bu görünüme göre konumlanır. */
  const rootRef = useRef<React.ComponentRef<typeof View>>(null);
  const boardRef = useRef<React.ComponentRef<typeof View>>(null);
  const scoreRef = useRef<React.ComponentRef<typeof View>>(null);
  const slotRefs = useRef<(SlotView | null)[]>([]);
  const returnToken = useRef(0);
  const registerSlot = useCallback((i: number, v: SlotView | null) => {
    slotRefs.current[i] = v;
  }, []);

  // Pencereye göre ölçüm (measureInWindow) Android'de durum çubuğu kadar kayabildiği için
  // her şey kök görünüme göre ölçülür: parça, gölge ve bırakılan hücre aynı koordinatlarda kalır.
  const measureInRoot: MeasureInRoot = useCallback((view, cb) => {
    if (!rootRef.current) return;
    view.measureLayout(rootRef.current, (x: number, y: number, w: number, h: number) => cb(x, y, w, h), () => undefined);
  }, []);
  const measureBoard = useCallback(() => {
    if (boardRef.current) measureInRoot(boardRef.current, (x, y) => (boardOrigin.value = { x, y }));
  }, [boardOrigin, measureInRoot]);
  const measureScore = useCallback(() => {
    if (scoreRef.current) {
      measureInRoot(scoreRef.current, (x, y, w, h) => (scoreTarget.value = { x: x + w / 2, y: y + h / 2 }));
    }
  }, [scoreTarget, measureInRoot]);

  /** Geçersiz bırakma: parça tepsiye yaylanarak döner ve hafifçe sallanır. */
  const returnToTray = useCallback(
    (i: number) => {
      const token = ++returnToken.current;
      const piece = useGameStore.getState().game.tray[i];
      const slot = slotRefs.current[i];
      if (!piece || !slot) {
        setDragIndex(null);
        return;
      }
      measureInRoot(slot, (sx, sy, sw, sh) => {
        const dims = pieceCanvasSize(piece, layout.cell, layout.gap, true);
        dragX.value = withSpring(sx + sw / 2 - dims.width / 2, RETURN_SPRING);
        // Gövde merkezi yuva merkezine oturur (büyütme gövde merkezinde, bkz. DragLayer).
        dragY.value = withSpring(sy + sh / 2 - dims.bodyHeight / 2, RETURN_SPRING);
        dragScale.value = withSpring(trayCell(piece) / layout.cell, RETURN_SPRING);
        const d = reduceMotion ? 0 : RETURN_SHAKE_DEG;
        tilt.value = withSequence(
          withTiming(d, { duration: RETURN_SHAKE_STEP_MS }),
          withTiming(-d, { duration: RETURN_SHAKE_STEP_MS }),
          withTiming(d / 2, { duration: RETURN_SHAKE_STEP_MS }),
          withTiming(0, { duration: RETURN_SHAKE_STEP_MS }),
        );
      });
      setTimeout(() => {
        if (returnToken.current === token) setDragIndex(null);
      }, 400);
    },
    [layout, dragX, dragY, dragScale, tilt, reduceMotion, measureInRoot],
  );

  const handlers = useMemo(
    () => ({
      onStart: (i: number) => {
        returnToken.current++;
        playSfx('pickup');
        haptic('pickup');
        measureBoard();
        setDragIndex(i);
        setHover(null);
      },
      onHover: (_i: number, r: number, c: number) => setHover({ r, c }),
      onDrop: (i: number, r: number, c: number) => {
        setHover(null);
        if (drop(i, r, c)) {
          setDragIndex(null);
          return;
        }
        // Tahtanın üstünde geçersiz bırakma uyarı verir; tepside dokunup bırakmak sessiz döner.
        if (r >= 0 && c >= 0 && r < BOARD_SIZE && c < BOARD_SIZE) {
          playSfx('invalid');
          haptic('invalid');
        }
        returnToTray(i);
      },
    }),
    [drop, measureBoard, returnToTray],
  );

  // Önizleme: geçerli yerde hayalet, tamamlanacak devre önceden parlar (DEVRE_TASKS 2.4, 2.5).
  const dragged = dragIndex !== null ? game.tray[dragIndex] : null;
  const preview = useMemo(() => {
    if (!dragged || !hover || dragIndex === null || locked) return { ghost: null, path: null };
    if (!canPlace(game.board, dragged, hover.r, hover.c)) return { ghost: null, path: null };
    const ghost: Ghost = { piece: dragged, r: hover.r, c: hover.c };
    return { ghost, path: previewCircuit(game, dragIndex, hover.r, hover.c) };
  }, [dragged, hover, dragIndex, game, locked]);

  const tl = timeline?.tl ?? null;
  const playId = timeline?.id ?? null;
  const { shakeStyle, flashStyle } = useScreenFx(playId, tl?.lamp?.at ?? null, tl?.shakeAt ?? null, !reduceMotion);

  // Oyun sonu: bloklar grileştikten sonra panel yukarıdan düşer.
  const [overShownFor, setOverShownFor] = useState<GameState | null>(null);
  // Ses ve titreşim, hamle animasyonuyla aynı anlarda çalar (DEVRE_TASKS 3.6).
  useEffect(() => (timeline ? playTimeline(timeline.tl) : undefined), [timeline]);

  useEffect(() => {
    if (!game.over || timeline) return;
    playSfx('gameover');
    haptic('gameOver');
    const t = setTimeout(() => setOverShownFor(game), greyOutDuration(game.board) + GAMEOVER_PANEL_GAP_MS);
    return () => clearTimeout(t);
  }, [game, timeline]);
  const showOver = game.over && overShownFor === game && !level;

  // Bölüm hamle bitince kaybedildiyse (tahta dolmadan) üzgün ses; tahta dolduysa yukarıdaki çaldı.
  useEffect(() => {
    if (levelEnd?.status === 'lost' && levelEnd.reason === 'moves') {
      playSfx('gameover');
      haptic('gameOver');
    }
  }, [levelEnd]);

  // Öğretici: el işareti, kimse sürüklemiyorken ve animasyon yokken sıradaki doğru hamleyi gösterir.
  const measureSlot = useCallback((i: number, cb: (x: number, y: number, w: number, h: number) => void) => {
    const slot = slotRefs.current[i];
    if (slot) measureInRoot(slot, cb);
  }, [measureInRoot]);
  const hint = tutorial && !tutorial.finished && !timeline ? nextHint(tutorial.step, game) : null;
  const hintPiece = hint ? game.tray[hint.trayIndex] : null;
  const showHand = hint && hintPiece && dragIndex === null && !locked && !paused;

  let mood: Mood = 'idle';
  if (game.over || levelEnd?.status === 'lost') mood = 'sad';
  else if (tl?.current || tutorial?.finished || levelEnd?.status === 'won') mood = 'happy';
  else if (preview.path) mood = 'surprised';

  const showIntro = !!level?.intro && introSeenFor !== level.id && game.moves === 0;

  /** Seçili joker: tahtaya dokunulan hücreye uygulanır (Yıldırım hücreye bakmaz). */
  const onBoardTap = (x: number, y: number) => {
    if (!aim) return;
    const c = Math.floor((x - layout.inset + layout.gap / 2) / layout.pitch);
    const r = Math.floor((y - layout.inset + layout.gap / 2) / layout.pitch);
    const ok = aim === 'lightning'
      ? activatePowerup('lightning')
      : r >= 0 && c >= 0 && r < BOARD_SIZE && c < BOARD_SIZE && activatePowerup(aim, r, c);
    if (ok) setAim(null);
    else playSfx('invalid');
  };
  const canRescue = powerupsAllowed;
  const rescueButtons = canRescue ? (
    <View style={styles.rescue}>
      {powerups.lightning > 0 && (
        <CandyButton label={`Yıldırımla tahtayı temizle (${powerups.lightning})`} tone={buttonTones.daily} height={52}
          fontSize={18} onPress={() => setAim('lightning')} />
      )}
      {powerups.shuffle > 0 && (
        <CandyButton label={`Karıştır ve devam et (${powerups.shuffle})`} tone={buttonTones.secondary} height={52} fontSize={20}
          onPress={() => activatePowerup('shuffle')} />
      )}
      {powerups.hammer > 0 && (
        <CandyButton label={`Çekiçle yer aç (${powerups.hammer})`} tone={buttonTones.danger} height={52} fontSize={20}
          onPress={() => setAim('hammer')} />
      )}
      <CandyButton label="Dükkândan joker al" tone={buttonTones.accent} height={48} fontSize={18}
        onPress={() => setShopOpen(true)} />
    </View>
  ) : null;
  const inputEnabled = !locked && !game.over && !paused && !showIntro;
  const firstPop = tl?.scorePops[0];

  // Hedef (3.7.3): sonsuz modda çubuk rekora doğru dolar (ilk oyunda yıldız sayısını gösterir);
  // bölümde 3. yıldız eşiğine doğru dolar, ilk yıldız bölüm hedefi tutunca yanar.
  const endlessGoals = useMemo(() => endlessStars(game, bestAtStart), [game, bestAtStart]);
  const lp = level ? levelGoalProgress(level.goal, game) : null;
  const goals = level && lp
    ? [
        { label: 'Hedef', met: lp.done },
        { label: `${formatScore(level.stars[1])} puan`, met: game.score >= level.stars[1] },
        { label: `${formatScore(level.stars[2])} puan`, met: game.score >= level.stars[2] },
      ]
    : endlessGoals;
  const goalProgress = level
    ? Math.min(game.score / level.stars[2], 1)
    : bestAtStart > 0
      ? Math.min(game.score / bestAtStart, 1)
      : endlessGoals.filter((g) => g.met).length / endlessGoals.length;
  const moves = level ? movesLeft(level, game) : 0;

  // Kısa yönlendirme: öğretici adımı ya da bölümün hedefi (ilk hamleye kadar).
  const earnedText = earned && earnedSeen !== earned.id
    ? [earned.gain.hammer ? `+${earned.gain.hammer} Çekiç` : null, earned.gain.shuffle ? `+${earned.gain.shuffle} Karıştır` : null]
        .filter(Boolean)
        .join('  ') + ' kazandın!'
    : null;
  const caption = aim
    ? JOKERS[aim].aim ?? null
    : tutorial && !tutorial.finished
      ? TUTORIAL_STEPS[tutorial.step].caption
      : earnedText
        ? earnedText
        : level && game.moves === 0
          ? goalText(level.goal)
          : null;

  return (
    <NightBackground still={reduceMotion}>
      <View ref={rootRef} style={styles.measureRoot} collapsable={false}>
      <Animated.View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 6 }, shakeStyle]}>
        {/* Üst: en iyi + puan + yanan lamba sayısı */}
        <View style={styles.hud}>
          {level ? (
            <StatBox label="Hamle" value={String(moves)} alert={moves <= 3} />
          ) : tutorial ? (
            <CandyButton label="Geç" tone={buttonTones.icon} height={48} fontSize={20} style={styles.skip}
              accessibilityHint="Öğreticiyi atlayıp oyuna başlar" onPress={finishTutorial} />
          ) : (
            <StatBox label="En iyi" value={formatScore(best)} />
          )}
          <View style={styles.scoreCol}>
            <DText variant="label" size={12}>
              {level ? `Bölüm ${level.id}` : tutorial ? 'Öğretici' : mode === 'daily' ? 'Günün Tahtası' : 'Sonsuz'}
            </DText>
            <View ref={scoreRef} onLayout={measureScore}>
              <ScoreCounter value={game.score} playId={playId ?? 0}
                from={timeline ? timeline.scoreBefore : game.score}
                delay={firstPop ? firstPop.at + SCORE_FLY_MS : 0} />
            </View>
            {!tutorial && (
              <GoalBar progress={goalProgress} stars={goals.map((g) => g.met)} labels={goals.map((g) => g.label)}
                delay={firstPop ? firstPop.at + SCORE_FLY_MS : 0} still={reduceMotion} />
            )}
          </View>
          {level && lp ? (
            <StatBox label={goalLabel(level.goal)}
              value={level.goal.type === 'score' ? formatScore(lp.target) : `${Math.min(lp.current, lp.target)}/${lp.target}`} />
          ) : tutorial ? (
            <StatBox label="Adım" value={`${Math.min(tutorial.step + 1, TUTORIAL_STEPS.length)}/${TUTORIAL_STEPS.length}`} />
          ) : (
            <StatBox label="Lamba" value={String(game.circuits)} />
          )}
        </View>

        {/* Kıvılcım + övgü */}
        <View style={styles.feedback}>
          <Bouncer playId={playId ?? 0} at={tl?.lamp?.at ?? null}>
            <Kivilcim width={52} mood={mood} />
          </Bouncer>
          {tl && tl.lamp && (tl.praise || tl.combo > 1) && (
            <Praise key={playId} text={tl.praise?.text ?? null} combo={tl.combo} at={tl.lamp.at} />
          )}
          {caption && !tl && (
            <Animated.View key={caption} style={styles.caption}
              entering={reduceMotion ? undefined : ZoomIn.springify().damping(12)}
              accessibilityLiveRegion="polite">
              <DText variant="display" size={26} shadow={colors.textShadow} shadowY={3} numberOfLines={1}
                adjustsFontSizeToFit>
                {caption}
              </DText>
            </Animated.View>
          )}
        </View>

        {/* Tahta */}
        <View ref={boardRef} onLayout={measureBoard} style={styles.board} accessible
          accessibilityLabel="Oyun tahtası">
          <BoardCanvas board={game.board} layout={layout} timeline={timeline} gameOver={game.over && !aim}
            reduceMotion={reduceMotion} ghost={preview.ghost} litPath={preview.path} />
          {aim && (
            <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={JOKERS[aim].aim}
              onPress={(e) => onBoardTap(e.nativeEvent.locationX, e.nativeEvent.locationY)} />
          )}
        </View>

        <Tray tray={game.tray} dragIndex={dragIndex} enabled={inputEnabled} layout={layout} geo={geo}
          handlers={handlers} reduceMotion={reduceMotion} onSlotRef={registerSlot} measureInRoot={measureInRoot} />

        <View style={styles.bottomBar}>
          <RoundIconButton icon="pause" tone={buttonTones.icon} label="Duraklat" onPress={() => setPaused(true)} />
          {powerupsAllowed && (
            <View style={styles.powerups}>
              {POWERUP_KINDS.map((k) => (
                <RoundIconButton key={k} icon={JOKERS[k].icon} tone={JOKERS[k].tone}
                  label={powerups[k] > 0 ? `${JOKERS[k].name}, ${powerups[k]} adet` : `${JOKERS[k].name}: dükkândan al`}
                  badge={powerups[k]} disabled={locked} active={aim === k} onPress={() => onJoker(k)} />
              ))}
            </View>
          )}
        </View>
      </Animated.View>

      {tl?.scorePops.map((pop, i) => (
        <FlyingScore key={`${playId}-${i}`} pop={pop} layout={layout} boardOrigin={boardOrigin}
          scoreTarget={scoreTarget} />
      ))}

      {showHand && (
        <TutorialHand key={`${tutorial?.step}-${hintPiece.id}`} piece={hintPiece} move={hint} layout={layout}
          boardOrigin={boardOrigin} measureSlot={measureSlot} />
      )}
      <DragLayer piece={dragged ?? null} layout={layout} geo={geo} />
      {!reduceMotion && <ScreenFlash style={flashStyle} />}

      {tutorial?.finished && (
        <Panel label="Öğretici tamamlandı" variant="drop">
          <Kivilcim width={80} mood="happy" />
          <DText variant="display" size={40} color={colors.starOn} shadow={colors.praiseShadow}>Hazırsın!</DText>
          <DText size={16} color={colors.textSecondary} style={styles.center}>
            Pilden lambaya yol kur. Yer kalmayınca oyun biter.
          </DText>
          <CandyButton label="Oyna" tone={buttonTones.primary} height={60} fontSize={28} onPress={finishTutorial} />
        </Panel>
      )}

      {paused && !game.over && !levelEnd && (
        <Panel label="Duraklatıldı">
          <DText variant="display" size={36} shadow={colors.textShadow}>Mola</DText>
          <CandyButton label="Devam" tone={buttonTones.primary} height={60} fontSize={26}
            onPress={() => setPaused(false)} />
          {/* Günün Tahtası'nda tek deneme: yeniden başlama yok */}
          {!isDaily && (
            <CandyButton label="Yeniden Başla" tone={buttonTones.secondary}
              onPress={() => { setPaused(false); restart(); }} />
          )}
          {isDaily && (
            <DText size={14} color={colors.textSecondary} style={styles.center}>
              {"Günün Tahtası'nda tek deneme var; çıkarsan şimdiki puanın sonuç sayılır."}
            </DText>
          )}
          <CandyButton label={level ? 'Harita' : 'Ana Menü'} tone={buttonTones.icon} onPress={level ? onMap : onHome} />
          <SettingsToggles />
        </Panel>
      )}

      {showOver && !aim && (
        <EndlessResult game={game} bestBefore={bestAtStart} best={best} still={reduceMotion}
          daily={isDaily} rescue={rescueButtons} onRestart={restart} onHome={onHome} onDaily={onDaily} />
      )}

      {showIntro && level?.intro && (
        <IntroPanel intro={level.intro} onClose={() => setIntroSeenFor(level.id)} />
      )}

      {level && levelEnd && !aim && (
        <LevelResult level={level} game={game} outcome={levelEnd} still={reduceMotion}
          rescue={levelEnd.status === 'lost' && levelEnd.reason === 'stuck' ? rescueButtons : null}
          onNext={startLevel} onRetry={restart} onMap={onMap} />
      )}

      {shopOpen && <ShopPanel onClose={() => setShopOpen(false)} />}
      </View>
    </NightBackground>
  );
}

const styles = StyleSheet.create({
  measureRoot: { flex: 1 },
  root: { flex: 1, paddingHorizontal: screenPadding.game, gap: 14 },
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skip: { width: 84 },
  center: { textAlign: 'center' },
  caption: { flexShrink: 1 },
  scoreCol: { alignItems: 'center', gap: 2 },
  feedback: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  board: { alignSelf: 'center' },
  bottomBar: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  powerups: { flexDirection: 'row', gap: 12 },
  rescue: { alignSelf: 'stretch', gap: 10 },
});
