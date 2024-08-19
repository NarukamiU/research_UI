document.addEventListener('DOMContentLoaded', init);

// 初期化関数
async function init() {
  setupEventListeners();
  await displayProjects();
}

// プロジェクト一覧を表示する関数
async function displayProjects() {
  try {
    const projectsContainer = document.querySelector('.project-list');
    if (!projectsContainer) {
      console.error('プロジェクトリストの要素が見つかりません');
      return;
    }

    const projectList = await fetchJSON('/directory?path=projects');
    projectsContainer.innerHTML = ''; // プロジェクト一覧をクリア

    // Promise.all を使用して、各プロジェクトのサムネイル画像取得を並行処理
    await Promise.all(
      projectList
        .filter(project => project.isDirectory)
        .map(async project => {
          const projectCard = createProjectCard(project);
          projectsContainer.appendChild(projectCard);

          // サムネイル画像取得処理
          await getThumbnailImage(`/projects/${project.name}`, projectCard.querySelector('.image-placeholder'));
        })
    );
  } catch (error) {
    console.error('プロジェクト一覧の取得に失敗しました', error);
    showNotification('プロジェクト一覧の取得に失敗しました。');
  }
}

// プロジェクトカードを作成する関数
function createProjectCard(project) {
  const projectCard = document.createElement('div');
  projectCard.classList.add('card');
  projectCard.dataset.projectId = project.name;

  const imagePlaceholder = document.createElement('div');
  imagePlaceholder.classList.add('image-placeholder');
  projectCard.appendChild(imagePlaceholder);

  const projectName = document.createElement('p');
  projectName.textContent = project.name;
  projectCard.appendChild(projectName);

  projectCard.addEventListener('click', () => {
    window.location.href = `/project/${project.name}`;
  });

  return projectCard;
}

// サムネイル画像を取得して表示する関数
async function getThumbnailImage(projectPath, imageContainer) {
  try {
    const directoryList = await fetchJSON(`/directory?path=${projectPath}`);

    for (const item of directoryList) {
      if (item.isDirectory) {
        // ディレクトリ内の画像ファイルを取得
        const imageList = await fetchJSON(`/directory?path=${projectPath}/${item.name}`);
        
        const selectedImage = imageList.find(image => !image.isDirectory);
        if (selectedImage) {
          displayImage(projectPath, item.name, selectedImage.name, imageContainer);
          return; // 最初に見つけた画像を表示して終了
        }
      } else if (!item.isDirectory) {
        // プロジェクトルートに画像がある場合
        displayImage(projectPath, '', item.name, imageContainer);
        return; // 最初に見つけた画像を表示して終了
      }
    }

    console.warn('プロジェクト内に画像が見つかりませんでした');
  } catch (error) {
    console.error('サムネイル画像の取得に失敗しました', error);
  }
}


// 画像を表示する関数
async function displayImage(projectPath, labelName, imageName, imageContainer) {
  try {
    const imageUrl = `/images?path=${projectPath}/${labelName}/${imageName}`;
    const img = await fetchImage(imageUrl);

    imageContainer.innerHTML = ''; // 既存の画像をクリア
    imageContainer.appendChild(img);
  } catch (error) {
    console.error('画像の取得に失敗しました', error);
    alert('画像の取得に失敗しました');
  }
}

// JSONを取得する汎用関数
async function fetchJSON(url) {
  const response = await fetch(`${API_BASE_URL}${url}`);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return await response.json();
}

// 画像を取得する汎用関数
async function fetchImage(url) {
  const response = await fetch(`${API_BASE_URL}${url}`);
  if (!response.ok) throw new Error(`Failed to fetch image at ${url}`);
  const blob = await response.blob();

  const img = document.createElement('img');
  img.src = URL.createObjectURL(blob);
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';

  return img;
}

// イベントリスナーをセットアップする関数
function setupEventListeners() {
  const imageGrid = document.getElementById('imageGrid');
  if (imageGrid) {
    imageGrid.addEventListener('mouseover', handleImageMouseOver);
    imageGrid.addEventListener('mouseout', handleImageMouseOut);
  }

  const newProjectButton = document.getElementById('newProjectButton');
  const createNewProjectButton = document.getElementById('createNewProjectButton');
  const createProjectForm = document.querySelector('.create-project-form');

  newProjectButton.addEventListener('click', () => {
    toggleElementDisplay(createProjectForm);
  });

  createNewProjectButton.addEventListener('click', createNewProject);

  const hamburgerMenu = document.getElementById('hamburgerMenu');
  const menu = document.getElementById('menu');
  hamburgerMenu.addEventListener('click', () => {
    toggleElementDisplay(menu);
  });

  const projectLink = document.getElementById('projectLink');
  const settingLink = document.getElementById('settingLink');
  const homeLink = document.getElementById('homeLink');

  projectLink.addEventListener('click', () => switchContent('project'));
  settingLink.addEventListener('click', () => switchContent('setting'));
  homeLink.addEventListener('click', () => { window.location.href = '/'; });
}

// 画像のホバーイベント処理
function handleImageMouseOver(event) {
  const imageCard = event.target.closest('.image-card');
  if (imageCard) {
    const imageNameSpan = imageCard.querySelector('.image-name');
    imageNameSpan.textContent = imageCard.dataset.imageName;
    imageNameSpan.style.display = 'block';
  }
}

function handleImageMouseOut(event) {
  const imageCard = event.target.closest('.image-card');
  if (imageCard) {
    const imageNameSpan = imageCard.querySelector('.image-name');
    imageNameSpan.style.display = 'none';
  }
}

// 新しいプロジェクトを作成する関数
async function createNewProject() {
  const newProjectNameInput = document.getElementById('newProjectName');
  const createProjectForm = document.querySelector('.create-project-form');
  const newProjectName = newProjectNameInput.value.trim();

  if (!newProjectName) {
    alert('プロジェクト名を入力してください');
    return;
  }

  try {
    const response = await fetch('/project/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName: newProjectName })
    });

    if (!response.ok) throw new Error('プロジェクトの作成に失敗しました');

    alert('プロジェクトが作成されました');
    await displayProjects();
    newProjectNameInput.value = '';
    createProjectForm.style.display = 'none';
  } catch (error) {
    console.error('プロジェクトの作成に失敗しました', error);
    alert('プロジェクトの作成に失敗しました');
  }
}

// コンテンツを切り替える関数
function switchContent(content) {
  const projectLink = document.getElementById('projectLink');
  const settingLink = document.getElementById('settingLink');
  const projectContentDiv = document.getElementById('projectContent');
  const settingContentDiv = document.getElementById('settingContent');

  if (content === 'project') {
    projectLink.classList.add('active');
    settingLink.classList.remove('active');
    projectContentDiv.style.display = 'block';
    settingContentDiv.style.display = 'none';
  } else {
    projectLink.classList.remove('active');
    settingLink.classList.add('active');
    projectContentDiv.style.display = 'none';
    settingContentDiv.style.display = 'block';
  }
}

// 要素の表示・非表示を切り替える関数
function toggleElementDisplay(element) {
  element.style.display = element.style.display === 'block' ? 'none' : 'block';
}

// APIのベースURLを設定
const API_BASE_URL = 'http://localhost:3000'; 