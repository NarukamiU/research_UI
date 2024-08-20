// ... (他のコードは変更なし) ...

// 各ラベルの画像を表示する関数
async function displayEachImages() {
  try {
    // ... (他のコードは変更なし) ...

          // すべての画像を並行処理で取得
          await Promise.all(
            imageList.filter(image => !image.isDirectory).map(async image => {
              // ... (他のコードは変更なし) ...

              // 画像を表示
              await displayImage(projectPath, label.name, image.name, imagePlaceholder);

              // ダブルクリックイベントリスナーを追加
              imagePlaceholder.addEventListener('dblclick', () => {
                openImageModal(`${projectPath}/${label.name}/${image.name}`);
              });

              // ... (他のコードは変更なし) ...
            })
          );

    // ... (他のコードは変更なし) ...
  } catch (error) {
    handleError(error, '画像一覧の取得に失敗しました');
  }
}

// ... (他のコードは変更なし) ...

// 画像拡大モーダルを開く関数
function openImageModal(imagePath) {
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('modalImage');
  modal.style.display = 'block';
  modalImg.src = `${API_BASE_URL}/images?path=${imagePath}`;
}

// 画像拡大モーダルを閉じる関数
function closeImageModal() {
  document.getElementById('imageModal').style.display = 'none';
}

// ... (他のコードは変更なし) ...