const { Sequelize } = require('sequelize');
const path = require('path');

// データベースファイルのパスを設定
const dbPath = path.join(__dirname, '..', 'database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false
});

// データベース接続のテスト
sequelize.authenticate()
  .then(() => {
    console.log('✅ データベースに接続しました');
  })
  .catch(err => {
    console.error('❌ データベース接続エラー:', err);
  });

module.exports = sequelize; 