const directoryTree = document.getElementById('directory-tree');
const fileUpload = document.getElementById('file-upload');
const uploadButton = document.getElementById('upload-button');
const dropArea = document.getElementById('drop-area');
const currentDirectoryElement = document.getElementById('current-directory'); // 現在ディレクトリ表示要素
const imageGallery = document.getElementById('image-gallery'); // 画像ギャラリー要素
const directoryNameInput = document.getElementById('directory-name'); // フォルダ名入力欄
const createDirectoryButton = document.getElementById('create-directory-button'); // フォルダ作成ボタン
const deleteDirectoryNameInput = document.getElementById('delete-directory-name'); // 削除するフォルダ名入力欄
const deleteDirectoryButton = document.getElementById('delete-directory-button'); // フォルダ削除ボタン
const renameOldDirectoryNameInput = document.getElementById('rename-old-directory-name'); // リネームするフォルダ名入力欄
const renameNewDirectoryNameInput = document.getElementById('rename-new-directory-name'); // 新しいフォルダ名を入力
const renameDirectoryButton = document.getElementById('rename-directory-button'); // フォルダリネームボタン

// サーバーエンドポイント
const serverEndpoint = 'http://localhost:3000';

// ポップアップ通知ライブラリ (仮)
// ※ 実際には適切なライブラリをimportしてください
function showNotification(message) {
    alert(message); // 仮実装
}

// リトライ設定
const maxRetryCount = 3; // リトライ回数上限
const retryInterval = 1000; // リトライ間隔（ミリ秒）

let currentDirectory = ''; // 現在ディレクトリ
let directoryHistory = []; // ディレクトリ移動履歴

// 上に戻るボタン
const backButton = document.createElement('button');
backButton.classList.add('arrow-button');
backButton.textContent = '←';
backButton.addEventListener('click', () => {
    if (directoryHistory.length > 0) {
        const previousDirectory = currentDirectory.split('/').slice(0, -1).join('/');
        displayDirectoryTree(previousDirectory);
        currentDirectory = previousDirectory;
        updateCurrentDirectoryDisplay(currentDirectory);
        displayImages(currentDirectory);
    } else {
    
        displayDirectoryTree(''); // ルートに戻す
        currentDirectory = '';
        updateCurrentDirectoryDisplay(currentDirectory);
        displayImages(currentDirectory);
    }
});
// ディレクトリツリーの初期表示
async function displayDirectoryTree(path = '') {
  try {
    const response = await fetch(`http://localhost:3000/directory?path=${path}`); // サーバーの URL を指定
    const directoryContent = await response.json();

    // ディレクトリツリーを構築
    const directoryTreeUl = document.createElement('ul');
    
    console.log('directoryHistory:', directoryHistory); // デバッグ用出力
    console.log('currentDirectory:', currentDirectory); // デバッグ用出力

    if (directoryContent.length === 0) {
      // ディレクトリが空の場合
      const emptyLi = document.createElement('li');
      emptyLi.textContent = '空のディレクトリです';
      directoryTreeUl.appendChild(emptyLi);
    } else {
      directoryContent.forEach(item => {
        const li = document.createElement('li');

        // アイコンを表示
        const icon = document.createElement('div');
        icon.classList.add('icon');
        if (item.isDirectory) {
          icon.classList.add('folder-icon');
        } else {
          icon.classList.add('file-icon');
        }
        li.appendChild(icon);

        const link = document.createElement('a');
        link.href = '#'; // TODO: クリック時の処理を追加
        link.textContent = item.name;
        li.appendChild(link);

        // クリックイベントを追加
        link.addEventListener('click', () => {
          if (item.isDirectory) {
            // サブディレクトリを表示
            displayDirectoryTree(`${path}/${item.name}`);
            currentDirectory = `${path}/${item.name}`;
            updateCurrentDirectoryDisplay(currentDirectory); // 現在ディレクトリを更新
            // 履歴に現在のディレクトリからの相対パスを追加
            if ( directoryHistory[directoryHistory.length - 1] !== item.name) {
              directoryHistory.push(item.name); 
            }
            displayImages(currentDirectory);
          } else {
            // ファイルの処理 (TODO)
            // ファイルをダウンロードなど
            downloadFile(`${path}/${item.name}`);
          }
        });

        // 現在ディレクトリを強調表示
        if (path === currentDirectory) {
          li.classList.add('active');
        }

        directoryTreeUl.appendChild(li);
      });
    }

    directoryTree.innerHTML = ''; // ツリーをクリア
    directoryTree.appendChild(directoryTreeUl);

  } catch (error) {
    console.error(error);
    showNotification('ディレクトリツリー取得失敗');
  }
}


// 現在ディレクトリ表示を更新
function updateCurrentDirectoryDisplay(directory) {
  currentDirectoryElement.textContent = `現在ディレクトリ: ${directory}`;
}

// ファイルアップロード処理
async function uploadFiles(files, targetDirectory) {
    // TODO: サーバーにファイルアップロードリクエストを送信する
    //       リトライ処理、エラー処理を実装する
  }

// 画像を表示
async function displayImages(path = '') {
  try {
    const response = await fetch(`http://localhost:3000/directory?path=${path}`); // サーバーの URL を指定
    const directoryContent = await response.json();
    console.log('directoryContent:', directoryContent);
    console.log('directoryContent.length:', directoryContent.length);

    imageGallery.innerHTML = ''; // ギャラリーをクリア

    directoryContent.forEach(item => {
      if (!item.isDirectory) {
        const img = document.createElement('img');
        img.src = `http://localhost:3000/uploads${path}/${item.name}`; // 画像のパスを設定
        img.alt = item.name;

        const imageInfo = document.createElement('div');
        imageInfo.classList.add('image-info');
        imageInfo.textContent = item.name;

        // 削除ボタンの作成
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '削除';
        deleteButton.addEventListener('click', async () => {
          try {
            const response = await fetch('http://localhost:3000/delete', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: `${path}/${item.name}` })
            });

            if (!response.ok) {
              throw new Error('ファイル削除失敗');
            }

            const data = await response.json();
            console.log(data.message);

            // ギャラリーを更新
            displayImages(path);
          } catch (error) {
            console.error(error);
            showNotification('ファイル削除失敗');
          }
        });

        // 画像と削除ボタンをギャラリーに追加
        imageGallery.appendChild(img);
        imageGallery.appendChild(imageInfo);
        imageGallery.appendChild(deleteButton);
      }
    });

  } catch (error) {
    console.error(error);
    showNotification('画像表示エラー');
  }
}

// DOMContentLoadedイベント発生時にディレクトリツリーを表示
document.addEventListener('DOMContentLoaded', () => {
    displayDirectoryTree();
    updateCurrentDirectoryDisplay(currentDirectory); // 初期表示
    displayImages(currentDirectory); // 画像を初期表示
    // 上に戻るボタンをツリーの上に追加
    directoryTree.parentNode.insertBefore(backButton, directoryTree);
});


// ドラッグ＆ドロップ関連イベント
dropArea.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropArea.classList.add('hover');
});

dropArea.addEventListener('dragleave', () => {
  dropArea.classList.remove('hover');
});

dropArea.addEventListener('drop', (event) => {
  event.preventDefault();
  dropArea.classList.remove('hover');
  const files = event.dataTransfer.files;
  // ファイル拡張子のチェック
  // すべてのファイルに対して拡張子チェックを行う
  for (const file of files) {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (fileExtension !== 'png' && fileExtension !== 'jpg') {
      showNotification('png または jpg ファイルのみアップロードできます。');
      return; // アップロード処理を中断
    }
  }

  // サーバーへアップロードリクエストを送信
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file); // ファイルをformDataに追加
  }
  formData.append('path', currentDirectory); // 現在のディレクトリをサーバーに送信

  fetch('http://localhost:3000/upload', { // サーバーのエンドポイントを指定
      method: 'POST',
      body: formData, // FormData を使用
  })
  .then(response => {
      if (!response.ok) {
          throw new Error('これクライアント側:ファイルアップロード失敗');
      }
      return response.json();
  })
  .then(data => {
      // アップロード成功時の処理
      console.log("data.message:",data.message);
      console.log('アップロードされたファイル名:', data.filenames); // サーバーから返されたファイル名を出力
      // ディレクトリツリーを更新するなど、必要な処理を追加
      displayDirectoryTree(currentDirectory); // ディレクトリツリーを更新
      displayImages(currentDirectory); // 画像を更新
  })
  .catch(error => {
      // エラー処理
      console.error(error);
      showNotification('これクライアント側:ファイルアップロード失敗');
  });
});

// ディレクトリ作成処理
async function createDirectory(directoryPath) {
  try {
    const response = await fetch('http://localhost:3000/mkdir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentDirectory, name: directoryPath })
    });
    

    if (!response.ok) {
      throw new Error('ディレクトリ作成失敗');
    }

    const data = await response.json();
    console.log(data.message);

    // ディレクトリツリーを更新
    displayDirectoryTree(currentDirectory); // ディレクトリツリーを再表示
    displayImages(currentDirectory);
  } catch (error) {
    console.error(error);
    showNotification('ディレクトリ作成失敗');
  }
}

// フォルダ作成ボタンのクリックイベント
createDirectoryButton.addEventListener('click', () => {
    const directoryName = directoryNameInput.value;
    if (directoryName === '') {
        showNotification('フォルダ名を入力してください。');
        return;
    }
    createDirectory(directoryName);
    directoryNameInput.value = ''; // 入力欄をクリア
});

// ディレクトリ削除処理
async function deleteDirectory(directoryPath) {
  try {
    const response = await fetch('http://localhost:3000/rmdir', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: directoryPath })
    });

    if (!response.ok) {
      throw new Error('ディレクトリ削除失敗');
    }

    const data = await response.json();
    console.log(data.message);

    // ディレクトリツリーを更新
    displayDirectoryTree(currentDirectory); // ディレクトリツリーを再表示
    displayImages(currentDirectory);
  } catch (error) {
    console.error(error);
    showNotification('ディレクトリ削除失敗');
  }
}

// フォルダ削除ボタンのクリックイベント
deleteDirectoryButton.addEventListener('click', () => {
    const directoryName = deleteDirectoryNameInput.value;
    if (directoryName === '') {
        showNotification('フォルダ名を入力してください。');
        return;
    }
    // 削除するフォルダのパスを生成
    const directoryPath = `${currentDirectory}/${directoryName}`; // 現在のディレクトリとフォルダ名を結合
    deleteDirectory(directoryPath);
    deleteDirectoryNameInput.value = ''; // 入力欄をクリア
});

// ディレクトリリネーム処理
async function renameDirectory(oldDirectoryPath, newDirectoryPath) {
  try {
    const response = await fetch('http://localhost:3000/rename', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath: oldDirectoryPath, newPath: newDirectoryPath })
    });

    if (!response.ok) {
      throw new Error('ディレクトリリネーム失敗');
    }

    const data = await response.json();
    console.log(data.message);

    // ディレクトリツリーを更新
    displayDirectoryTree(currentDirectory); // ディレクトリツリーを再表示
    displayImages(currentDirectory);
  } catch (error) {
    console.error(error);
    showNotification('ディレクトリリネーム失敗');
  }
}

// フォルダリネームボタンのクリックイベント
renameDirectoryButton.addEventListener('click', () => {
    const oldDirectoryName = renameOldDirectoryNameInput.value;
    const newDirectoryName = renameNewDirectoryNameInput.value;
    if (oldDirectoryName === '' || newDirectoryName === '') {
        showNotification('フォルダ名を入力してください。');
        return;
    }
    const oldDirectoryPath = `${currentDirectory}/${oldDirectoryName}`; // 現在のディレクトリとフォルダ名を結合
    const newDirectoryPath = `${currentDirectory}/${newDirectoryName}`; // 現在のディレクトリとフォルダ名を結合

    renameDirectory(oldDirectoryPath, newDirectoryPath);
    renameOldDirectoryNameInput.value = ''; // 入力欄をクリア
    renameNewDirectoryNameInput.value = ''; // 入力欄をクリア
});

// ファイルダウンロード処理
async function downloadFile(filePath) {
  try {
    const response = await fetch(`http://localhost:3000/uploads${filePath}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filePath.split('/').pop(); // ファイル名をダウンロード名として設定
    link.click();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    showNotification('ファイルダウンロードに失敗しました。');
  }
}

// フォルダ移動処理
async function moveFile(sourcePath, targetPath, fileName) {
  try {
    const response = await fetch('http://localhost:3000/move', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourcePath, targetPath ,fileName})
    });

    if (!response.ok) {
      throw new Error('ファイル移動失敗');
    }

    const data = await response.json();
    console.log(data.message);

    // ディレクトリツリーと画像ギャラリーを更新
    displayDirectoryTree(currentDirectory); // ディレクトリツリーを再表示
    displayImages(currentDirectory); 
  } catch (error) {
    console.error(error);
    showNotification('ファイル移動失敗');
  }
}

// 移動ボタンのクリックイベント
const moveButton = document.getElementById('move-button'); // 移動ボタンの要素を取得
moveButton.addEventListener('click', () => {
    const sourceFileName = document.getElementById('move-source-file-name').value; // 移動元ファイル名を取得
    const targetFolderName = document.getElementById('move-target-folder-name').value; // 移動先フォルダ名を取得
    console.log('sourceFileName:',sourceFileName);
    console.log('targetFolderName:',targetFolderName);
    if (sourceFileName === '' || targetFolderName === '') {
        showNotification('ファイル名とフォルダ名を入力してください。');
        return;
    }
    

    const sourcePath = `${currentDirectory}/${sourceFileName}`; // 移動元ファイルのパス
    const targetPath = `${currentDirectory}/${targetFolderName}`; // 移動先フォルダのパス
    console.log('sourcePath:',sourcePath);
    console.log('targetPath:',targetPath)
    moveFile(sourcePath, targetPath,sourceFileName);
    document.getElementById('move-source-file-name').value = ''; // 入力欄をクリア
    document.getElementById('move-target-folder-name').value = ''; // 入力欄をクリア
});

// TODO: ドラッグ＆ドロップによるディレクトリ/ファイルの移動、並べ替えを実装する