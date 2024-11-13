const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeInMemoryStore, downloadContentFromMessage, jidDecode, downloadMediaMessage, proto, toBuffer, getContentType } = require("@whiskeysockets/baileys");
const fs = require('fs');
const pino = require('pino');
const chalk = require('chalk');
const readline = require("readline");
const PhoneNumber = require('awesome-phonenumber');
const { smsg } = require('./src/serialize')
const { Boom } = require('@hapi/boom');
const usePairingCode = true
const question = (text) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(text, resolve);
    });
};

const machine = new(require('./src/localdb'))('zeeta')
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

async function connectToWhatsApp() {
    global.db = { openai: {}, ...(await machine.fetch() ||{})}
    await machine.save(global.db)
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const client = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: !usePairingCode,
        auth: state,
        browser: ['Windows', 'Chrome', '11'],
    });

    if (usePairingCode && !client.authState.creds.registered) {
        const phoneNumber = await question(chalk.green('\n\n\nMasukan Nomor Bot Dengan Awalan 62\n'));
        const code = await client.requestPairingCode(phoneNumber.trim());
        console.log(chalk.green(`CODE :`), chalk.green(`[ ${code} ]`));
    }
    
    client.getContentType = (content) => {
  if (content) {
    const keys = Object.keys(content);
    const key = keys.find((k) => (k === "conversation" || k.endsWith("Message") || k.endsWith("V2") || k.endsWith("V3")) && k !== "senderKeyDistributionMessage");
    return key;
  }
}

    client.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return decode.user && decode.server && decode.user + '@' + decode.server || jid;
        } else return jid;
    };

    client.ev.on('messages.upsert', async chatUpdate => {
        try {
            let m = chatUpdate.messages[0];
            if (!m.message) return;
            m.message = (Object.keys(m.message)[0] === 'ephemeralMessage') ? m.message.ephemeralMessage.message : m.message;
          if (m.key && m.key.remoteJid === 'status@broadcast') return
         await client.readMessages([m.key]);
            if (!client.public && !m.key.fromMe && chatUpdate.type === 'notify') return;
            if (m.key.id.startsWith('BAE5') && m.key.id.length === 16) return;
            
            m = smsg(client, m, store);

            if (!m.fromMe && !m.isGroup) {
  console.log(
  `\n${chalk.red.bold('[ MSG ]')} ${chalk.hex('#FFA500').bold(new Date().toLocaleString('en-GB').replace(',', ''))} ${chalk.bgBlue.white(m.mtype)} ${chalk.green.bold('from')} [${m.sender}]` +
  `\n` +
  m.text
) }

            require("./message")(client, m, chatUpdate, store);
        } catch (e) { 
            console.error(e)
        }
    })
    
    client.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = client.decodeJid(contact.id);
            if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
        }
    });
    
    client.reply = async(z, D, E, F = {}) => {
        client.sendMessage(z, {
            text: D,
            mentions: client.parseMention(D),
            ...F
        }, {
            quoted: E,
            ephemeralExpiration: process && process.env && process.env.E_MSG ? process.env.E_MSG : 0
        })
       }
    
    client.sendText = (jid, text, quoted = '', options) => client.sendMessage(jid, { text: text, ...options }, { quoted });
    
    client.parseMention = (text) => {
        return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + "@s.whatsapp.net") || [];
      }

    client.getName = (jid, withoutContact = false) => {
        id = client.decodeJid(jid);
        withoutContact = client.withoutContact || withoutContact;
        let v;
        if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
            v = store.contacts[id] || {};
            if (!(v.name || v.subject)) v = client.groupMetadata(id) || {};
            resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'));
        });
        else v = id === '0@s.whatsapp.net' ? { id, name: 'WhatsApp' } : id === client.decodeJid(client.user.id) ? client.user : (store.contacts[id] || {});
        return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international');
    };

    client.downloadMediaMessage = async m => {
    let D = (m.msg || m).mimetype || '';
    
    // Tambahkan pengecekan jika D masih kosong
    if (!D && m.msg && m.msg.message && m.msg.message.documentMessage) {
        D = m.msg.message.documentMessage.mimetype;
    }
     console.log(D)
    let E = m.mtype ? m.mtype.replace(/Message|WithCaption/gi, '') : D.split('/')[0];
    let F = await downloadContentFromMessage(m, E);
    let G = Buffer.from([]);
    for await (let I of F) G = Buffer.concat([G, I]);
    return G;
};

    client.public = true;
    client.ev.on('creds.update', saveCreds);

    // CONNECTION
    client.serializeM = (m) => smsg(client, m, store);
    client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            if (reason === DisconnectReason.badSession || reason === DisconnectReason.connectionClosed || reason === DisconnectReason.connectionLost || reason === DisconnectReason.connectionReplaced || reason === DisconnectReason.restartRequired || reason === DisconnectReason.timedOut) {
                connectToWhatsApp();
            } else if (reason === DisconnectReason.loggedOut) {
                console.log('[Bot] Logged out!');
            } else {
                client.end(`Unknown DisconnectReason: ${reason}|${connection}`);
            }
        } else if (connection === 'open') {
         console.log(`Connected to = ` + JSON.stringify(client.user, null, 2))
        }
    });
    
     setInterval(async () => {
      if (global.db) await machine.save(global.db)
       }, 10000)
       
    return client;
}

connectToWhatsApp();
