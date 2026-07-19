// Sendet eine Push-Nachricht an eine Liste von User-IDs, unter Beachtung ihrer
// individuellen Benachrichtigungs-Präferenzen (notifPrefs), und räumt dabei
// ungültig gewordene Geräte-Tokens auf.
export async function sendPushToUsers(db, messaging, { userIds, title, body, url, category }) {
  const uniqueIds = [...new Set(userIds)].slice(0, 500);
  console.log('[sendPush] userIds:', uniqueIds, 'category:', category);
  if (uniqueIds.length === 0) return { sent: 0, recipients: 0 };

  const userDocs = await Promise.all(uniqueIds.map(uid => db.collection('users').doc(uid).get()));
  const tokenOwners = [];
  userDocs.forEach(snap => {
    if (!snap.exists) { console.log('[sendPush] user doc missing:', snap.id); return; }
    const data = snap.data();
    const prefs = data.notifPrefs || { training: true, achievements: true, other: true };
    console.log('[sendPush] user', snap.id, 'tokens:', (data.fcmTokens||[]).length, 'prefs:', prefs);
    if (prefs[category] === false) return;
    (data.fcmTokens || []).forEach(token => tokenOwners.push({ uid: snap.id, token }));
  });

  if (tokenOwners.length === 0) { console.log('[sendPush] keine Tokens gefunden'); return { sent: 0, recipients: 0 }; }

  const chunks = [];
  for (let i = 0; i < tokenOwners.length; i += 500) chunks.push(tokenOwners.slice(i, i + 500));

  let sentCount = 0;
  const invalidTokensByUser = {};

  for (const chunk of chunks) {
    const response = await messaging.sendEachForMulticast({
      tokens: chunk.map(t => t.token),
      data: { title, body, url: url || '/', category },
      webpush: { fcmOptions: { link: url || '/' } },
    });
    response.responses.forEach((r, i) => {
      if (r.success) {
        sentCount++;
        console.log('[sendPush] erfolgreich an', chunk[i].uid, r.messageId);
      } else {
        console.log('[sendPush] Fehler bei', chunk[i].uid, r.error?.code, r.error?.message);
        if (['messaging/invalid-registration-token', 'messaging/registration-token-not-registered'].includes(r.error?.code)) {
          const owner = chunk[i];
          (invalidTokensByUser[owner.uid] ||= []).push(owner.token);
        }
      }
    });
  }

  await Promise.all(Object.entries(invalidTokensByUser).map(async ([uid, tokens]) => {
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) return;
    const remaining = (snap.data().fcmTokens || []).filter(t => !tokens.includes(t));
    await db.collection('users').doc(uid).update({ fcmTokens: remaining });
  }));

  return { sent: sentCount, recipients: new Set(tokenOwners.map(t => t.uid)).size };
}
