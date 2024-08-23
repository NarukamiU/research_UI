// DOMContentLoaded イベント発生時の初期化処理
document.addEventListener('DOMContentLoaded', init);

// 初期化関数
async function init() {
  setupImageHoverEvents();
  await displayEachImages();
  setupEventListeners();

  // カスタムイベントリスナーを設定
  document.addEventListener('image-data-changed', async () => {
    updateImageCount();
    await displayEachImages();
  });
};

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

    // カスタムイベントを発行
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
    
    // カスタムイベントを発行
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

    // カスタムイベントを発行
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

    // カスタムイベントを発行
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

// APIのベースURLを設定
const API_BASE_URL = 'http://localhost:3000';