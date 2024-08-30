// DOMContentLoaded イベント発生時の初期化処理
document.addEventListener('DOMContentLoaded', init);
// グローバルスコープで socket 変数を定義
let socket;

// 初期化関数
async function init() {
  socket = io('http://localhost:3000'); // サーバーに接続
  console.log('サーバーに接続しました');

  // 画像アップロード成功イベント
  socket.on('uploadSuccess', (data) => {
    console.log(data.message, data.fileName); // 成功メッセージを表示
  });

  // 画像アップロードエラーイベント
  socket.on('uploadError', (data) => {
    handleError(data.error, data.details); // エラーメッセージを表示
  });

  // フォルダアップロード成功イベント
  socket.on('uploadFolderSuccess', (data) => {
    console.log(data.message, data.folderName); // 成功メッセージを表示
    const folderNameElement = document.getElementById('uploadedFolderName');
    folderNameElement.textContent = `Uploaded Folder: ${data.folderName}`; // 保存されたフォルダ名を表示
  });
  
  setupImageHoverEvents();
  await displayEachImages();
  setupEventListeners();

  // カスタムイベントリスナーを設定
  document.addEventListener('image-data-changed', async () => {
    updateImageCount();
    await displayEachImages();
    displaySidebarLabelList(await fetchLabelList(document.getElementById("projectLink").textContent.trim()));
    updateActiveLabel(); // displayEachImages の完了後に updateActiveLabel を実行
  });
  // "Label" 文字のクリックイベントリスナーを追加
  setupSidebarLabelToggle();

  // "Check" 項目のクリックイベントリスナーを追加
  setupSidebarCheckToggle();

  // 初期状態でサイドバーのラベル一覧を表示
  displaySidebarLabelList(await fetchLabelList(document.getElementById("projectLink").textContent.trim()));
  // スクロールイベントリスナーを追加
  window.addEventListener('scroll', updateActiveLabel);
  // 初期状態でアクティブなラベルを設定
  updateActiveLabel(); 

  // sidebar-label 要素を初期状態でアクティブにする
  const sidebarLabel = document.getElementById('sidebarLabel');
  const imageList = document.getElementById('imageList');
  sidebarLabel.classList.add('active');
  imageList.style.display = 'block';
  // プログレスバーを表示
  await displayProgress(); 
}

// 共通のエラーハンドリング関数
function handleError(error, message) {
  console.error(error);
  alert(message);
}

// 共通のリクエスト送信関数
async function sendRequest(url, method, data, errorMessage) {
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    console.log(responseData.message);
    return responseData;
  } catch (error) {
    handleError(error, errorMessage);
    throw error;
  }
}


// "Label" 文字のクリックイベントリスナーを設定する関数
function setupSidebarLabelToggle() {
  const sidebarLabel = document.getElementById('sidebarLabel');
  const sidebarLabelList = document.getElementById('sidebarLabelList');
  const labelToggleIcon = document.getElementById('labelToggleIcon');
  const imageList = document.getElementById('imageList');
  const sidebarCheck = document.getElementById('sidebarCheck'); // sidebar-check 要素を取得

  sidebarLabel.addEventListener('click', () => {
    // ラベル一覧の表示・非表示を切り替え
    sidebarLabelList.style.display = sidebarLabelList.style.display === 'none' ? 'block' : 'none';

    // 山括弧の表示を切り替え
    labelToggleIcon.textContent = sidebarLabelList.style.display === 'block' ? '︿' : '﹀';

    // sidebar-label 要素をアクティブにする
    sidebarLabel.classList.add('active');

    // sidebar-check 要素を非アクティブにする
    sidebarCheck.classList.remove('active');
    document.getElementById('sidebarCheckList').style.display = 'none'; 
    document.getElementById('checkContent').style.display = 'none';

    // sidebar-label 要素のアクティブ状態に合わせて image-list の表示を切り替え
    if (sidebarLabel.classList.contains('active')) {
      imageList.style.display = 'block';
      document.querySelector('.add-label-container').style.display = 'block'; // addLabelButton を表示
    } else {
      imageList.style.display = 'none';
      document.querySelector('.add-label-container').style.display = 'none'; // addLabelButton を非表示
    }

    // sidebar-label 要素がアクティブになったので image-list を表示
    imageList.style.display = 'block'; 
  });
}

// "Check" 項目のクリックイベントリスナーを設定する関数
function setupSidebarCheckToggle() {
  const sidebarCheck = document.getElementById('sidebarCheck');
  const sidebarCheckList = document.getElementById('sidebarCheckList');
  const imageList = document.getElementById('imageList');
  const checkContent = document.getElementById('checkContent');
  const sidebarLabel = document.getElementById('sidebarLabel'); 

  // "Upload" ボタンを生成 (一度だけ)
  const uploadButtonContainer = document.getElementById('uploadButtonContainer');
  const uploadButton = document.createElement('button');
  uploadButton.textContent = 'Upload';
  uploadButton.addEventListener('click', handleUploadFolderClick);
  uploadButtonContainer.appendChild(uploadButton);

  sidebarCheck.addEventListener('click', () => {

    // 既にアクティブな場合は処理を中断
    if (sidebarCheck.classList.contains('active')) {
      return; 
    }

    // CheckList の表示・非表示を切り替え
    sidebarCheckList.style.display = sidebarCheckList.style.display === 'none' ? 'block' : 'none';

    // "Check" 項目のアクティブ状態を切り替え
    sidebarCheck.classList.toggle('active');

    // image-list と check-content の表示を切り替え
    if (sidebarCheckList.style.display === 'block') {
      imageList.style.display = 'none';
      checkContent.style.display = 'block';

      // "Upload" ボタンを表示
      uploadButton.style.display = 'block'; 
    } else {
      imageList.style.display = 'block';
      checkContent.style.display = 'none';

      // "Upload" ボタンを非表示
      uploadButton.style.display = 'none'; 
    }

    // sidebar-label 要素を非アクティブにする
    sidebarLabel.classList.remove('active');
    document.getElementById('sidebarLabelList').style.display = 'none'; 
    document.getElementById('labelToggleIcon').textContent = '﹀';
  });
}




// ラベル削除ボタンのクリックイベント
async function handleLabelDeleteClick(event) {
  const { projectName, labelName } = event.target.dataset;
  const labelContainer = event.target.closest('.label-container');

  try {
    await sendRequest(
      '/label/delete',
      'DELETE',
      { projectName, labelName },
      'ラベルの削除に失敗しました'
    );

    // ラベルコンテナをDOMから削除
    labelContainer.remove();

    // カスタムイベントを発生
    document.dispatchEvent(new Event('image-data-changed'));
  } catch (error) {
    handleError(error, 'ラベルの削除に失敗しました');
  }
}

// DELETEボタンのクリックイベント
async function handleDeleteButtonClick(event) {
  const projectName = document.getElementById("projectLink").textContent.trim();
  const selectedImageCards = document.querySelectorAll('.image-card.selected');

  try {
    // 選択されたすべての画像カードを削除
    await Promise.all(
      Array.from(selectedImageCards).map(async (imageCard) => {
        const { imageName, labelName } = imageCard.dataset;
        await sendRequest(
          '/delete',
          'DELETE',
          { projectName, imageName, labelName },
          '画像の削除に失敗しました'
        );
        imageCard.remove();

        // 削除した画像のラベルの画像数を更新
        updateLabelImageCount(labelName);
      })
    );

    // カスタムイベントを発生
    document.dispatchEvent(new Event('image-data-changed'));
  } catch (error) {
    handleError(error, '画像の削除に失敗しました');
  }
}

// 画像総数を更新する関数
function updateImageCount() {
  const imageListTitle = document.querySelector('.image-list-title');
  const totalImages = document.querySelectorAll('.image-card').length;
  imageListTitle.textContent = `ALL (${totalImages} images)`;
}

// ラベルの画像数を更新する関数
function updateLabelImageCount(labelName) {
  const labelNameElement = document.querySelector(`.label-container[data-label-id="${labelName}"] .label-name`);
  const labelImages = document.querySelectorAll(`.image-card[data-label-name="${labelName}"]`).length;
  labelNameElement.textContent = `${labelName} (${labelImages} images)`;
}

// ラベルをクリックした時のイベントリスナー
function handleLabelClick(event) {
  const labelElement = event.target;
  const imageCard = labelElement.closest('.image-card'); 

  // 既に展開されているラベルリストコンテナを取得
  const existingLabelListContainer = document.querySelector('.label-list-container');
  
  // 既存のコンテナが存在し、クリックされたラベル要素の親要素でない場合は、既存のコンテナを削除
  if (existingLabelListContainer && existingLabelListContainer.parentNode !== labelElement.parentNode) {
    existingLabelListContainer.remove();
  }

  // 既存のラベルリストコンテナを削除
  const currentLabelListContainer = labelElement.parentNode.querySelector('.label-list-container');
  if (currentLabelListContainer) {
    currentLabelListContainer.remove();
    return; // 既存のコンテナを削除したら関数を終了
  }

  // 新しいラベルリストコンテナを作成
  const labelListContainer = document.createElement('div');
  labelListContainer.classList.add('label-list-container');

  // 現在のラベル名を取得
  const currentLabel = labelElement.textContent;

  // ラベルリストを取得
  const projectName = document.getElementById("projectLink").textContent.trim();
  const projectPath = `/projects/${projectName}`;
  fetch(`http://localhost:3000/directory?path=${projectPath}`)
    .then(response => response.json())
    .then(labelList => {
      // 現在のラベル以外のラベルをリストに追加
      labelList.forEach(label => {
        if (label.isDirectory && label.name !== currentLabel) {
          const labelItem = document.createElement('div');
          labelItem.classList.add('label-item');
          labelItem.textContent = label.name;
          labelItem.dataset.labelName = label.name;
          labelItem.addEventListener('click', handleLabelItemClick);
          labelListContainer.appendChild(labelItem);
        }
      });

      // ラベル要素と image-grid-inner 要素の位置を取得
      const labelRect = labelElement.getBoundingClientRect();
      const imageGridInnerRect = imageCard.parentNode.getBoundingClientRect();

      // ラベルリストコンテナの位置を設定 (image-grid-inner を基準とした相対位置)
      labelListContainer.style.top = `${labelRect.bottom - imageGridInnerRect.top}px`;
      labelListContainer.style.left = `${labelRect.left - imageGridInnerRect.left}px`;

      // ラベル要素の親要素 (image-grid-inner) にラベルリストコンテナを追加
      imageCard.parentNode.appendChild(labelListContainer);

      document.addEventListener('click', (event) => {
        if (!labelListContainer.contains(event.target) && !labelElement.contains(event.target)) {
          labelListContainer.remove();
        }
      });
    })
    .catch(error => {
      console.error('ラベルの取得中にエラーが発生しました:', error);
    });
}

// ラベル項目クリック時のイベントリスナー
async function handleLabelItemClick(event) {
  const selectedImageCards = document.querySelectorAll('.image-card.selected');
  const targetLabel = event.target.dataset.labelName;
  const projectName = document.getElementById("projectLink").textContent.trim();

  try {
    // 選択されたすべての画像カードを移動
    await Promise.all(
      Array.from(selectedImageCards).map(async (imageCard) => {
        const { imageName, labelName: sourceLabel } = imageCard.dataset;

        // 移動先のラベルと画像の現在のラベルが異なる場合のみ移動処理を行う
        if (sourceLabel !== targetLabel) { 
          await moveImage(projectName, imageName, sourceLabel, targetLabel);

          // 移動後のラベルを表示
          const labelSpan = imageCard.querySelector('.image-label');
          labelSpan.textContent = targetLabel;
          labelSpan.style.display = 'none'; // ラベルを非表示にする
          imageCard.dataset.labelName = targetLabel; // data-label-name 属性も更新

          // 画像カードを新しいラベルコンテナに移動
          const targetLabelContainer = document.querySelector(`.label-container[data-label-id="${targetLabel}"] .image-grid-inner`);
          targetLabelContainer.appendChild(imageCard);

           // 移動元のラベルと移動先のラベルの画像数を更新
           updateLabelImageCount(sourceLabel);
           updateLabelImageCount(targetLabel);
        }
      })
    );

    // ラベルリストコンテナを削除
    const labelListContainer = document.querySelector('.label-list-container');
    if (labelListContainer) {
      labelListContainer.remove();
    }

    // カスタムイベントを発生
    document.dispatchEvent(new Event('image-data-changed'));
  } catch (error) {
    handleError(error, '画像の移動に失敗しました');
  }
}
// 画像を移動する関数
async function moveImage(projectName, imageName, sourceLabel, targetLabel) {
  await sendRequest(
    '/move',
    'PUT',
    { projectName, imageName, sourceLabel, targetLabel },
    '画像の移動に失敗しました'
  );
}

// プログレスバーを表示する関数
async function displayProgress() {
  const progressContainer = document.getElementById('progressContainer');

  // 円形のプログレスバーを生成
  const progressBar = document.createElement('div');
  progressBar.classList.add('progress-bar');
  progressContainer.appendChild(progressBar);

  // パーセンテージ表示を生成
  const percentage = document.createElement('div');
  percentage.classList.add('percentage');
  progressBar.appendChild(percentage);

  // サーバーから進捗状況を取得
  try {
    const response = await fetch('/progress');
    const data = await response.json();
    updateProgress(data.progress);
  } catch (error) {
    handleError(error, '進捗状況の取得に失敗しました。');
  }
}

// プログレスバーを更新する関数
function updateProgress(progress) {
  const progressBar = document.querySelector('.progress-bar');
  const percentage = document.querySelector('.percentage');

  // プログレスバーの角度を計算
  const angle = progress * 3.6; // 360度 * (progress / 100)

  // プログレスバーのスタイルを更新
  progressBar.style.backgroundImage = `conic-gradient(#68b7ff 0deg, #68b7ff ${angle}deg, transparent ${angle}deg, transparent 360deg)`; // 最後の色を transparent に変更
  
  // パーセンテージ表示を更新
  percentage.textContent = `${progress}%`;
}

// イベントリスナーの設定関数
function setupEventListeners() {
  document.querySelectorAll('.upload-button').forEach(button => {
    button.addEventListener('click', handleUploadButtonClick);
  });

  document.querySelectorAll('.image-label').forEach(label => {
    label.addEventListener('click', handleLabelClick);
  });

  document.querySelectorAll('.label-item').forEach(labelItem => {
    labelItem.addEventListener('click', handleLabelItemClick);
  });

  document.querySelectorAll('.delete-button').forEach(button => {
    button.addEventListener('click', handleDeleteButtonClick);
  });

  document.querySelectorAll('.label-delete-button').forEach(button => {
    button.addEventListener('click', handleLabelDeleteClick);
  });

  document.getElementById('addLabelButton').addEventListener('click', toggleAddLabelForm);

  document.getElementById('createNewLabelButton').addEventListener('click', createNewLabel);
  const hamburgerMenu = document.getElementById('hamburgerMenu');
  const menu = document.getElementById('menu');
  hamburgerMenu.addEventListener('click', () => {
    toggleElementDisplay(menu);
  });
  document.getElementById('homeLink').addEventListener('click', () => {
    window.location.href = '/';
  });
}

// ラベル追加フォームの表示/非表示を切り替える関数
function toggleAddLabelForm() {
  const addLabelForm = document.querySelector('.add-label-form');
  addLabelForm.style.display = addLabelForm.style.display === 'block' ? 'none' : 'block';
}

// 新しいラベルを作成する関数
async function createNewLabel() {
  const newLabelNameInput = document.getElementById('newLabelName');
  const newLabelName = newLabelNameInput.value.trim();
  const imageGrid = document.getElementById('imageGrid');

  if (newLabelName === '') {
    alert('ラベル名を入力してください');
    return;
  }

  const projectName = document.getElementById("projectLink").textContent.trim();

  try {
    await sendRequest(
      '/label/create',
      'POST',
      { projectName, labelName: newLabelName },
      'ラベルの作成に失敗しました'
    );

    // 新しいラベルコンテナを生成
    const newLabelContainer = createLabelContainer(newLabelName);

    // imageGridに新しいラベルコンテナを追加
    imageGrid.appendChild(newLabelContainer);

    // 入力欄をクリア
    newLabelNameInput.value = '';

     // カスタムイベントを発生
     document.dispatchEvent(new Event('image-data-changed'));
  } catch (error) {
    handleError(error, 'ラベルの作成に失敗しました');
  }
}

// 画像を表示する関数
async function displayImage(imagePath, labelName, imageName, imageContainer) {
  try {
    const response = await fetch(`http://localhost:3000/images?path=${imagePath}/${labelName}/${imageName}`);
    const blob = await response.blob();

    const img = document.createElement('img');
    img.src = URL.createObjectURL(blob);
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';

    imageContainer.innerHTML = ''; 
    imageContainer.appendChild(img);

  } catch (error) {
    handleError(error, '画像の取得に失敗しました');
  }
}

// 画像のホバーイベントリスナーを設定する関数
function setupImageHoverEvents() {
  const imageGrid = document.getElementById('imageGrid');
  if (!imageGrid) return;

  // 複数選択された画像を格納するセット
  const selectedImages = new Set();

  // マウスオーバー時の処理
  imageGrid.addEventListener('mouseover', (event) => {
    const imageCard = event.target.closest('.image-card');
    if (imageCard) {
      const imageNameSpan = imageCard.querySelector('.image-name');
      const deleteButton = imageCard.querySelector('.delete-button');
      imageNameSpan.textContent = imageCard.dataset.imageName;
      imageNameSpan.style.display = 'block';

      // 選択状態にある場合のみ Delete ボタンを表示
      if (imageCard.classList.contains('selected')) {
        deleteButton.style.display = 'block';
      }
    }
  });

  // マウスアウト時の処理
  imageGrid.addEventListener('mouseout', (event) => {
    const imageCard = event.target.closest('.image-card');
    if (imageCard) {
      const imageNameSpan = imageCard.querySelector('.image-name');
      const deleteButton = imageCard.querySelector('.delete-button');
      imageNameSpan.style.display = 'none';

      // Delete ボタンを非表示にする
      deleteButton.style.display = 'none';
    }
  });

  // 画像カードのクリックイベントリスナー
  imageGrid.addEventListener('click', (event) => {
     if (event.target.classList.contains('image-label')) {
        event.stopPropagation();
        return; // 以降の処理をスキップ
      }
  
    if (event.target.classList.contains('image-card')) {
      const imageCard = event.target;
      const imageName = imageCard.dataset.imageName;
      const deleteButton = imageCard.querySelector('.delete-button'); // Delete ボタンを取得
      const labelSpan = imageCard.querySelector('.image-label'); // ラベルを取得
  
      // Ctrlキーが押されている場合は複数選択
      if (event.ctrlKey) {
        if (selectedImages.has(imageName)) {
          // 既に選択されている場合は選択解除
          selectedImages.delete(imageName);
          imageCard.classList.remove('selected');
          deleteButton.style.display = 'none'; // 選択解除時に Delete ボタンを非表示
          labelSpan.style.display = 'none'; // 選択解除時にラベルを非表示
        } else {
          // 選択されていない場合は選択
          selectedImages.add(imageName);
          imageCard.classList.add('selected');
          deleteButton.style.display = 'block'; // 選択時に Delete ボタンを表示
          labelSpan.style.display = 'block'; // 選択解除時にラベルを非表示
        }
      } else {
        // Ctrlキーが押されていない場合は単一選択
        selectedImages.clear();
        document.querySelectorAll('.image-card').forEach(card => {
          card.classList.remove('selected');
          card.querySelector('.delete-button').style.display = 'none'; // すべての Delete ボタンを非表示
          card.querySelector('.image-label').style.display = 'none'; // すべてのラベルを非表示
        });
        selectedImages.add(imageName);
        imageCard.classList.add('selected');
        deleteButton.style.display = 'block'; // 選択時に Delete ボタンを表示
        labelSpan.style.display = 'block'; // 選択時にラベルを表示
      }
  
      console.log('選択された画像:', selectedImages); // 選択された画像の確認
    }
  });
  
   // ESCキーのイベントリスナー
   document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && selectedImages.size > 0) {
      // 複数選択状態を解除
      selectedImages.forEach(imageName => {
        const imageCard = document.querySelector(`.image-card[data-image-name="${imageName}"]`);
        const labelSpan = imageCard.querySelector('.image-label'); // ラベルを取得
        if (imageCard) {
          imageCard.classList.remove('selected');
          // Delete ボタンを非表示にする
          imageCard.querySelector('.delete-button').style.display = 'none'; 
          labelSpan.style.display = 'none'; // 選択解除時にラベルを非表示
        }
      });
      selectedImages.clear();
    }
  });
   // 画像カードの右クリックイベントリスナー
   imageGrid.addEventListener('contextmenu', (event) => {
    if (event.target.classList.contains('image-card')) {
      event.preventDefault(); // 右クリックメニューの表示を抑制
      const imageCard = event.target;
      enlargeImage(imageCard); // imageCard を引数として渡す
    }
  });

  // 画像カード以外をクリックしたときのイベントリスナー
  document.addEventListener('click', (event) => {
    // クリックされた要素が画像カードでない場合
    if (!event.target.classList.contains('image-card')) {
      // 複数選択状態を解除
      selectedImages.forEach(imageName => {
        const imageCard = document.querySelector(`.image-card[data-image-name="${imageName}"]`);
        const labelSpan = imageCard.querySelector('.image-label'); // ラベルを取得
        if (imageCard) {
          imageCard.classList.remove('selected');
          // Delete ボタンを非表示にする
          imageCard.querySelector('.delete-button').style.display = 'none'; 
          labelSpan.style.display = 'none'; // 選択解除時にラベルを非表示
        }
      });
      selectedImages.clear();
    }
  });
}

// 画像を拡大表示する関数
async function enlargeImage(imageCard) {
  const imageContainer = document.createElement('div');
  imageContainer.classList.add('enlarged-image-container');

  // 閉じるボタンを追加
  const closeButton = document.createElement('button');
  closeButton.classList.add('close-button');
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => {
    imageContainer.remove();
  });
  imageContainer.appendChild(closeButton);

  const imagePlaceholder = document.createElement('div');
  imagePlaceholder.classList.add('enlarged-image-placeholder');
  imageContainer.appendChild(imagePlaceholder);

  // 画像カードから画像の src 属性を取得して拡大表示用のコンテナに設定
  const imageSrc = imageCard.querySelector('img').src; 
  imagePlaceholder.style.backgroundImage = `url(${imageSrc})`;

  // body に画像コンテナを追加
  document.body.appendChild(imageContainer);
}

// サーバーからラベルリストを取得する関数
async function fetchLabelList(projectName) {
  const projectPath = `/projects/${projectName}`;
  const response = await fetch(`http://localhost:3000/directory?path=${projectPath}`);
  if (!response.ok) {
    throw new Error('ラベルリストの取得に失敗しました');
  }
  return await response.json();
}

// 既存のラベルコンテナをクリアする関数
function clearLabelContainers() {
  const imageGrid = document.getElementById('imageGrid');
  imageGrid.innerHTML = ''; // 既存のラベルを削除
}

// 新しいラベルコンテナを生成する関数
function createLabelContainers(labelList) {
  const imageGrid = document.getElementById('imageGrid');
  labelList.forEach(label => {
    if (label.isDirectory) {
      const newLabelContainer = createLabelContainer(label.name);
      imageGrid.appendChild(newLabelContainer);
    }
  });
}

// 指定されたラベルの画像を表示する関数
async function displayImagesForLabel(label, projectPath) {
  const response = await fetch(`http://localhost:3000/directory?path=${projectPath}/${label.name}`);
  const imageList = await response.json();

  const imageGridInner = document.querySelector(`.label-container[data-label-id="${label.name}"] .image-grid-inner`);

  // すべての画像を並行処理で取得
  await Promise.all(
    imageList.filter(image => !image.isDirectory).map(async image => {
      const imagePlaceholder = document.createElement('div');
      imagePlaceholder.classList.add('image-placeholder');
      const imageCard = document.createElement('div');
      imageCard.classList.add('image-card');
      imageCard.dataset.imageName = image.name;
      imageCard.dataset.labelName = label.name;
      imageCard.appendChild(imagePlaceholder);

      // 画像を表示
      await displayImage(projectPath, label.name, image.name, imagePlaceholder);

      // 画像カードをimageGridInnerに追加
      imageGridInner.appendChild(imageCard);

      // 画像カードに削除ボタンを追加
      const deleteButton = document.createElement('button');
      deleteButton.classList.add('delete-button');
      deleteButton.textContent = 'Delete';
      deleteButton.dataset.imageName = image.name;
      deleteButton.dataset.labelName = label.name;
      deleteButton.addEventListener('click', handleDeleteButtonClick);
      deleteButton.style.display = 'none'; // 初期表示状態を非表示に設定
      imageCard.appendChild(deleteButton);

      // 画像カードにラベル表示を追加
      const labelSpan = document.createElement('span');
      labelSpan.classList.add('image-label');
      labelSpan.textContent = label.name;
      labelSpan.addEventListener('click', handleLabelClick); // クリックイベントリスナーを追加
      labelSpan.style.display = 'none'; // 初期状態では非表示
      imageCard.appendChild(labelSpan);

      // 画像名を表示するspan要素を追加
      const imageNameSpan = document.createElement('span');
      imageNameSpan.classList.add('image-name');
      imageNameSpan.style.display = 'none'; // 初期表示は非表示
      imageCard.appendChild(imageNameSpan);

      // ホバーイベントリスナーを追加
      imageCard.addEventListener('mouseover', (event) => {
        imageNameSpan.textContent = image.name;
        imageNameSpan.style.display = 'block';
      });

      imageCard.addEventListener('mouseout', (event) => {
        imageNameSpan.style.display = 'none';
      });
    })
  );
}

// 各ラベルの画像を表示する関数
async function displayEachImages() {
  try {
    const projectName = document.getElementById("projectLink").textContent.trim();
    const projectPath = `/projects/${projectName}`;

    // ラベルリストを取得
    const labelList = await fetchLabelList(projectName);

    // 既存のラベルコンテナをクリア
    clearLabelContainers();

    // 新しいラベルコンテナを生成
    createLabelContainers(labelList);

    // 各ラベルの画像を表示
    await Promise.all(
      labelList.map(async (label) => {
        if (label.isDirectory) {
          await displayImagesForLabel(label, projectPath);
          updateLabelImageCount(label.name); // ラベルごとの画像数を更新
        }
      })
    );

    // 画像総数を更新
    updateImageCount();
  } catch (error) {
    handleError(error, '画像一覧の取得に失敗しました');
  }
}

// 画像アップロード処理
async function uploadImages(files, targetDirectory) {
  const projectName = targetDirectory.split('/')[2]; // プロジェクト名を取得
  const labelName = targetDirectory.split('/')[3]; // ラベル名を取得

  // 各ファイルをアップロード
  for (const file of files) {
    try {
      // 画像アップロードイベントをサーバーに送信 (バイナリデータのまま送信)
      socket.emit('upload', {
        projectName: projectName,
        labelName: labelName,
        fileData: file, // バイナリデータ
        originalFilename: file.name,
      });
    } catch (error) {
      handleError(error, '画像のアップロード中にエラーが発生しました');
    }
  }
}

// "Upload" ボタンのクリックイベントハンドラ
async function handleUploadFolderClick() {
  // フォルダ選択ダイアログを表示
  const directoryHandle = await window.showDirectoryPicker();

  // プロジェクト名を取得
  const projectName = document.getElementById("projectLink").textContent.trim();

  // フォルダ名を表示する要素を作成
  const folderNameElement = document.createElement('div');
  folderNameElement.id = 'uploadedFolderName';
  folderNameElement.textContent = `Uploaded Folder: ${directoryHandle.name}`;

  // uploadButtonContainer にフォルダ名を表示する要素を追加
  const uploadButtonContainer = document.getElementById('uploadButtonContainer');
  uploadButtonContainer.appendChild(folderNameElement);

  // ファイルのリストを作成
  const files = [];
  for await (const entry of directoryHandle.values()) {
    if (entry.kind === 'file') {
      const file = await entry.getFile();
      files.push({ name: file.name, data: file }); // バイナリデータ
    }
  }

  // フォルダ内のファイルをアップロード
  try {
    socket.emit('uploadFolder', {
      projectName: projectName,
      originalFolderName: directoryHandle.name,
      files: files,
    });
  } catch (error) {
    handleError(error, 'フォルダのアップロード中にエラーが発生しました。');
  }
}


// アップロードボタンのクリック処理
function handleUploadButtonClick(event) {
  const projectName = document.getElementById("projectLink").textContent.trim();
  const labelContainer = event.target.closest('.label-container');
  const targetLabel = labelContainer.dataset.labelId;
  const targetDirectory = `/projects/${projectName}/${targetLabel}`;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.style.display = 'none';

  fileInput.addEventListener('change', (event) => {
    const files = event.target.files;
    uploadImages(files, targetDirectory);
  });

  document.body.appendChild(fileInput);
  fileInput.click();
  document.body.removeChild(fileInput);
}

// 要素の表示・非表示を切り替える関数
function toggleElementDisplay(element) {
  element.style.display = element.style.display === 'block' ? 'none' : 'block';
}

// ラベルコンテナを作成する関数
function createLabelContainer(labelName) {
  const labelContainer = document.createElement('div');
  labelContainer.classList.add('label-container');
  labelContainer.dataset.labelId = labelName;

  // ラベル名の表示
  const labelNameElement = document.createElement('div');
  labelNameElement.classList.add('label-name');
  labelNameElement.textContent = labelName;
  labelContainer.appendChild(labelNameElement);

   // 削除ボタン
   const deleteButton = document.createElement('button');
   deleteButton.classList.add('label-delete-button');
   deleteButton.textContent = 'Label Delete';
   deleteButton.dataset.projectName = document.getElementById("projectLink").textContent.trim();
   deleteButton.dataset.labelName = labelName;
   deleteButton.addEventListener('click', handleLabelDeleteClick);
   labelContainer.appendChild(deleteButton);

  // 画像グリッドのコンテナ
  const imageGridInner = document.createElement('div');
  imageGridInner.classList.add('image-grid-inner');
  labelContainer.appendChild(imageGridInner);

  // アップロードボタン
  const uploadButton = document.createElement('button');
  uploadButton.classList.add('upload-button');
  uploadButton.textContent = '+';
  uploadButton.addEventListener('click', handleUploadButtonClick);
  labelContainer.appendChild(uploadButton);

  return labelContainer;
}

/// サイドバーのラベル一覧と画像数を表示する関数
function displaySidebarLabelList(labelList) {
  const sidebarLabelList = document.getElementById('sidebarLabelList');
  sidebarLabelList.innerHTML = ''; // 既存のラベル一覧をクリア

  // All を追加
  const allLabel = document.createElement('div');
  allLabel.textContent = 'All';
  allLabel.classList.add('active-click'); // 初期状態でクリックされた状態にする
  const allImageCount = document.createElement('div');
  allImageCount.textContent = `${document.querySelectorAll('.image-card').length} images`;
  allImageCount.classList.add('image-count'); // 画像数表示用のクラスを追加
  sidebarLabelList.appendChild(allLabel);
  sidebarLabelList.appendChild(allImageCount);

  // All ラベルのクリックイベントリスナー
  allLabel.addEventListener('click', () => {
    const labelContainers = document.querySelectorAll('.label-container');
    labelContainers.forEach(container => {
      container.style.display = 'block'; // すべてのラベルコンテナを表示
    });

    // すべてのサイドバーラベルから active-click クラスを削除
    const sidebarLabels = sidebarLabelList.querySelectorAll('div:not(.image-count)');
    sidebarLabels.forEach(label => label.classList.remove('active-click'));

    // All ラベルに active-click クラスを追加
    allLabel.classList.add('active-click');

    // image-list-header を表示
    document.querySelector('.image-list-header').style.display = 'block';

    // アクティブなラベルを更新 (スクロール位置による)
    updateActiveLabel();
  });

  // ラベルごとに追加
  labelList.forEach(label => {
    if (label.isDirectory) {
      const labelElement = document.createElement('div');
      labelElement.textContent = label.name;
      const imageCount = document.createElement('div');
      imageCount.textContent = `${document.querySelectorAll(`.image-card[data-label-name="${label.name}"]`).length} images`;
      imageCount.classList.add('image-count'); // 画像数表示用のクラスを追加
      sidebarLabelList.appendChild(labelElement);
      sidebarLabelList.appendChild(imageCount);

      // ラベル要素のクリックイベントリスナー
      labelElement.addEventListener('click', () => {
        const labelContainers = document.querySelectorAll('.label-container');
        labelContainers.forEach(container => {
          // クリックされたラベルのコンテナのみ表示、それ以外は非表示
          container.style.display = container.dataset.labelId === label.name ? 'block' : 'none'; 
        });

        // すべてのサイドバーラベルから active-click クラスを削除
        const sidebarLabels = sidebarLabelList.querySelectorAll('div:not(.image-count)');
        sidebarLabels.forEach(label => label.classList.remove('active-click'));

        // クリックされたラベルに active-click クラスを追加
        labelElement.classList.add('active-click');

        // image-list-header を非表示
        document.querySelector('.image-list-header').style.display = 'none';

        // アクティブなラベルを更新 (スクロール位置による)
        updateActiveLabel();
      });
    }
  });
}

// アクティブなラベルを更新する関数
function updateActiveLabel() {
  const labelContainers = document.querySelectorAll('.label-container');
  const sidebarLabelList = document.getElementById('sidebarLabelList');
  const sidebarLabels = sidebarLabelList.querySelectorAll('div:not(.image-count)'); // 画像数表示以外の要素を取得

  // すべてのサイドバーラベルから active-scroll クラスを削除
  sidebarLabels.forEach(label => label.classList.remove('active-scroll'));

  // スクロール位置が最上部で、All がクリックされている場合のみ "All" を active-scroll にする
  if (window.scrollY === 0 && sidebarLabels[0].classList.contains('active-click')) { 
    sidebarLabels[0].classList.add('active-scroll');
    return;
  }

  // 画面上部に表示されているラベルを検索
  let activeLabel = null;
  for (const labelContainer of labelContainers) {
    const labelRect = labelContainer.getBoundingClientRect();
    if (labelRect.top <= 250 && labelRect.bottom > 250) { // ラベルが画面上部に表示されている
      activeLabel = labelContainer.dataset.labelId;
      break;
    }
  }

  // アクティブなラベルを更新
  if (activeLabel) {
    const activeSidebarLabel = Array.from(sidebarLabels).find(label => label.textContent === activeLabel);
    if (activeSidebarLabel) {
      activeSidebarLabel.classList.add('active-scroll');
    }
  }
}

// APIのベースURLを設定
const API_BASE_URL = 'http://localhost:3000';