const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra'); 
const path = require('path');
const ejs = require('ejs'); // EJSをインポート
const { v4: uuidv4 } = require('uuid'); 
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
    const targetDirectory = req.body.path || '';
    const targetPath = path.join(uploadDir, targetDirectory); 
    cb(null, targetPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // 元のファイル名を使用
  }
});

const upload = multer({ 
  storage: storage,
  // ファイルタイプを制限する fileFilter オプションを追加
  fileFilter: (req, file, cb) => {
    // 許可する MIME タイプ
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];

    // ファイルタイプが許可されている場合は cb(null, true) を呼び出す
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // 許可されていない場合はエラーメッセージを設定して cb(null, false) を呼び出す
      cb(new Error('アップロードできるのは画像ファイルのみです。'), false);
    }
  } 
});

// CORSを許可するミドルウェアを追加
app.use(cors({
  origin: 'http://127.0.0.1:5500', // クライアント側のドメインを指定
  methods: ['GET', 'POST', 'DELETE', 'PUT'], // 許可するHTTPメソッドを指定
  allowedHeaders: ['Content-Type'], // 許可するHTTPヘッダーを指定
}));

// JSON Body Parsing Middlewareを追加
app.use(express.json()); 

// 画像ファイルを公開する
app.use('/uploads', express.static('../images'));

// 静的ファイルを公開する
app.use(express.static(path.join(__dirname, '../client/public'))); // 静的ファイルのルートパスを指定

// EJSの設定
app.set('view engine', 'ejs'); 
app.set('views', path.join(__dirname,'views')); // テンプレートファイルが置かれているディレクトリを指定 (serverディレクトリ内)

// ルートパスに対するリクエストを処理
app.get('/', async (req, res) => {
  try {
    // プロジェクト一覧をサーバーサイドで取得
    const projects = await fs.readdir(path.join(uploadDir, 'projects'), { withFileTypes: true })
      .then(files => files.filter(file => file.isDirectory()).map(file => file.name));

    // index.ejsにプロジェクト一覧を渡してレンダリング
    res.render('index', { projects }); 
  } catch (err) {
    console.error('プロジェクト一覧取得エラー:', err);
    res.status(500).json({ error: 'プロジェクト一覧取得失敗' }); 
  }
});

// ファイルアップロード API
app.post('/upload', upload.array('files', 10), async (req, res) => { 
  try {
    // ディレクトリが存在しない場合は作成
    await fs.ensureDir(path.join(uploadDir, req.body.path));

    // アップロードされたファイルの処理
    const uploadedFiles = await Promise.all(req.files.map(async (file) => {
      // UUID を使用してファイル名を生成
      const fileExtension = path.extname(file.originalname);
      const filename = `${uuidv4()}${fileExtension}`;

      // ファイルを移動
      const destination = path.join(uploadDir, req.body.path, filename);
      await fs.move(file.path, destination);

      return { originalFilename: file.originalname, filename }; // 元のファイル名と新しいファイル名を返す
    }));

    const projectName = req.body.path.split('/')[1]; // project名を取得
    res.json({ message: 'ファイルアップロード成功', filenames: uploadedFiles, projectName }); // projectName をレスポンスに追加
  } catch (err) {
    console.error('ファイルアップロードエラー:', err);
    res.status(500).json({ error: 'ファイルアップロード失敗', details: err.message }); 
  }
});


// ディレクトリ一覧取得 API
app.get('/directory', async (req, res) => {
  const requestedPath = req.query.path;

  // パスチェック
  const directoryPath = requestedPath ? path.join(uploadDir, requestedPath) : uploadDir; 

  // uploadDir から外れたパスが指定されている場合はエラーを返す
  if (!directoryPath.startsWith(uploadDir)) {
    return res.status(400).json({ error: '不正なパスです' }); 
  }

  try {
    const files = await fs.readdir(directoryPath, { withFileTypes: true });

    // ディレクトリ内のファイルとフォルダの一覧を返す
    const directoryContent = files.map(file => ({
      name: file.name,
      isDirectory: file.isDirectory(),
      // uploadsディレクトリを基準とした相対パスを返す
      path: path.relative(uploadDir, path.join(directoryPath, file.name)) 
    }));

    res.json(directoryContent); 
  } catch (err) {
    console.error('ディレクトリ取得エラー:', err);
    res.status(500).json({ error: 'ディレクトリ取得失敗', details: err.message }); 
  }
});

// 画像を移動する API
app.put('/move', async (req, res) => {
  const projectName = req.body.projectName;
  const imageName = req.body.imageName;
  const targetLabel = req.body.targetLabel;
  const sourceLabel = req.body.sourceLabel;

  // パスチェック
  const sourcePath = path.join(uploadDir, 'projects', projectName, sourceLabel, imageName); 
  const targetPath = path.join(uploadDir, 'projects', projectName, targetLabel, imageName); 

  // uploadDir から外れたパスが指定されている場合はエラーを返す
  if (!sourcePath.startsWith(uploadDir) || !targetPath.startsWith(uploadDir)) {
    return res.status(400).json({ error: '不正なパスです' }); 
  }

  try {
    // sourcePath のファイルが存在するかチェック
    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ error: '画像が見つかりません' });
    }

    // targetPath のフォルダが存在するかチェック
    if (!fs.existsSync(path.dirname(targetPath))) {
      await fs.mkdir(path.dirname(targetPath));
    }

    // 画像を移動
    await fs.move(sourcePath, targetPath);

    res.json({ message: '画像が移動されました' });
  } catch (err) {
    console.error('画像移動エラー:', err);
    res.status(500).json({ error: '画像の移動に失敗しました', details: err.message }); 
  }
});


// ファイル削除 API
app.delete('/delete', async (req, res) => {
  const projectName = req.body.projectName;
  const imageName = req.body.imageName;
  const labelName = req.body.labelName; 
  
  // パスチェック
  const filePath = path.join(uploadDir, 'projects', projectName, labelName, imageName); 

  // uploadDir から外れたパスが指定されている場合はエラーを返す
  if (!filePath.startsWith(uploadDir)) {
    return res.status(400).json({ error: '不正なパスです' }); 
  }

  try {
    // ファイルが存在するかチェック
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'ファイルが見つかりません' });
    }

    // ファイルを削除
    await fs.unlink(filePath);

    res.json({ message: 'ファイル削除成功' });
  } catch (err) {
    console.error('ファイル削除エラー:', err);
    res.status(500).json({ error: 'ファイル削除失敗', details: err.message }); 
  }
});




// 画像を取得するAPIエンドポイント
app.get('/images', async (req, res) => {
  const imagePath = req.query.path ? path.join(uploadDir, req.query.path) : null;
  if (imagePath) {
    try {
      const imageData = await fs.readFile(imagePath);
      res.setHeader('Content-Type', 'image/jpeg'); // ファイルタイプに応じて適切なMIMEタイプを設定
      res.send(imageData);
    } catch (err) {
      console.error('画像取得エラー:', err);
      res.status(500).json({ error: '画像取得失敗' }); 
    }
  } else {
    res.status(404).send('画像が見つかりません');
  }
});


// 各プロジェクトページへのルーティング
app.get('/project/:projectName', async (req, res) => {
  const projectName = req.params.projectName;

  // プロジェクトの存在チェック
  const projectDir = path.join(uploadDir, 'projects', projectName);
  if (!fs.existsSync(projectDir)) {
    return res.status(404).json({ error: 'プロジェクトが見つかりません' }); 
  }

  try {
    // プロジェクトフォルダのラベル情報を取得
    const labelList = await getLabelsForProject(projectName); // ラベル情報を取得する関数
    // プロジェクトフォルダの画像情報を取得
    const imageList = await getImagesForProject(projectName); // 画像情報を取得する関数

    // project.ejs にプロジェクト情報を渡してレンダリング
    res.render('project', { projectName, labels: labelList, images: imageList }); 
  } catch (err) {
    console.error('プロジェクト情報取得エラー:', err);
    res.status(500).json({ error: 'プロジェクト情報取得失敗', details: err.message }); 
  }
});

// 新しいプロジェクトを作成する API
app.post('/project/create', async (req, res) => {
  const projectName = req.body.projectName;

  const projectDir = path.join(uploadDir, 'projects', projectName);

  try {
    await fs.mkdir(projectDir);
    res.json({ message: 'プロジェクトが作成されました' });
  } catch (err) {
    console.error('プロジェクト作成エラー:', err);
    res.status(500).json({ error: 'プロジェクトの作成に失敗しました' });
  }
});


// 新しいラベルを作成する API
app.post('/label/create', async (req, res) => {
  const projectName = req.body.projectName;
  const labelName = req.body.labelName;

  // パスチェック
  const labelDir = path.join(uploadDir, 'projects', projectName, labelName);

  // uploadDir から外れたパスが指定されている場合はエラーを返す
  if (!labelDir.startsWith(uploadDir)) {
    return res.status(400).json({ error: '不正なパスです' }); 
  }

  try {
    // ラベル名が既に存在する場合はエラーを返す
    if (fs.existsSync(labelDir)) {
      return res.status(400).json({ error: 'ラベル名が既に存在します' });
    }

    // ラベルフォルダを作成
    await fs.mkdir(labelDir);

    res.json({ message: 'ラベルが作成されました' });
  } catch (err) {
    console.error('ラベル作成エラー:', err);
    res.status(500).json({ error: 'ラベルの作成に失敗しました', details: err.message }); 
  }
});




// ラベルを削除する API
app.delete('/label/delete', async (req, res) => {
  const projectName = req.body.projectName;
  const labelName = req.body.labelName;

  // パスチェック
  const labelDir = path.join(uploadDir, 'projects', projectName, labelName);

  // uploadDir から外れたパスが指定されている場合はエラーを返す
  if (!labelDir.startsWith(uploadDir)) {
    return res.status(400).json({ error: '不正なパスです' }); 
  }

  try {
    // フォルダが存在するかチェック
    if (!fs.existsSync(labelDir)) {
      return res.status(404).json({ error: 'ラベルが見つかりません' });
    }

    // ラベルフォルダを削除
    await fs.rm(labelDir, { recursive: true });

    res.json({ message: 'ラベルが削除されました' });
  } catch (err) {
    console.error('ラベル削除エラー:', err);
    res.status(500).json({ error: 'ラベルの削除に失敗しました', details: err.message }); 
  }
});

// ラベル情報を取得する関数
async function getLabelsForProject(projectName) {
  const projectDir = path.join(uploadDir, 'projects', projectName);

  try {
    const files = await fs.readdir(projectDir, { withFileTypes: true });
    const labels = files.filter(file => file.isDirectory()).map(file => ({
      name: file.name,
      // ここではラベルIDは仮で生成
      id: file.name,
      // ラベルごとの画像数をカウント
      count: fs.readdirSync(path.join(projectDir, file.name)).filter(f => !fs.lstatSync(path.join(projectDir, file.name, f)).isDirectory()).length 
    }));
    return labels;
  } catch (err) {
    console.error('ラベル情報取得エラー:', err);
    throw err; 
  }
}

// 画像情報を取得する関数
async function getImagesForProject(projectName) {
  const projectDir = path.join(uploadDir, 'projects', projectName);

  // フォルダの存在チェック
  if (!fs.existsSync(projectDir)) {
    return []; // フォルダが存在しない場合は空の配列を返す
  }

  try {
    // `flatMap` を使用して、画像情報を取得
    const images = await fs.readdir(projectDir)
      .then(labels => labels.filter(label => fs.lstatSync(path.join(projectDir, label)).isDirectory()))
      .then(labels => labels.flatMap(label => {
        const labelDir = path.join(projectDir, label);
        return fs.readdirSync(labelDir).map(file => ({ name: file, label: label }));
      }));

    return images;
  } catch (err) {
    console.error('画像情報取得エラー:', err);
    throw err; 
  }
}

app.listen(port, () => {
  console.log(`サーバーが起動しました: http://localhost:${port}`);
});
