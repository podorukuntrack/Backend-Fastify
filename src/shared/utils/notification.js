import admin from 'firebase-admin';
import { db } from '../../config/database.js';
import { userDevices } from '../schemas/schema.js';
import { eq, inArray } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

let isFirebaseInitialized = false;

export const initializeFirebase = () => {
  if (isFirebaseInitialized) return true;

  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      isFirebaseInitialized = true;
      console.log('🔥 Firebase Admin SDK initialized successfully!');
      return true;
    } else {
      console.warn('⚠️ Warning: service-account.json not found in root directory. Push notifications will be mocked.');
      return false;
    }
  } catch (e) {
    console.error('❌ Failed to initialize Firebase Admin:', e.message);
    return false;
  }
};

export const sendPushNotification = async (userIds, title, body, data = {}) => {
  const ids = Array.isArray(userIds) 
    ? userIds.filter(id => id != null) 
    : [userIds].filter(id => id != null);
    
  if (ids.length === 0) return;

  const initialized = initializeFirebase();

  try {
    // 1. Fetch tokens for these users
    const devices = await db
      .select({ fcmToken: userDevices.fcmToken, userId: userDevices.userId })
      .from(userDevices)
      .where(inArray(userDevices.userId, ids));

    if (devices.length === 0) {
      console.log('ℹ️ No registered FCM tokens found for users:', ids);
      return;
    }

    const tokens = devices.map(d => d.fcmToken);
    
    if (!initialized) {
      console.log(`[MOCK NOTIFICATION] To Users: ${ids.join(', ')} | Title: ${title} | Body: ${body} | Data:`, data);
      return;
    }

    // 2. Prepare message payload
    const message = {
      notification: { 
        title, 
        body
      },
      data: Object.keys(data).reduce((acc, key) => {
        acc[key] = String(data[key]);
        return acc;
      }, {
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      }),
      android: {
        notification: {
          sound: 'notif_podorukun',
          channelId: 'podo_custom_sound_channel'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'notif_podorukun.caf'
          }
        }
      }
    };

    // 3. Send via FCM Multicast
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...message
    });

    console.log(`Successfully sent ${response.successCount} push notifications.`);

    // 4. Clean up invalid/unregistered tokens
    if (response.failureCount > 0) {
      const tokensToRemove = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/invalid-argument' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            tokensToRemove.push(tokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        console.log('Cleaning up invalid FCM tokens:', tokensToRemove);
        await db.delete(userDevices).where(inArray(userDevices.fcmToken, tokensToRemove));
      }
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};