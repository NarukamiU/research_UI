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