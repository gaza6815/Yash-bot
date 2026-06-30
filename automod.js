const db = require("./database");
const { isGroupAdmin, isBotAdmin } = require("./helpers");

const LINK_REGEX = /(https?:\/\/|www\.|chat\.whatsapp\.com)/i;

async function handleAntilink(sock, msg, body) {
  const chatId = msg.key.remoteJid;
  if (!chatId.endsWith("@g.us")) return false;
  const sender = msg.key.participant || msg.key.remoteJid;

  const groupSetting = db.getGroup(chatId);
  if (!groupSetting.antilink) return false;
  if (!LINK_REGEX.test(body)) return false;

  // jangan hapus pesan dari admin
  if (await isGroupAdmin(sock, chatId, sender)) return false;
  if (!(await isBotAdmin(sock, chatId))) return false;

  try {
    await sock.sendMessage(chatId, { delete: msg.key });
    await sock.sendMessage(chatId, {
      text: `🚫 @${sender.split("@")[0]}, link tidak diizinkan di grup ini!`,
      mentions: [sender],
    });
  } catch (err) {
    console.error("Antilink error:", err);
  }
  return true;
}

async function handleGroupParticipantsUpdate(sock, update) {
  const { id: chatId, participants, action } = update;
  const groupSetting = db.getGroup(chatId);
  if (!groupSetting.welcome) return;

  try {
    for (const participant of participants) {
      if (action === "add") {
        const msgText = (groupSetting.welcomeMsg || "Selamat datang @user!").replace(
          "@user",
          `@${participant.split("@")[0]}`
        );
        await sock.sendMessage(chatId, { text: `👋 ${msgText}`, mentions: [participant] });
      } else if (action === "remove") {
        await sock.sendMessage(chatId, {
          text: `👋 Selamat tinggal @${participant.split("@")[0]}, sampai jumpa lagi!`,
          mentions: [participant],
        });
      }
    }
  } catch (err) {
    console.error("Welcome/leave error:", err);
  }
}

module.exports = { handleAntilink, handleGroupParticipantsUpdate };
