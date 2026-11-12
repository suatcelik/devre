// Supabase bağlantısı (DEVRE_TASKS 5.1–5.3). Yapılandırma yoksa ya da ağ yoksa her çağrı
// sessizce "çevrimdışı" sonucuna düşer; oyun bundan hiç etkilenmez (5.5).
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

import type { DailyResult } from '../daily/daily';
import { SubmitOutcome, classifyStatus } from './sync';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** .env içinde Supabase bilgileri girilmiş mi */
export const onlineConfigured = /^https:\/\/.+/.test(URL) && ANON_KEY.length > 20;

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient | null {
  if (!onlineConfigured) return null;
  client ??= createClient(URL, ANON_KEY, {
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  });
  return client;
}

export interface Profile {
  id: string;
  nickname: string | null;
  friendCode: string;
}

/** Oturum yoksa anonim giriş yapar (5.1); profili döndürür. Çevrimdışıysa null. */
export async function connect(): Promise<Profile | null> {
  const sb = supabase();
  if (!sb) return null;
  try {
    let { data } = await sb.auth.getSession();
    if (!data.session) {
      const res = await sb.auth.signInAnonymously();
      if (res.error) return null;
      data = { session: res.data.session };
    }
    const uid = data.session?.user.id;
    if (!uid) return null;
    const { data: row, error } = await sb.from('profiles').select('id, nickname, friend_code').eq('id', uid).single();
    if (error || !row) return null;
    return { id: row.id, nickname: row.nickname, friendCode: row.friend_code };
  } catch {
    return null;
  }
}

/** Takma ad 2–16 karakter; boş bırakılırsa silinir. */
export function cleanNickname(raw: string): string | null | undefined {
  const name = raw.replace(/\s+/g, ' ').trim();
  if (!name) return null;
  if (name.length < 2 || name.length > 16) return undefined;
  return name;
}

export async function setNickname(id: string, nickname: string | null): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  const { error } = await sb.from('profiles').update({ nickname }).eq('id', id);
  return !error;
}

export type AddFriendResult = 'ok' | 'not-found' | 'self' | 'offline';

export async function addFriend(code: string): Promise<AddFriendResult> {
  const sb = supabase();
  if (!sb) return 'offline';
  const { error } = await sb.rpc('add_friend', { code: code.trim().toUpperCase() });
  if (!error) return 'ok';
  if (error.message.includes('friend-not-found')) return 'not-found';
  if (error.message.includes('friend-self')) return 'self';
  return 'offline';
}

/** Günün Tahtası sonucunu gönderir: yalnız hamleler gider, puanı sunucu hesaplar (5.4). */
export async function submitDaily(result: DailyResult): Promise<SubmitOutcome> {
  const sb = supabase();
  if (!sb || !result.moves) return 'retry';
  try {
    const { error } = await sb.functions.invoke('submit-daily', { body: { date: result.date, moves: result.moves } });
    if (!error) return 'ok';
    const status = (error as { context?: { status?: number } }).context?.status ?? null;
    return classifyStatus(status);
  } catch {
    return 'retry';
  }
}

export interface LeaderRow {
  rank: number;
  userId: string;
  name: string;
  score: number;
  longest: number;
}

const toRows = (data: unknown): LeaderRow[] =>
  (Array.isArray(data) ? data : []).map((r: Record<string, unknown>) => ({
    rank: Number(r.rank),
    userId: String(r.user_id),
    name: (r.nickname as string | null) ?? `Oyuncu ${r.friend_code}`,
    score: Number(r.score),
    longest: Number(r.longest_circuit),
  }));

/** Günün sıralaması (5.3): herkes ya da yalnız arkadaşlar. Çevrimdışıysa null. */
export async function leaderboard(date: string, scope: 'all' | 'friends'): Promise<LeaderRow[] | null> {
  const sb = supabase();
  if (!sb) return null;
  try {
    const { data, error } = scope === 'all'
      ? await sb.rpc('daily_leaderboard', { day: date, max_rows: 50 })
      : await sb.rpc('friends_leaderboard', { day: date });
    return error ? null : toRows(data);
  } catch {
    return null;
  }
}

export async function myRank(date: string): Promise<{ rank: number; total: number } | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('my_daily_rank', { day: date });
  const row = Array.isArray(data) ? data[0] : null;
  return error || !row ? null : { rank: Number(row.rank), total: Number(row.total) };
}
