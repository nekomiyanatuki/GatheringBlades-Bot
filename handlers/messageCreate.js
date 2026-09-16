const fs = require('fs');
const path = require('path');
const express = require('express');
const { ndnDice } = require('../commands/utils/dice.js');
const japaneseHolidays = require('japanese-holidays');

// 1. 完全一致・部分一致・正規表現対応の返信パターンを配列で管理
const greetingWords = [
  { regex: /おはよう|おはよ/, type: 'morning' },
  { regex: /こんにちは|こんにちわ|こんちゃ/, type: 'afternoon' },
  { regex: /こんばんは|こんばんわ|こんこん/, type: 'evening' },
  { regex: /おやすみ|おやす/, type: 'night' },
];

function getTimeZone() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 24) return 'evening';
  return 'night';
}

function isHoliday(date = new Date()) {
  const day = date.getDay();
  if (day === 0 || day === 6) return true;
  // 祝日判定
  if (japaneseHolidays.isHoliday(date)) return true;
  return false;
}

function getGreetingReply(wordType, nowType) {
  const greetings = {
    morning: 'おはよ～！',
    afternoon: 'こんにちは～',
    evening: 'こんばんわ～',
    night: 'おやすみ～！',
  };
  const hour = new Date().getHours();
  const isHolidayNow = isHoliday();

  // 早起き判定（朝5時未満に「おはよう」系）
  if (wordType === 'morning' && hour < 5) {
    return '早起きだね～';
  }

  // 深夜判定（0～5時に「おやすみ」以外のあいさつ）
  if (hour >= 0 && hour < 5) {
    if (wordType !== 'night') {
      if (isHolidayNow) {
        return '今日は(多分)休みだね！';
      } else {
        return 'こんな時間まで起きてて大丈夫？早く寝ないと起きれなくなっちゃうよ？';
      }
    }
  }

  // 通常のあいさつ
  if (wordType === nowType) {
    return greetings[nowType];
  }
  // 時間帯とワードが異なる場合の特別な返し
  return `今は${{
    morning: '朝',
    afternoon: '昼',
    evening: '夜',
    night: '深夜'
  }[nowType]}だけど…${greetings[nowType]}`;
}

  // あいさつ系（送信ワード＋時間帯で最適化）
  {
    type: 'greeting',
    pattern: greetingWords,
    reply: (msg) => {
      const nowType = getTimeZone();
      for (const g of greetingWords) {
        if (g.regex.test(msg.content)) {
          return msg.reply(getGreetingReply(g.type, nowType));
        }
      }
    }
  },
  // ネタ系
  { type: 'regex', pattern: /lol|草/, reply: 'lol|くさ|草|くっさぁ' },
  { type: 'regex', pattern: /ざ～こ|雑魚|クソザコ|ざこざこ/, reply: 'ざっこぉ' },
  { type: 'regex', pattern: /にゃん|にゃーん|にゃ～ん/, reply: 'にゃ...にゃ～ん' },
  { type: 'regex', pattern: /ねー|ね～/, reply: 'ね～' },
  { type: 'regex', pattern: /なんと!?|にゃんと!?|なんだって!?|にゃんだって!?/, reply: 'なんと!?'|にゃんと!?'|なんだって!?'|にゃんだって!?'},
  // ぬるぽ
  { type: 'regex', pattern: /ぬるぽ/, reply: `\
（・∀・）　　　|　|　ｶﾞｯ\nと　　　　）　　 |　|\n　Ｙ　/ ノ　　 人\n　 /　）　　 〈　〉__Λ∩\n＿/し'　／／.　Ｖ｀Д´）/ ←>>1\n（＿フ彡　　　　　 　　/\n` },
  // ダイス
  { type: 'regex', pattern: /^\d+d\d+$/, reply: (msg) => msg.reply(ndnDice(msg.content)) },
  };

module.exports = async (message) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] [messageCreate] start: ${message.content}`);
  if (message.author.bot) return;

  for (const pat of replyPatterns) {
    const beforePattern = Date.now();
    // パターンマッチ前
    if (pat.type === 'greeting') {
      for (const g of pat.pattern) {
        if (g.regex.test(message.content)) {
          console.log(`[${new Date().toISOString()}] [messageCreate] pattern matched: greeting (${g.type})`);
          const beforeReply = Date.now();
          await pat.reply(message);
          const afterReply = Date.now();
          console.log(`[${new Date().toISOString()}] [messageCreate] reply sent (greeting) in ${afterReply - beforeReply}ms`);
          console.log(`[${new Date().toISOString()}] [messageCreate] total time: ${afterReply - start}ms`);
          return;
        }
      }
      continue;
    }
    if (pat.type === 'exact' && message.content === pat.pattern) {
      console.log(`[${new Date().toISOString()}] [messageCreate] pattern matched: exact (${pat.pattern})`);
      const beforeReply = Date.now();
      if (typeof pat.reply === 'function') {
        await pat.reply(message);
      } else {
        await message.reply(pat.reply);
      }
      const afterReply = Date.now();
      console.log(`[${new Date().toISOString()}] [messageCreate] reply sent (exact) in ${afterReply - beforeReply}ms`);
      console.log(`[${new Date().toISOString()}] [messageCreate] total time: ${afterReply - start}ms`);
      return;
    }
    if (pat.type === 'includes' && message.content.includes(pat.pattern)) {
      console.log(`[${new Date().toISOString()}] [messageCreate] pattern matched: includes (${pat.pattern})`);
      const beforeReply = Date.now();
      if (typeof pat.reply === 'function') {
        await pat.reply(message);
      } else {
        await message.reply(pat.reply);
      }
      const afterReply = Date.now();
      console.log(`[${new Date().toISOString()}] [messageCreate] reply sent (includes) in ${afterReply - beforeReply}ms`);
      console.log(`[${new Date().toISOString()}] [messageCreate] total time: ${afterReply - start}ms`);
      return;
    }
    if (pat.type === 'regex' && pat.pattern.test(message.content)) {
      console.log(`[${new Date().toISOString()}] [messageCreate] pattern matched: regex (${pat.pattern})`);
      const beforeReply = Date.now();
      if (typeof pat.reply === 'function') {
        await pat.reply(message);
      } else {
        await message.reply(pat.reply);
      }
      const afterReply = Date.now();
      console.log(`[${new Date().toISOString()}] [messageCreate] reply sent (regex) in ${afterReply - beforeReply}ms`);
      console.log(`[${new Date().toISOString()}] [messageCreate] total time: ${afterReply - start}ms`);
      return;
    }
  }
}; 