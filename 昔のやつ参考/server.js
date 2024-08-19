const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra'); // fs-extraをインポート
const path = require('path');
const { randomBytes } = require('crypto'); // ランダムな数字生成用

const app = express();
const port = 3000;

const uploadDir = path.join(__dirname, '../images');

// uploadsディレクトリがなければ作成する
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}



// ファイルアップロード設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const targetDirectory = req.body.path || ''; // リクエストボディからパスを取得
    const targetPath = path.join(uploadDir, targetDirectory); // ファイルの保存パスを生成
    cb(null, targetPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now(); // 現在の日付と時刻を取得
    const randomNum = randomBytes(4).toString('hex'); // ランダムな16進数の数字を生成
    const uniqueFilename = `image_${timestamp}_${randomNum}${path.extname(file.originalname)}`; 
    cb(null, uniqueFilename); 
  }
});
const upload = multer({ storage });

// CORSを許可するミドルウェアを追加
app.use(cors({
  origin: 'http://127.0.0.1:5500', // クライアント側のドメインを指定
  methods: ['GET', 'POST', 'DELETE', 'PUT'], // 許可するHTTPメソッドを指定
  allowedHeaders: ['Content-Type'], // 許可するHTTPヘッダーを指定
}));

// JSON Body Parsing Middlewareを追加
app.use(express.json()); // 最大リクエストサイズを 50MB に設定
app.use('/uploads', express.static('../images'));

// ルートパスに対するリクエストを処理
app.get('/', (req, res) => {
  res.send('ファイル管理システムのサーバーが起動しています');
});

// ファイルアップロード API
app.post('/upload', upload.array('files', 10), async (req, res) => { // upload.single を upload.array に変更
  console.log('req.body.path:', req.body.path);
  console.log('req.files:', req.files); // アップロードされたファイルの配列

  try {
    // ディレクトリが存在しない場合は作成
    await fs.ensureDir(path.join(uploadDir, req.body.path));

    // 各ファイルを指定されたパスに移動
    for (const file of req.files) {
      const destination = path.join(uploadDir, req.body.path, file.filename);
      
      await fs.move(file.path, destination);
    }

    const projectName = req.body.path.split('/')[1]; // project名を取得
    res.json({ message: 'ファイルアップロード成功', filenames: req.files.map(file => file.filename), projectName }); // projectName をレスポンスに追加
  } catch (err) {
    console.error('ファイルアップロードエラー:', err);
    res.status(500).json({ error: 'ファイルアップロード失敗' });
  }
});

// ディレクトリ一覧取得 API
app.get('/directory', async (req, res) => {
  const directoryPath = req.query.path ? path.join(uploadDir, req.query.path) : uploadDir; // クエリパラメータからパスを取得

  try {
    const files = await fs.readdir(directoryPath, { withFileTypes: true });
    const directoryContent = files.map(file => ({
      name: file.name,
      isDirectory: file.isDirectory(),
      path: path.relative(uploadDir, path.join(directoryPath, file.name)) // 相対パスを生成
    }));
    res.json(directoryContent); 
  } catch (err) {
    console.error('ディレクトリ取得エラー:', err);
    res.status(500).json({ error: 'ディレクトリ取得失敗' }); 
  }
});

// ファイル移動 API
app.put('/move', async (req, res) => {
  const sourcePath = path.join(uploadDir, req.body.sourcePath);
  const targetPath = path.join(uploadDir, req.body.targetPath, req.body.fileName);
  console.log('sourcePath:',sourcePath);
  console.log('targetPath:',targetPath);
  try {
    await fs.move(sourcePath, targetPath);
    res.json({ message: 'ファイル移動成功' });
  } catch (err) {
    console.error('ファイル移動エラー:', err);
    res.status(500).json({ error: 'ファイル移動失敗' }); 
  }
});

// ディレクトリ作成 API
app.post('/mkdir', async (req, res) => {
  const directoryPath = path.join(uploadDir, req.body.path, req.body.name);

  try {
    await fs.mkdir(directoryPath, { recursive: true });
    res.json({ message: 'ディレクトリ作成成功' });
  } catch (err) {
    console.error('ディレクトリ作成エラー:', err);
    res.status(500).json({ error: 'ディレクトリ作成失敗' }); 
  }
});

// ディレクトリ削除 API
app.delete('/rmdir', async (req, res) => {
  const directoryPath = path.join(uploadDir, req.body.path);

  try {
    await fs.rm(directoryPath, { recursive: true });
    res.json({ message: 'ディレクトリ削除成功' });
  } catch (err) {
    console.error('ディレクトリ削除エラー:', err);
    res.status(500).json({ error: 'ディレクトリ削除失敗' }); 
  }
});

// ファイル削除 API
app.delete('/delete', async (req, res) => {
  const filePath = path.join(uploadDir, req.body.path); 

  try {
    await fs.unlink(filePath);
    res.json({ message: 'ファイル削除成功' });
  } catch (err) {
    console.error('ファイル削除エラー:', err);
    res.status(500).json({ error: 'ファイル削除失敗' }); 
  }
});

// ディレクトリリネーム API
app.put('/rename', async (req, res) => {
  const oldDirectoryPath = path.join(uploadDir, req.body.oldPath);
  const newDirectoryPath = path.join(uploadDir, req.body.newPath);
  
  console.log('oldDirectorypath:',oldDirectoryPath);
  console.log('newDirectorypath:',newDirectoryPath);
  try {
    await fs.rename(oldDirectoryPath, newDirectoryPath);
    res.json({ message: 'ディレクトリリネーム成功' });
  } catch (err) {
    console.error('ディレクトリリネームエラー:', err);
    res.status(500).json({ error: 'ディレクトリリネーム失敗' }); 
  }
});



app.listen(port, () => {
  console.log(`サーバーが起動しました: http://localhost:${port}`);
});