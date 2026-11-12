// Günlük hatırlatma bildirimleri (yerel; sunucu yok). Expo Go'da da çalışır.
// Plan (plan.ts) her açılışta ve günün tahtası oynandığında yeniden kurulur.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import type { DailyResult } from '../daily/daily';
import { planReminders } from './plan';

const CHANNEL = 'daily';
const ASKED_KEY = 'devre.notifAsked';

let configured = false;

/** Uygulama açıkken gelen bildirim de gösterilsin (kısa, sessiz). */
function configure() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Günlük hatırlatma',
    description: 'Günün Tahtası ve seri hatırlatmaları',
    importance: AndroidImportance.DEFAULT,
    lightColor: '#FFD23F',
  });
}

export async function hasPermission(): Promise<boolean> {
  try {
    const p = await Notifications.getPermissionsAsync();
    return p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL;
  } catch {
    return false;
  }
}

/** İzin ister (sistem penceresi). Kanal önce kurulur (Android 13+). */
export async function requestPermission(): Promise<boolean> {
  try {
    configure();
    await ensureChannel();
    const res = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    await AsyncStorage.setItem(ASKED_KEY, '1');
    return res.granted || res.ios?.status === IosAuthorizationStatus.PROVISIONAL;
  } catch {
    return false;
  }
}

/** İzin bir kez kendiliğinden sorulur (öğreticiden sonra); reddeden oyuncu ayarlardan açabilir. */
export async function askOnce(): Promise<boolean> {
  try {
    if (await hasPermission()) return true;
    if ((await AsyncStorage.getItem(ASKED_KEY)) === '1') return false;
    return await requestPermission();
  } catch {
    return false;
  }
}

/** Bekleyen hatırlatmaları siler; açıksa ve izin varsa önümüzdeki haftayı yeniden planlar. */
export async function rescheduleReminders(
  enabled: boolean,
  history: Record<string, DailyResult>,
  nextLevelId: number,
): Promise<number> {
  try {
    configure();
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled || !(await hasPermission())) return 0;
    await ensureChannel();
    const plan = planReminders(new Date(), history, nextLevelId);
    for (const r of plan) {
      await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body, data: { screen: 'home' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: CHANNEL },
      });
    }
    return plan.length;
  } catch {
    // Bildirim kurulamazsa oyun etkilenmez.
    return 0;
  }
}
