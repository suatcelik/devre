// Günlük sıralama ve arkadaşlar (DEVRE_TASKS 5.1, 5.3).
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDateTr } from '../daily/daily';
import { LeaderRow, leaderboard } from '../online/api';
import { todayKey, useGameStore } from '../store/gameStore';
import { buttonTones, colors, tones } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { screenPadding } from '../theme/sizes';
import { CandyButton, RoundIconButton } from '../ui/CandyButton';
import { DText } from '../ui/DText';
import { formatScore } from '../ui/format';
import { Kivilcim } from '../ui/Kivilcim';
import { NightBackground } from '../ui/NightBackground';
import { StarIcon } from '../ui/StarRow';

type Scope = 'all' | 'friends';

function Tabs({ scope, onChange }: { scope: Scope; onChange: (s: Scope) => void }) {
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {(['all', 'friends'] as const).map((s) => (
        <Pressable key={s} accessibilityRole="tab" accessibilityState={{ selected: scope === s }} onPress={() => onChange(s)}
          style={[styles.tab, scope === s && styles.tabOn]}>
          <DText variant="display" size={18} color={scope === s ? colors.textOnButton : colors.textSecondary}>
            {s === 'all' ? 'Herkes' : 'Arkadaşlar'}
          </DText>
        </Pressable>
      ))}
    </View>
  );
}

function Row({ row, me }: { row: LeaderRow; me: boolean }) {
  return (
    <View style={[styles.row, me && styles.rowMe]} accessible
      accessibilityLabel={`${row.rank}. ${row.name}${me ? ' (sen)' : ''}, ${row.score} puan`}>
      <View style={styles.rank}>
        {row.rank <= 3 ? <StarIcon size={26} on /> : null}
        <DText variant="display" size={row.rank <= 3 ? 14 : 18} color={row.rank <= 3 ? colors.textOnButton : colors.textSecondary}
          style={row.rank <= 3 ? styles.rankOnStar : undefined}>
          {row.rank}
        </DText>
      </View>
      <DText size={16} style={styles.name} numberOfLines={1}>{row.name}{me ? ' (sen)' : ''}</DText>
      <View style={styles.scoreCol}>
        <DText variant="display" size={20}>{formatScore(row.score)}</DText>
        <DText size={11} color={colors.textSecondary}>en uzun {row.longest}</DText>
      </View>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, maxLength, autoCapitalize, actionLabel, onAction, message }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength: number;
  autoCapitalize: 'none' | 'characters' | 'words';
  actionLabel: string;
  onAction: () => void;
  message: string | null;
}) {
  return (
    <View style={styles.field}>
      <DText variant="label" size={12}>{label}</DText>
      <View style={styles.fieldRow}>
        <TextInput value={value} onChangeText={onChange} placeholder={placeholder} maxLength={maxLength}
          autoCapitalize={autoCapitalize} autoCorrect={false} accessibilityLabel={label}
          placeholderTextColor={colors.textSecondary} style={styles.input} onSubmitEditing={onAction} returnKeyType="done" />
        <CandyButton label={actionLabel} tone={buttonTones.secondary} height={48} fontSize={18} style={styles.fieldBtn}
          onPress={onAction} />
      </View>
      {message && <DText size={13} color={colors.textSecondary} accessibilityLiveRegion="polite">{message}</DText>}
    </View>
  );
}

export function LeaderboardScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const still = useGameStore((s) => s.settings.reduceMotion);
  const online = useGameStore((s) => s.online);
  const connectOnline = useGameStore((s) => s.connectOnline);
  const syncDaily = useGameStore((s) => s.syncDaily);
  const saveNickname = useGameStore((s) => s.saveNickname);
  const addFriendCode = useGameStore((s) => s.addFriendCode);
  const today = todayKey();
  const mine = useGameStore((s) => s.dailyHistory[today]);

  const [scope, setScope] = useState<Scope>('all');
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [nick, setNick] = useState(online.profile?.nickname ?? '');
  const [nickMsg, setNickMsg] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeMsg, setCodeMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (online.status !== 'online') return;
    setLoading(true);
    await syncDaily();
    setRows(await leaderboard(today, scope));
    setLoading(false);
  }, [online.status, scope, today, syncDaily]);

  useEffect(() => {
    // Ağ isteği tamamlanınca durum güncellenir (eşzamanlı setState yok).
    let cancelled = false;
    (async () => {
      if (online.status !== 'online') return;
      await syncDaily();
      const data = await leaderboard(today, scope);
      if (!cancelled) setRows(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [online.status, scope, today, syncDaily]);

  const onSaveNick = async () => {
    const res = await saveNickname(nick);
    setNickMsg(res === 'ok' ? 'Kaydedildi.' : res === 'invalid' ? 'Takma ad 2–16 karakter olmalı.' : 'Bağlantı yok, sonra dene.');
    if (res === 'ok') void load();
  };
  const onAddFriend = async () => {
    const res = await addFriendCode(code);
    setCodeMsg(
      res === 'ok' ? 'Arkadaş eklendi!' : res === 'not-found' ? 'Bu kodla oyuncu bulunamadı.'
        : res === 'self' ? 'Bu senin kodun.' : 'Bağlantı yok, sonra dene.',
    );
    if (res === 'ok') {
      setCode('');
      setScope('friends');
    }
  };

  const pending = mine && mine.submitted === false;

  let body: React.ReactNode;
  if (online.status === 'off') {
    body = (
      <View style={styles.notice}>
        <Kivilcim width={90} mood="idle" />
        <DText variant="display" size={22} style={styles.center}>Sıralama yakında</DText>
        <DText size={15} color={colors.textSecondary} style={styles.center}>
          Çevrimiçi özellikler bu sürümde kapalı. Oyunun tamamı çevrimdışı oynanır.
        </DText>
      </View>
    );
  } else if (online.status !== 'online') {
    body = (
      <View style={styles.notice}>
        <Kivilcim width={90} mood="surprised" />
        <DText variant="display" size={22} style={styles.center}>
          {online.status === 'connecting' ? 'Bağlanıyor…' : 'İnternet yok'}
        </DText>
        <DText size={15} color={colors.textSecondary} style={styles.center}>
          Oynamaya devam edebilirsin; sonucun bağlantı gelince gönderilir.
        </DText>
        {online.status === 'offline' && (
          <CandyButton label="Tekrar dene" tone={buttonTones.secondary} onPress={() => void connectOnline()} />
        )}
      </View>
    );
  } else {
    body = (
      <>
        <Tabs scope={scope} onChange={(s) => { setRows(null); setScope(s); }} />
        {pending && (
          <DText size={13} color={colors.textSecondary} style={styles.center}>
            Bugünkü sonucun oyun bitince gönderilecek.
          </DText>
        )}
        {loading || rows === null ? (
          <ActivityIndicator color={colors.starOn} style={styles.spinner} accessibilityLabel="Yükleniyor" />
        ) : rows.length === 0 ? (
          <DText size={15} color={colors.textSecondary} style={styles.center}>
            {scope === 'all' ? 'Bugün henüz kimse puan göndermedi. İlk sen ol!' : 'Arkadaş ekle, birlikte yarışın.'}
          </DText>
        ) : (
          <View style={styles.list}>
            {rows.map((r) => (
              <Row key={r.userId} row={r} me={r.userId === online.profile?.id} />
            ))}
          </View>
        )}

        {online.profile && (
          <View style={styles.profile}>
            <Field label="Takma ad (isteğe bağlı)" value={nick} onChange={setNick} placeholder="Takma adın"
              maxLength={16} autoCapitalize="words" actionLabel="Kaydet" onAction={onSaveNick} message={nickMsg} />
            <View style={styles.field}>
              <DText variant="label" size={12}>Arkadaş kodun</DText>
              <View style={styles.fieldRow}>
                <DText variant="display" size={28} selectable style={styles.code}>{online.profile.friendCode}</DText>
                <CandyButton label="Paylaş" tone={buttonTones.daily} height={48} fontSize={18} style={styles.fieldBtn}
                  onPress={() => void Share.share({ message: `Devre'de arkadaş kodum: ${online.profile!.friendCode}` })} />
              </View>
            </View>
            <Field label="Arkadaş ekle" value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="KOD"
              maxLength={6} autoCapitalize="characters" actionLabel="Ekle" onAction={onAddFriend} message={codeMsg} />
          </View>
        )}
      </>
    );
  }

  return (
    <NightBackground still={still}>
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.header}>
          <RoundIconButton icon="back" tone={buttonTones.icon} label="Geri" size={48} onPress={onBack} />
          <View style={styles.title}>
            <DText variant="display" size={24}>Sıralama</DText>
            <DText size={13} color={colors.textSecondary}>Günün Tahtası · {formatDateTr(today)}</DText>
          </View>
          <View style={{ width: 48 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      </View>
    </NightBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: screenPadding.game, gap: 12 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { alignItems: 'center' },
  content: { gap: 14, paddingBottom: 24 },
  center: { textAlign: 'center' },
  notice: { alignItems: 'center', gap: 10, paddingVertical: 32, paddingHorizontal: 16 },
  spinner: { marginVertical: 24 },
  tabs: { flexDirection: 'row', backgroundColor: colors.emptyCell, borderRadius: 24, padding: 4, gap: 4 },
  tab: { flex: 1, height: 44, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: tones.yellow.base, boxShadow: `0 3px 0 ${tones.yellow.edge}` },
  list: { gap: 8 },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.panelBorder,
  },
  rowMe: { borderColor: colors.starOn, borderWidth: 3 },
  rank: { width: 32, alignItems: 'center', justifyContent: 'center' },
  rankOnStar: { position: 'absolute' },
  name: { flex: 1 },
  scoreCol: { alignItems: 'flex-end' },
  profile: { gap: 14, marginTop: 8, padding: 16, borderRadius: 20, backgroundColor: colors.panel, borderWidth: 3, borderColor: colors.panelBorder },
  field: { gap: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldBtn: { width: 96 },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.emptyCell,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 17,
    borderWidth: 2,
    borderColor: colors.panelBorder,
  },
  code: { flex: 1, letterSpacing: 4 },
});
