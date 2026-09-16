const { Client, GatewayIntentBits } = require('discord.js');
// 作成した lawSearch.js を読み込む
const { getArticleText } = require('./lawSearch.js'); 

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // 「/六法 民法 1」、「/六法 憲法 9条」という入力をパース化
    if (message.content.startsWith('!六法')) {
        const args = message.content.split(/\s+/); // 空白で区切る
        if (args.length < 3) {
            return message.channel.send('💡 【使用方法】 `/六法 [法律名] [条数]` \n例: `!六法 民法 1` / `/六法 憲法 9` ');
        }

        const lawName = args[1]; // 「民法」など
        const articleNum = args[2]; // 「1」や「1条」など

        try {
            const waitingMessage = await message.channel.send('⏳ e-Gov法令データベースを検索中...');
            
            // 法令txt取得
            const lawText = await getArticleText(lawName, articleNum);
            
            // Disc2,000文字制限対策（超過時、分割送信）
            if (lawText.length > 2000) {
                // 安全分割送信ロジック
                for (let i = 0; i < lawText.length; i += 1900) {
                    await message.channel.send(lawText.substring(i, i + 1900));
                }
            } else {
                await message.channel.send(lawText);
            }
            
            // 待機メッセージ消去
            await waitingMessage.delete().catch(() => {});

        } catch (error) {
            console.error(error);
            // エラー文をそのままDiscに通知
            await message.channel.send(error.message || '❌ 条文の取得中、予期せぬエラーが発生しました。');
        }
    }
});

client.login('DISC_BOT_TOKEN');
