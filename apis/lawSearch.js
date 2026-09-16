// lawSearch.js
const https = require('https');

// 六法(基本法と称する)及び 労基法|道交法|著作権法 等の主要法令を追加した辞書
// ユーザーが略称（例: 労基法|道交法）等で入力してもヒットするよう対応
const LAW_DICTIONARY = {
    // 【基本法及び主要法令】
    '憲法': '321CONSTITUTION',
    '日本国憲法': '321CONSTITUTION',
    '民法': '129AC0000000089',
    '商法': '132AC0000000017',
    '刑法': '140AC0000000045',
    '民事訴訟法': '408AC0000000109',
    '刑事訴訟法': '123AC0000000131',
    '会社法': '417AC0000000086',
    '労働基準法': '322AC0000000049',
    '労基法': '322AC0000000049',
    '労働契約法': '419AC0000000128',
    '男女雇用機会均等法': '347AC0000000092', '均等法': '347AC0000000092',
    '道路交通法': '335AC0000000105',
    '道交法': '335AC0000000105',
    '著作権法': '402AC0000000048',
    '個人情報保護法': '415AC0000000057',
    '特定商取引法': '351AC0000000057', '特商法': '351AC0000000057',
    '消費者契約法': '412AC0000000061'
};

/**
 * e-Gov法令APIからデータ取得をする内部関数
 */
function fetchLawData(lawId) {
    const url = `https://e-gov.go.jp{lawId}?response_format=json`;
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(rawData)); } 
                catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

/**
 * 指定された法令名と条数から、該当する条文のtxtを検索して返す主要関数
 * @param {string} lawInputName - ユーザーが入力した法令名（例: '労基法'）
 * @param {string} articleNum - ユーザーが入力した条数（例: '32'）
 * @returns {Promise<string>} - Discord送信用に成形された条文txt
 */
async function getArticleText(lawInputName, articleNum) {
    // 1. 法律名から法令IDに変換
    const lawId = LAW_DICTIONARY[lawInputName];
    if (!lawId) {
        // 登録されていない法律名が入力された場合、対応リストをエラーとして返します
        const supportedLaws = Object.keys(LAW_DICTIONARY).filter(key => key.length > 2).join('、');
        throw new Error(`❌ 法律「${lawInputName}」は未登録です。\n【対応法令一覧】\n${supportedLaws}`);
    }

    // 数字の漢数字変換ロジック（APIデータ「第一条」等に合わせるため）
    let targetArticle = articleNum.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)); 
    if (!isNaN(targetArticle)) {
        const kanjiNums = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
        let num = parseInt(targetArticle, 10);
        if (num === 1) targetArticle = '第一条';
        else {
            let h = Math.floor(num / 100);
            let t = Math.floor((num % 100) / 10);
            let o = num % 10;
            let k = '第';
            if (h > 0) k += (h === 1 ? '' : kanjiNums[h]) + '百';
            if (t > 0) k += (t === 1 ? '' : kanjiNums[t]) + '十';
            if (o > 0) k += kanjiNums[o];
            targetArticle = k + '条';
        }
    } else {
        if (!targetArticle.startsWith('第')) targetArticle = '第' + targetArticle;
        if (!targetArticle.endsWith('条')) targetArticle = targetArticle + '条';
    }

    // 2. APIから法律データ取得
    const lawData = await fetchLawData(lawId);
    
    // 3. JSONから該当「条」の検索
    const lawBody = lawData.LawInfo.Law.LawBody;
    let foundArticle = null;

    function searchData(obj) {
        if (!obj || foundArticle) return;
        if (obj.ArticleCaption === targetArticle || obj.ArticleTitle === targetArticle) {
            foundArticle = obj;
            return;
        }
        if (Array.isArray(obj)) {
            for (const item of obj) searchData(item);
        } else if (typeof obj === 'object') {
            for (const key in obj) searchData(obj[key]);
        }
    }
    searchData(lawBody);

    if (!foundArticle) {
        throw new Error(`❌ ${lawInputName} の中に「${targetArticle}」は該当しませんでした。`);
    }

    // 4. 該当条文をtxt成形
    let resultText = `📜 **${lawData.LawInfo.LawName}**\n🏛️ **${targetArticle}**\n\n`;

    if (foundArticle.Paragraph) {
        const paragraphs = Array.isArray(foundArticle.Paragraph) ? foundArticle.Paragraph : [foundArticle.Paragraph];
        paragraphs.forEach((p, pIdx) => {
            if (p.ParagraphSentence && p.ParagraphSentence.Sentence) {
                const sentence = p.ParagraphSentence.Sentence._text || p.ParagraphSentence.Sentence;
                resultText += `【第${pIdx + 1}項】 ${typeof sentence === 'object' ? JSON.stringify(sentence) : sentence}\n`;
            }
            if (p.Item) {
                const items = Array.isArray(p.Item) ? p.Item : [p.Item];
                items.forEach(it => {
                    if (it.ItemTitle && it.ItemSentence && it.ItemSentence.Sentence) {
                        const itSentence = it.ItemSentence.Sentence._text || it.ItemSentence.Sentence;
                        resultText += `  └ ${it.ItemTitle}: ${typeof itSentence === 'object' ? JSON.stringify(itSentence) : itSentence}\n`;
                    }
                });
            }
        });
    }

    return resultText;
}

module.exports = { getArticleText };
