// Günün Tahtası puan gönderimi (DEVRE_TASKS 5.4): hile önleme.
// İstemci yalnızca hamle listesini gönderir; puan sunucuda aynı tohumla oyun baştan oynatılarak
// hesaplanır. Oyun modülü src/online/verify.ts'den paketlenir: npm run build:functions
//
// İstek:  POST { date: "2026-11-12", moves: [{ i, r, c }, ...] }   (Authorization: oturum anahtarı)
// Yanıt:  200 { score, circuits, longest, rank, total }   ·   409 zaten gönderilmiş   ·   422 geçersiz hamleler

import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { isPlayableDate, replayDaily } from '../_shared/verify.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Kim gönderiyor: istemcinin oturum anahtarıyla doğrulanır.
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: auth } = await userClient.auth.getUser();
  const user = auth?.user;
  if (!user) return json(401, { error: 'not-authenticated' });

  let body: { date?: unknown; moves?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'bad-json' });
  }
  const date = typeof body.date === 'string' ? body.date : '';
  if (!isPlayableDate(date, new Date())) return json(400, { error: 'bad-date' });

  // Puanı sunucu hesaplar; istemcinin söylediği puana bakılmaz.
  const result = replayDaily(date, Array.isArray(body.moves) ? body.moves : []);
  if (!result.ok) return json(422, { error: result.reason, at: result.at ?? null });

  const admin = createClient(url, serviceKey);
  const { error } = await admin.from('daily_scores').insert({
    user_id: user.id,
    date,
    score: result.score,
    longest_circuit: result.longest,
    circuits: result.circuits,
    moves: body.moves,
  });
  if (error) {
    // Günde tek deneme: aynı gün ikinci gönderim.
    if (error.code === '23505') return json(409, { error: 'already-submitted' });
    return json(500, { error: 'db-error' });
  }

  const { data: rank } = await userClient.rpc('my_daily_rank', { day: date });
  const row = Array.isArray(rank) ? rank[0] : null;
  return json(200, {
    score: result.score,
    circuits: result.circuits,
    longest: result.longest,
    rank: row?.rank ?? null,
    total: row?.total ?? null,
  });
});
