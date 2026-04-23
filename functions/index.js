const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { initializeApp }     = require('firebase-admin/app');
const { getFirestore }      = require('firebase-admin/firestore');
const { getMessaging }      = require('firebase-admin/messaging');

initializeApp();

exports.notifyNewMessage = onDocumentUpdated('pairs/{pairId}', async event => {
  const before = event.data.before.data() || {};
  const after  = event.data.after.data()  || {};

  const beforeMsgs = Array.isArray(before['nosso-espaco-msgs-v1']) ? before['nosso-espaco-msgs-v1'] : [];
  const afterMsgs  = Array.isArray(after['nosso-espaco-msgs-v1'])  ? after['nosso-espaco-msgs-v1']  : [];

  if (afterMsgs.length <= beforeMsgs.length) return null;

  const beforeIds = new Set(beforeMsgs.map(m => m.id));
  const newMsgs   = afterMsgs.filter(m => !beforeIds.has(m.id));
  if (!newMsgs.length) return null;

  const lastMsg  = newMsgs[newMsgs.length - 1];
  const pairId   = event.params.pairId;
  const [uid1, uid2] = pairId.split('__');

  const db = getFirestore();
  const [u1, u2] = await Promise.all([
    db.collection('users').doc(uid1).get(),
    db.collection('users').doc(uid2).get()
  ]);

  const user1 = u1.data() || {};
  const user2 = u2.data() || {};

  // Determina o receptor: compara nome do remetente com os nomes salvos
  const senderName = lastMsg.from || '';
  let receiverToken = null;
  if (senderName && user1.name && senderName.toLowerCase() === user1.name.toLowerCase()) {
    receiverToken = user2.fcmToken;
  } else if (senderName && user2.name && senderName.toLowerCase() === user2.name.toLowerCase()) {
    receiverToken = user1.fcmToken;
  } else {
    // Não identificou — envia para os dois
    receiverToken = [user1.fcmToken, user2.fcmToken].filter(Boolean);
  }

  const tokens = Array.isArray(receiverToken) ? receiverToken : (receiverToken ? [receiverToken] : []);
  if (!tokens.length) return null;

  const msgText = lastMsg.type === 'lembrei'
    ? `${senderName} lembrou de você ♡`
    : `${senderName}: ${lastMsg.text || 'Nova mensagem'}`;

  const messaging = getMessaging();
  await Promise.all(tokens.map(token =>
    messaging.send({
      token,
      notification: {
        title: '♡ Nosso Espaço',
        body: msgText.length > 100 ? msgText.slice(0, 97) + '...' : msgText
      },
      webpush: {
        notification: {
          icon: 'https://andersondalo.github.io/nosso-espaco/icon-192.svg',
          badge: 'https://andersondalo.github.io/nosso-espaco/icon-192.svg',
          click_action: 'https://andersondalo.github.io/nosso-espaco/'
        }
      }
    }).catch(e => console.warn('FCM error:', token.slice(0,10), e.code))
  ));

  return null;
});
