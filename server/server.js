const express = require('express');
const cors = require('cors');
const fs = require('fs-extra'); 
const path = require('path');
const ejs = require('ejs'); // EJSをインポート
const { v4: uuidv4 } = require('uuid'); 
const app = express();
const port = 3000;

<<<<<<< HEAD

const http = require('http'); // http モジュールを require
const server = http.createServer(app); // HTTP サーバーを作成
const io = require('socket.io')(server); // Socket.IO を初期化

=======
>>>>>>> 0d4992c85a9d640e26ecf24aa1b8f1aeaf2d62bd
const uploadDir = path.join(__dirname, '../images');

// uploadsディレクトリがなければ作成する
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

io.on('connection', (socket) => {
  console.log('クライアントが接続しました');

  // 画像アップロードイベント
  socket.on('upload', async (data) => {
  const { projectName, labelName, fileData, fileName } = data; 
  const uploadPath = path.join(uploadDir, 'projects', projectName, labelName);

    try {
      // アップロード先ディレクトリが存在しない場合は作成
      await fs.ensureDir(uploadPath);

      // ファイル名を UUID に変更
      const fileExtension = path.extname(fileName); // 拡張子を取得
      const newFileName = `${uuidv4()}${fileExtension}`; 
      // ファイルを保存 (Blob データを直接保存)
      const filePath = path.join(uploadPath, newFileName);
      await fs.writeFile(filePath, fileData); 
      // 成功メッセージをクライアントに送信
      socket.emit('uploadSuccess', { message: 'ファイルアップロード成功', fileName: newFileName });
      }
    catch (err) {
      console.error('ファイルアップロードエラー:', err);
      socket.emit('uploadError', { error: 'ファイルアップロード失敗', details: err.message });
      }
  });
  
  socket.on('uploadComp',() => {
    // 画像データが変更されたことを通知
    io.emit('image-data-changed');
  })


   // 画像移動イベント
   socket.on('moveImage', async (data) => {
    const { projectName, imageName, sourceLabel, targetLabel } = data;

    // パスチェック
    const sourcePath = path.join(uploadDir, 'projects', projectName, sourceLabel, imageName);
    const targetPath = path.join(uploadDir, 'projects', projectName, targetLabel, imageName);

    if (!sourcePath.startsWith(uploadDir) || !targetPath.startsWith(uploadDir)) {
      return socket.emit('moveImageError', { error: '不正なパスです' });
    }

    try {
      // sourcePath のファイルが存在するかチェック
      if (!fs.existsSync(sourcePath)) {
        return socket.emit('moveImageError', { error: '画像が見つかりません' });
      }

      // targetPath のフォルダが存在するかチェック
      if (!fs.existsSync(path.dirname(targetPath))) {
        await fs.mkdir(path.dirname(targetPath));
      }

      // 画像を移動
      await fs.move(sourcePath, targetPath);

      // 成功メッセージをクライアントに送信
      socket.emit('moveImageSuccess', { message: '画像が移動されました' });
    } catch (err) {
      console.error('画像移動エラー:', err);
      socket.emit('moveImageError', { error: '画像の移動に失敗しました', details: err.message });
    }
  });

  // 画像移動完了イベント
  socket.on('moveImageComp', () => {
    // 画像データが変更されたことを通知
    io.emit('image-data-changed'); 
  });

   // 画像削除イベント
   socket.on('deleteImage', async (data) => {
    const { projectName, imageName, labelName } = data;

    // パスチェック
    const filePath = path.join(uploadDir, 'projects', projectName, labelName, imageName);

    if (!filePath.startsWith(uploadDir)) {
      return socket.emit('deleteImageError', { error: '不正なパスです' });
    }

    try {
      // ファイルが存在するかチェック
      if (!fs.existsSync(filePath)) {
        return socket.emit('deleteImageError', { error: 'ファイルが見つかりません' });
      }

      // ファイルを削除
      await fs.unlink(filePath);

      // 成功メッセージをクライアントに送信
      socket.emit('deleteImageSuccess', { message: 'ファイル削除成功' });
    } catch (err) {
      console.error('ファイル削除エラー:', err);
      socket.emit('deleteImageError', { error: 'ファイル削除失敗', details: err.message });
    }
  });

  // 画像削除完了イベント
  socket.on('deleteImageComp', () => {
    // 画像データが変更されたことを通知
    io.emit('image-data-changed'); 
  });

  // プロジェクト作成イベント
  socket.on('createProject', async (projectName) => {
    const projectDir = path.join(uploadDir, 'projects', projectName);

    try {
      await fs.mkdir(projectDir);
      socket.emit('createProjectSuccess', { message: 'プロジェクトが作成されました' });
      // プロジェクトデータ変更イベント
      io.emit('project-data-changed'); // クライアントにプロジェクトデータ変更イベントを送信
    } catch (err) {
      console.error('プロジェクト作成エラー:', err);
      socket.emit('createProjectError', { error: 'プロジェクトの作成に失敗しました', details: err.message });
    }
  });

  

  // ラベル作成イベント
  socket.on('createLabel', async (data) => {
    const { projectName, labelName } = data;

    // パスチェック
    const labelDir = path.join(uploadDir, 'projects', projectName, labelName);

    if (!labelDir.startsWith(uploadDir)) {
      return socket.emit('createLabelError', { error: '不正なパスです' });
    }

    try {
      // ラベル名が既に存在する場合はエラーを返す
      if (fs.existsSync(labelDir)) {
        return socket.emit('createLabelError', { error: 'ラベル名が既に存在します' });
      }

      // ラベルフォルダを作成
      await fs.mkdir(labelDir);

      // 成功メッセージをクライアントに送信
      socket.emit('createLabelSuccess', { message: 'ラベルが作成されました' });

      // 画像データが変更されたことを通知
      io.emit('image-data-changed');
    } catch (err) {
      console.error('ラベル作成エラー:', err);
      socket.emit('createLabelError', { error: 'ラベルの作成に失敗しました', details: err.message });
    }
  });

  // ラベル削除イベント
  socket.on('deleteLabel', async (data) => {
    const { projectName, labelName } = data;

    // パスチェック
    const labelDir = path.join(uploadDir, 'projects', projectName, labelName);

    if (!labelDir.startsWith(uploadDir)) {
      return socket.emit('deleteLabelError', { error: '不正なパスです' });
    }

    try {
      // フォルダが存在するかチェック
      if (!fs.existsSync(labelDir)) {
        return socket.emit('deleteLabelError', { error: 'ラベルが見つかりません' });
      }

      // ラベルフォルダを削除
      await fs.rm(labelDir, { recursive: true });

      // 成功メッセージをクライアントに送信
      socket.emit('deleteLabelSuccess', { message: 'ラベルが削除されました' });

      // 画像データが変更されたことを通知
      io.emit('image-data-changed');
    } catch (err) {
      console.error('ラベル削除エラー:', err);
      socket.emit('deleteLabelError', { error: 'ラベルの削除に失敗しました', details: err.message });
    }
  });

   // フォルダアップロードイベント
   socket.on('uploadFolder', async (data) => {
    const { projectName, originalFolderName, files } = data;
    let folderName = originalFolderName;
    let counter = 1;
    let uploadPath = path.join(uploadDir, 'verification', projectName, folderName);

    try {
      // アップロード先ディレクトリが存在する場合は、連番を付与してフォルダ名を作成
      while (fs.existsSync(uploadPath)) {
        folderName = `${originalFolderName}-${counter}`;
        uploadPath = path.join(uploadDir, 'verification', projectName, folderName);
        counter++;
      }

      // アップロード先ディレクトリを作成
      await fs.ensureDir(uploadPath);

      // 各ファイルを移動
      await Promise.all(
        files.map(async (file) => {
          const fileData = Buffer.from(new Uint8Array(file.fileData)); // ArrayBuffer から Buffer に変換
          const destination = path.join(uploadPath, file.fileName);
          await fs.writeFile(destination, fileData); // Blob データを直接保存
        })
      );

      // 成功メッセージをクライアントに送信
      socket.emit('uploadFolderSuccess', { message: 'フォルダのアップロードに成功しました。', folderName: folderName });
    } catch (err) {
      console.error('ファイルアップロードエラー:', err);
      socket.emit('uploadFolderError', { error: 'フォルダのアップロードに失敗しました。', details: err.message });
    }
  });


  // 進捗状況を更新して送信する関数
  let progress = 0;
  const intervalId = setInterval(() => {
    if (progress <= 100) {
      socket.emit('updateProgress', progress);
      progress++;
    } else {
      clearInterval(intervalId); // 100 に達したらインターバルをクリア
    }
  }, 1000);
  
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

<<<<<<< HEAD
=======
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

// 検証用画像フォルダのアップロード API
app.post('/upload-folder', upload.array('files'), async (req, res) => {
  try {
    const projectName = req.body.projectName;
    const originalFolderName = req.body.folderName;
    let folderName = originalFolderName;
    let counter = 1;
    let uploadPath = path.join(uploadDir, 'verification', projectName, folderName);

    // アップロード先ディレクトリが存在する場合は、連番を付与してフォルダ名を作成
    while (fs.existsSync(uploadPath)) {
      folderName = `${originalFolderName}-${counter}`;
      uploadPath = path.join(uploadDir, 'verification', projectName, folderName);
      counter++;
    }

    // アップロード先ディレクトリを作成
    await fs.ensureDir(uploadPath);

    // ファイルを移動
    await Promise.all(
      req.files.map(async (file) => {
        const destination = path.join(uploadPath, file.originalname);
        await fs.move(file.path, destination);
      })
    );

    res.json({ message: 'フォルダのアップロードに成功しました。', folderName: folderName }); // 保存されたフォルダ名を返す
  } catch (err) {
    console.error('ファイルアップロードエラー:', err);
    res.status(500).json({ error: 'フォルダのアップロードに失敗しました。', details: err.message });
  }
});

// 進捗状況を返す API
app.get('/progress', (req, res) => {
  const progress = 84 // 適当な数値 (0〜100)

  res.json({ progress: progress });
});

>>>>>>> 0d4992c85a9d640e26ecf24aa1b8f1aeaf2d62bd
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
<<<<<<< HEAD
=======

>>>>>>> 0d4992c85a9d640e26ecf24aa1b8f1aeaf2d62bd
