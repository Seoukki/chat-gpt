const fs = require('fs')
const fetch = require('node-fetch')
const morphic = new (require('./src/ai'))()
const { geminiAllInOne } = require('./src/gemini')
const translate = require('translate-google-api')
const chalk = require('chalk')
const axios = require('axios')
const FormData = require('form-data')
const cheerio = require('cheerio')

module.exports = client = async (client, m, chatUpdate, store) => {
    try {
     let body = (typeof m.text == 'string' ? m.text : '')
        if (m.fromMe) return
        await morphic.login("luthfijoestars@icloud.com", "AmerikaS123@")
        global.db.openai = global.db.openai || {}
        global.db.openai[m.sender] = global.db.openai[m.sender] || {}
        if (global.db.openai[m.sender].messages?.length >= 100) {
            global.db.openai[m.sender] = {}
        }

      if ((m.isGroup && m.mentionedJid && m.mentionedJid.includes(client.decodeJid(client.user.id))) || (!m.isGroup && body)) {     
       await client.sendMessage(m.chat, { react: { text: '🔍', key: m.key } });        
        await client.sendPresenceUpdate('composing', m.chat)
        body = m.isGroup ? body.replace(new RegExp(`@${client.decodeJid(client.user.id).split('@')[0]}`, 'g'), '').trim() : body
      let q = m.quoted ? m.quoted : m;
let mime = (q.msg || q).mimetype || ''
      if (body.toLowerCase() == 'sc' || body.toLowerCase() == 'script') return m.reply(sc())
         if (mime) {
         const file = await q.download()
         const json = await geminiAllInOne(body, file)
                return client.reply(m.chat, json.replace(/\*\*/g, '*'), m)
            }
        if (/buat foto|buatin foto|buatkan foto|buat gambar|create image|generate image|desain gambar|gambar|draw|create a picture/i.test(body)) {
         const message = global.db.openai[m.sender].messages
            ? await morphic.addInput(body, global.db.openai[m.sender])
            : await morphic.addInput(body, await morphic.chat(fs.readFileSync("./src/prompt.txt", "utf-8")).then(v => v.chat))

        const data = await morphic.chat(message)
        global.db.openai[m.sender] = data.chat
           const input = await translate(body, { to: 'en' })
            const buffer = await FluxImage(input[0], 'Hyper-Surreal Escape')
            return client.sendMessage(m.chat, { image: { url: buffer.image }, caption: '' }, { quoted: m })
        }
        
        if (/puterin|puterin lagu|putarkan|putarkan lagu|play lagu/i.test(body)) {
         const message = global.db.openai[m.sender].messages
            ? await morphic.addInput(body, global.db.openai[m.sender])
            : await morphic.addInput(body, await morphic.chat(fs.readFileSync("./src/prompt.txt", "utf-8")).then(v => v.chat))

        const data = await morphic.chat(message)
        global.db.openai[m.sender] = data.chat
           const input = body
            const i = await fetch(`https://api.nexon.my.id/api/play-audio?q=${body}&apikey=ceyung`)
            const hai = i.json()
            return clips.sendFile(m.chat, i.data.url, i.data.filename, caption, m)
        }

        const message = global.db.openai[m.sender].messages
            ? await morphic.addInput(body, global.db.openai[m.sender])
            : await morphic.addInput(body, await morphic.chat(fs.readFileSync("./src/prompt.txt", "utf-8")).then(v => v.chat))

        const data = await morphic.chat(message)
        global.db.openai[m.sender] = data.chat

        await client.reply(m.chat, data.answer.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\*\*/g, '*').trim(), m, {
            contextInfo: {
                mentionedJid: client.parseMention(data.answer),
                isForwarded: false
            }
          })
        }
    } catch (e) {
        console.error(e)
    }
}

// File Watcher
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
});

const meki = ['Hyper-Surreal Escape', 'Neon Fauvism', 'Post-Analog Glitchscape', 'AI Dystopia', 'Vivid Pop Explosion'];

const FluxImage = async (prompt, style) => {
    if (!meki.includes(style)) {
        throw new Error('Buta huruf kah? Style nya udah dicantumin, masih aja salah input... wohhh lawak lu ang ang ang ang ang 🤣');
    }

    const url = 'https://devrel.app.n8n.cloud/form/flux';

    const formData = new FormData();
    formData.append('field-0', prompt);
    formData.append('field-1', style);

    const headers = {
        'Accept': '*/*',
        'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
        'User-Agent': 'Postify/1.0.0',
        ...formData.getHeaders()
    };

    try {
        const { data } = await axios.post(url, formData, { headers });
        
        const $ = cheerio.load(data);
        return {
            image: $('.image-container img').attr('src'),
            style: style,
        };
    } catch (error) {
        console.error(error);
        throw error;
    }
};

async function createImage(query, ratioIndex = 2) {
  const ratios = ['1:1', '16:9', '2:3', '3:2', '4:5', '5:4', '9:16', '21:9', '9:21'];

  if (ratioIndex < 1 || ratioIndex > ratios.length) {
    console.log('Rasio image tidak valid!');
    return null;
  }

  const config = {
    headers: {
      'accept': '*/*',
      'authority': '1yjs1yldj7.execute-api.us-east-1.amazonaws.com',
      'user-agent': 'Postify/1.0.0'
    }
  };

  try {
    const response = await axios.get(`https://1yjs1yldj7.execute-api.us-east-1.amazonaws.com/default/ai_image?prompt=${encodeURIComponent(query)}&aspect_ratio=${ratios[ratioIndex - 1]}`, config);
    return {
      imageLink: response.data.image_link
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
}

const sc = () => { return `== Script AutoAI ==
Harga: 30.000 IDR

Main feature :

•	Dokumen PDF
•	Video
•	Gambar
•	Audio
•	File JavaScript (JS)
•	HTML
•	Teks (TXT)
•	Python (PY)
•	Dan banyak lagi!
•   Chat sesi

Selain itu, script ini juga dilengkapi dengan fitur chat bersesi, memungkinkan Anda untuk melanjutkan percakapan di titik terakhir tanpa kehilangan konteks.

Untuk pembelian, silakan hubungi:
wa.me/62895402466525?text=buy+sc+autoai`
                                }
