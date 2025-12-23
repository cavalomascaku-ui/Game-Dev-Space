// Game Dev Space - Main Application Logic

// Firebase imports and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  getDatabase, 
  ref, 
  push, 
  set, 
  get, 
  update, 
  onValue, 
  query, 
  orderByChild,
  remove
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

// App State
let currentUser = null;
let games = [];
let uploadedFiles = [];
let coverImageFile = null;
let generatedCoverUrl = null;

// DOM Elements
const elements = {
  gamesGrid: document.getElementById('gamesGrid'),
  featuredGrid: document.getElementById('featuredGrid'),
  loginModal: document.getElementById('loginModal'),
  registerModal: document.getElementById('registerModal'),
  uploadModal: document.getElementById('uploadModal'),
  gamePlayerModal: document.getElementById('gamePlayerModal'),
  gameDetailModal: document.getElementById('gameDetailModal'),
  searchInput: document.getElementById('searchInput'),
  userSection: document.getElementById('userSection'),
  authButtons: document.getElementById('authButtons'),
  toastContainer: document.getElementById('toastContainer')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initSnowflakes();
  initChristmasLights();
  setupEventListeners();
  loadGames();
  
  // Auth State Observer
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      updateUIForLoggedInUser(user);
    } else {
      currentUser = null;
      updateUIForLoggedOutUser();
    }
  });
});

// Create Snowflakes
function initSnowflakes() {
  const bg = document.querySelector('.animated-bg');
  const snowflakeChars = ['*', '+'];
  
  for (let i = 0; i < 50; i++) {
    const snowflake = document.createElement('div');
    snowflake.className = 'snowflake';
    snowflake.innerHTML = snowflakeChars[Math.floor(Math.random() * snowflakeChars.length)];
    snowflake.style.left = Math.random() * 100 + '%';
    snowflake.style.animationDuration = (Math.random() * 3 + 5) + 's';
    snowflake.style.animationDelay = Math.random() * 5 + 's';
    snowflake.style.fontSize = (Math.random() * 15 + 10) + 'px';
    bg.appendChild(snowflake);
  }
}

// Create Christmas Lights
function initChristmasLights() {
  const lightsContainer = document.querySelector('.christmas-lights');
  for (let i = 0; i < 30; i++) {
    const bulb = document.createElement('div');
    bulb.className = 'light-bulb';
    lightsContainer.appendChild(bulb);
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Search
  elements.searchInput?.addEventListener('input', debounce(handleSearch, 300));
  
  // Close modals on outside click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal.id);
    });
  });
  
  // File upload drag and drop
  const fileUploadArea = document.getElementById('fileUploadArea');
  if (fileUploadArea) {
    fileUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileUploadArea.classList.add('dragover');
    });
    
    fileUploadArea.addEventListener('dragleave', () => {
      fileUploadArea.classList.remove('dragover');
    });
    
    fileUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      fileUploadArea.classList.remove('dragover');
      handleFileDrop(e.dataTransfer.files);
    });
  }
}

// Authentication Functions
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    showLoading('loginBtn');
    await signInWithEmailAndPassword(auth, email, password);
    closeModal('loginModal');
    showToast('Bem-vindo de volta!', 'success');
  } catch (error) {
    showToast(getErrorMessage(error.code), 'error');
  } finally {
    hideLoading('loginBtn', 'Entrar');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  
  try {
    showLoading('registerBtn');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Save user data to database
    await set(ref(database, 'users/' + userCredential.user.uid), {
      name: name,
      email: email,
      createdAt: Date.now(),
      gamesPublished: 0
    });
    
    closeModal('registerModal');
    showToast('Conta criada com sucesso!', 'success');
  } catch (error) {
    showToast(getErrorMessage(error.code), 'error');
  } finally {
    hideLoading('registerBtn', 'Criar Conta');
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
    showToast('Ate logo!', 'success');
  } catch (error) {
    showToast('Erro ao sair', 'error');
  }
}

// UI Update Functions
function updateUIForLoggedInUser(user) {
  if (elements.authButtons) elements.authButtons.style.display = 'none';
  if (elements.userSection) {
    elements.userSection.style.display = 'flex';
    const avatar = document.getElementById('userAvatar');
    if (avatar) {
      avatar.src = user.photoURL || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=' + user.uid;
    }
  }
}

function updateUIForLoggedOutUser() {
  if (elements.authButtons) elements.authButtons.style.display = 'flex';
  if (elements.userSection) elements.userSection.style.display = 'none';
}

// Game CRUD Operations
async function loadGames() {
  const gamesRef = ref(database, 'games');
  
  onValue(gamesRef, (snapshot) => {
    games = [];
    snapshot.forEach((child) => {
      games.push({ id: child.key, ...child.val() });
    });
    
    // Sort by views/likes for featured
    const featured = [...games].sort((a, b) => (b.views + b.likes) - (a.views + a.likes)).slice(0, 4);
    
    renderGames(games);
    renderFeaturedGames(featured);
  });
}

function renderGames(gamesToRender) {
  if (!elements.gamesGrid) return;
  
  if (gamesToRender.length === 0) {
    elements.gamesGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 50px;">
        <i class="fas fa-gamepad" style="font-size: 4rem; color: var(--gold); opacity: 0.5;"></i>
        <p style="margin-top: 20px; color: rgba(255,255,255,0.6);">Nenhum jogo encontrado</p>
      </div>
    `;
    return;
  }
  
  elements.gamesGrid.innerHTML = gamesToRender.map(game => createGameCard(game)).join('');
}

function renderFeaturedGames(featured) {
  if (!elements.featuredGrid) return;
  
  elements.featuredGrid.innerHTML = featured.map(game => createGameCard(game, true)).join('');
}

function createGameCard(game, isFeatured = false) {
  const isOwner = currentUser && currentUser.uid === game.authorId;
  const isLiked = currentUser && game.likedBy && game.likedBy[currentUser.uid];
  
  return `
    <div class="game-card ${isFeatured ? 'featured' : ''}" data-id="${game.id}">
      <img src="${game.coverUrl || 'https://via.placeholder.com/400x200/1a5f2a/ffd700?text=Game'}" 
           alt="${game.title}" class="game-thumbnail" onerror="this.src='https://via.placeholder.com/400x200/1a5f2a/ffd700?text=Game'">
      ${isFeatured ? '<div style="position:absolute;top:10px;right:10px;background:var(--gold);color:var(--dark);padding:5px 10px;border-radius:15px;font-size:0.8rem;font-weight:700;"><i class="fas fa-star"></i> Destaque</div>' : ''}
      <div class="game-info">
        <h3 class="game-title">${escapeHtml(game.title)}</h3>
        <p class="game-description">${escapeHtml(game.description)}</p>
        <div class="game-stats">
          <span class="stat"><i class="fas fa-eye"></i> ${formatNumber(game.views || 0)}</span>
          <span class="stat"><i class="fas fa-heart"></i> ${formatNumber(game.likes || 0)}</span>
          <span class="stat"><i class="fas fa-comment"></i> ${formatNumber(game.commentsCount || 0)}</span>
        </div>
        <p class="game-author"><i class="fas fa-user"></i> ${escapeHtml(game.authorName)}</p>
        <div class="game-actions">
          <button class="action-btn play-btn" onclick="playGame('${game.id}')">
            <i class="fas fa-play"></i> Jogar
          </button>
          <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${game.id}')">
            <i class="fas fa-heart"></i>
          </button>
          ${isOwner ? `<button class="action-btn" style="background:var(--gold);color:var(--dark);" onclick="editGame('${game.id}')"><i class="fas fa-edit"></i></button>` : ''}
        </div>
      </div>
    </div>
  `;
}

// Upload Game
async function handleGameUpload(e) {
  e.preventDefault();
  
  if (!currentUser) {
    showToast('Faca login para publicar um jogo', 'error');
    return;
  }
  
  const title = document.getElementById('gameTitle').value;
  const description = document.getElementById('gameDescription').value;
  
  if (uploadedFiles.length === 0) {
    showToast('Adicione pelo menos um arquivo', 'error');
    return;
  }
  
  const hasHtml = uploadedFiles.some(f => f.name.endsWith('.html'));
  if (!hasHtml) {
    showToast('Adicione um arquivo HTML principal', 'error');
    return;
  }
  
  try {
    showLoading('uploadBtn');
    
    // Create game entry
    const gameRef = push(ref(database, 'games'));
    const gameId = gameRef.key;
    
    // Upload files to storage
    const fileUrls = {};
    for (const file of uploadedFiles) {
      const fileRef = storageRef(storage, `games/${gameId}/${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      fileUrls[file.name] = url;
    }
    
    // Upload cover if exists
    let coverUrl = generatedCoverUrl || null;
    if (coverImageFile) {
      const coverRef = storageRef(storage, `games/${gameId}/cover.png`);
      await uploadBytes(coverRef, coverImageFile);
      coverUrl = await getDownloadURL(coverRef);
    }
    
    // Get user name
    const userSnapshot = await get(ref(database, 'users/' + currentUser.uid));
    const userName = userSnapshot.val()?.name || 'Anonimo';
    
    // Save game data
    await set(gameRef, {
      title,
      description,
      authorId: currentUser.uid,
      authorName: userName,
      files: fileUrls,
      coverUrl,
      views: 0,
      likes: 0,
      commentsCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    // Update user games count
    const currentCount = userSnapshot.val()?.gamesPublished || 0;
    await update(ref(database, 'users/' + currentUser.uid), {
      gamesPublished: currentCount + 1
    });
    
    closeModal('uploadModal');
    resetUploadForm();
    showToast('Jogo publicado com sucesso!', 'success');
    
  } catch (error) {
    console.error(error);
    showToast('Erro ao publicar jogo', 'error');
  } finally {
    hideLoading('uploadBtn', 'Publicar Jogo');
  }
}

// Edit Game
let editingGameId = null;

async function editGame(gameId) {
  if (!currentUser) return;
  
  const game = games.find(g => g.id === gameId);
  if (!game || game.authorId !== currentUser.uid) {
    showToast('Voce nao tem permissao para editar este jogo', 'error');
    return;
  }
  
  editingGameId = gameId;
  
  // Fill form with current data
  document.getElementById('gameTitle').value = game.title;
  document.getElementById('gameDescription').value = game.description;
  
  // Update button text
  document.getElementById('uploadBtn').innerHTML = '<i class="fas fa-save"></i> Atualizar Jogo';
  document.getElementById('uploadModalTitle').innerHTML = '<i class="fas fa-edit"></i> Editar Jogo';
  
  openModal('uploadModal');
}

async function updateGame() {
  if (!editingGameId || !currentUser) return;
  
  const title = document.getElementById('gameTitle').value;
  const description = document.getElementById('gameDescription').value;
  
  try {
    showLoading('uploadBtn');
    
    const updates = {
      title,
      description,
      updatedAt: Date.now()
    };
    
    // Upload new files if any
    if (uploadedFiles.length > 0) {
      const fileUrls = {};
      for (const file of uploadedFiles) {
        const fileRef = storageRef(storage, `games/${editingGameId}/${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        fileUrls[file.name] = url;
      }
      
      // Merge with existing files
      const currentGame = games.find(g => g.id === editingGameId);
      updates.files = { ...currentGame.files, ...fileUrls };
    }
    
    // Update cover if new one
    if (coverImageFile) {
      const coverRef = storageRef(storage, `games/${editingGameId}/cover.png`);
      await uploadBytes(coverRef, coverImageFile);
      updates.coverUrl = await getDownloadURL(coverRef);
    } else if (generatedCoverUrl) {
      updates.coverUrl = generatedCoverUrl;
    }
    
    await update(ref(database, 'games/' + editingGameId), updates);
    
    closeModal('uploadModal');
    resetUploadForm();
    showToast('Jogo atualizado com sucesso!', 'success');
    
  } catch (error) {
    console.error(error);
    showToast('Erro ao atualizar jogo', 'error');
  } finally {
    hideLoading('uploadBtn', 'Atualizar Jogo');
    editingGameId = null;
  }
}

// Play Game
async function playGame(gameId) {
  const game = games.find(g => g.id === gameId);
  if (!game) return;
  
  // Increment views
  await update(ref(database, 'games/' + gameId), {
    views: (game.views || 0) + 1
  });
  
  // Find HTML file
  const htmlFile = Object.keys(game.files).find(f => f.endsWith('.html'));
  if (!htmlFile) {
    showToast('Arquivo HTML nao encontrado', 'error');
    return;
  }
  
  // Open game player modal
  document.getElementById('gamePlayerTitle').textContent = game.title;
  const gameFrame = document.getElementById('gameFrame');
  gameFrame.src = game.files[htmlFile];
  
  // Load comments
  loadComments(gameId);
  
  openModal('gamePlayerModal');
  
  // Store current game ID for comments
  gameFrame.dataset.gameId = gameId;
}

function toggleFullscreen() {
  const container = document.querySelector('.game-frame-container');
  
  if (!document.fullscreenElement) {
    container.requestFullscreen().catch(err => {
      showToast('Erro ao entrar em tela cheia', 'error');
    });
  } else {
    document.exitFullscreen();
  }
}

// Like System
async function toggleLike(gameId) {
  if (!currentUser) {
    showToast('Faca login para curtir', 'error');
    return;
  }
  
  const game = games.find(g => g.id === gameId);
  if (!game) return;
  
  const likeRef = ref(database, `games/${gameId}/likedBy/${currentUser.uid}`);
  const isLiked = game.likedBy && game.likedBy[currentUser.uid];
  
  try {
    if (isLiked) {
      await remove(likeRef);
      await update(ref(database, 'games/' + gameId), {
        likes: Math.max(0, (game.likes || 1) - 1)
      });
    } else {
      await set(likeRef, true);
      await update(ref(database, 'games/' + gameId), {
        likes: (game.likes || 0) + 1
      });
    }
  } catch (error) {
    showToast('Erro ao curtir', 'error');
  }
}

// Comments System
async function loadComments(gameId) {
  const commentsRef = ref(database, `comments/${gameId}`);
  const commentsContainer = document.getElementById('commentsContainer');
  
  onValue(commentsRef, (snapshot) => {
    const comments = [];
    snapshot.forEach(child => {
      comments.push({ id: child.key, ...child.val() });
    });
    
    comments.sort((a, b) => b.createdAt - a.createdAt);
    
    commentsContainer.innerHTML = comments.map(comment => `
      <div class="comment">
        <div class="comment-header">
          <span class="comment-author">${escapeHtml(comment.authorName)}</span>
          <span class="comment-date">${formatDate(comment.createdAt)}</span>
        </div>
        <p class="comment-text">${escapeHtml(comment.text)}</p>
      </div>
    `).join('') || '<p style="color:rgba(255,255,255,0.5);text-align:center;">Nenhum comentario ainda</p>';
  });
}

async function submitComment() {
  if (!currentUser) {
    showToast('Faca login para comentar', 'error');
    return;
  }
  
  const input = document.getElementById('commentInput');
  const text = input.value.trim();
  const gameId = document.getElementById('gameFrame').dataset.gameId;
  
  if (!text || !gameId) return;
  
  try {
    // Get user name
    const userSnapshot = await get(ref(database, 'users/' + currentUser.uid));
    const userName = userSnapshot.val()?.name || 'Anonimo';
    
    // Add comment
    await push(ref(database, `comments/${gameId}`), {
      authorId: currentUser.uid,
      authorName: userName,
      text,
      createdAt: Date.now()
    });
    
    // Update comments count
    const game = games.find(g => g.id === gameId);
    await update(ref(database, 'games/' + gameId), {
      commentsCount: (game.commentsCount || 0) + 1
    });
    
    input.value = '';
    showToast('Comentario adicionado!', 'success');
    
  } catch (error) {
    showToast('Erro ao comentar', 'error');
  }
}

// File Handling
function handleFileSelect(input) {
  handleFileDrop(input.files);
}

function handleFileDrop(files) {
  const fileList = document.getElementById('fileList');
  
  for (const file of files) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!APP_CONFIG.allowedFileTypes.includes(ext)) {
      showToast(`Tipo de arquivo nao permitido: ${ext}`, 'error');
      continue;
    }
    
    if (file.size > APP_CONFIG.maxFileSize) {
      showToast(`Arquivo muito grande: ${file.name}`, 'error');
      continue;
    }
    
    // Check if already added
    if (uploadedFiles.some(f => f.name === file.name)) {
      showToast(`Arquivo ja adicionado: ${file.name}`, 'error');
      continue;
    }
    
    uploadedFiles.push(file);
  }
  
  renderFileList();
}

function renderFileList() {
  const fileList = document.getElementById('fileList');
  
  fileList.innerHTML = uploadedFiles.map((file, index) => `
    <div class="file-item">
      <i class="fas fa-file-code"></i>
      <span>${file.name}</span>
      <button class="remove-file" onclick="removeFile(${index})">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');
}

function removeFile(index) {
  uploadedFiles.splice(index, 1);
  renderFileList();
}

// Cover Image Handling
function handleCoverSelect(input) {
  const file = input.files[0];
  if (file) {
    coverImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('aiPreview').innerHTML = `<img src="${e.target.result}" alt="Cover Preview">`;
    };
    reader.readAsDataURL(file);
  }
}

// AI Cover Generator (using image as base)
async function generateCover() {
  const description = document.getElementById('aiCoverDescription').value;
  const coverInput = document.getElementById('coverImageInput');
  
  if (!coverInput.files[0]) {
    showToast('Selecione uma imagem base primeiro', 'error');
    return;
  }
  
  if (!description) {
    showToast('Descreva as modificacoes desejadas', 'error');
    return;
  }
  
  showToast('Funcionalidade de IA em desenvolvimento. Use a imagem enviada como capa.', 'success');
  
  // For now, just use the uploaded image
  // In a full implementation, this would call an AI API
}

// Search
function handleSearch() {
  const query = elements.searchInput.value.toLowerCase().trim();
  
  if (!query) {
    renderGames(games);
    return;
  }
  
  const filtered = games.filter(game => 
    game.title.toLowerCase().includes(query) ||
    game.description.toLowerCase().includes(query) ||
    game.authorName.toLowerCase().includes(query)
  );
  
  renderGames(filtered);
}

// Modal Functions
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
  
  // Reset game frame if closing player
  if (modalId === 'gamePlayerModal') {
    document.getElementById('gameFrame').src = 'about:blank';
  }
}

function resetUploadForm() {
  document.getElementById('gameTitle').value = '';
  document.getElementById('gameDescription').value = '';
  document.getElementById('aiCoverDescription').value = '';
  uploadedFiles = [];
  coverImageFile = null;
  generatedCoverUrl = null;
  renderFileList();
  document.getElementById('aiPreview').innerHTML = '<i class="fas fa-image" style="font-size:3rem;color:var(--gold);opacity:0.5;"></i>';
  document.getElementById('uploadBtn').innerHTML = '<i class="fas fa-rocket"></i> Publicar Jogo';
  document.getElementById('uploadModalTitle').innerHTML = '<i class="fas fa-gamepad"></i> Publicar Jogo';
  editingGameId = null;
}

// Utility Functions
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    <span>${message}</span>
  `;
  
  elements.toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function showLoading(btnId) {
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div>';
  }
}

function hideLoading(btnId, text) {
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = text;
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getErrorMessage(code) {
  const messages = {
    'auth/email-already-in-use': 'Este email ja esta em uso',
    'auth/invalid-email': 'Email invalido',
    'auth/weak-password': 'Senha muito fraca (minimo 6 caracteres)',
    'auth/user-not-found': 'Usuario nao encontrado',
    'auth/wrong-password': 'Senha incorreta',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde'
  };
  return messages[code] || 'Ocorreu um erro. Tente novamente';
}

function toggleUserDropdown() {
  const dropdown = document.getElementById('userDropdown');
  dropdown.classList.toggle('active');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('userDropdown');
  const userMenu = document.querySelector('.user-menu');
  
  if (dropdown && !userMenu?.contains(e.target)) {
    dropdown.classList.remove('active');
  }
});

// Upload handler wrapper
async function submitGame(e) {
  e.preventDefault();
  
  if (!currentUser) {
    showToast('Faca login para publicar um jogo', 'error');
    return;
  }
  
  if (editingGameId) {
    await updateGame();
  } else {
    const title = document.getElementById('gameTitle').value;
    const description = document.getElementById('gameDescription').value;
    
    if (uploadedFiles.length === 0) {
      showToast('Adicione pelo menos um arquivo', 'error');
      return;
    }
    
    const hasHtml = uploadedFiles.some(f => f.name.endsWith('.html'));
    if (!hasHtml) {
      showToast('Adicione um arquivo HTML principal', 'error');
      return;
    }
    
    try {
      showLoading('uploadBtn');
      
      const gameRef = push(ref(database, 'games'));
      const gameId = gameRef.key;
      
      const fileUrls = {};
      for (const file of uploadedFiles) {
        const fileRef = storageRef(storage, `games/${gameId}/${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        fileUrls[file.name] = url;
      }
      
      let coverUrl = generatedCoverUrl || null;
      if (coverImageFile) {
        const coverRef = storageRef(storage, `games/${gameId}/cover.png`);
        await uploadBytes(coverRef, coverImageFile);
        coverUrl = await getDownloadURL(coverRef);
      }
      
      const userSnapshot = await get(ref(database, 'users/' + currentUser.uid));
      const userName = userSnapshot.val()?.name || 'Anonimo';
      
      await set(gameRef, {
        title,
        description,
        authorId: currentUser.uid,
        authorName: userName,
        files: fileUrls,
        coverUrl,
        views: 0,
        likes: 0,
        commentsCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      const currentCount = userSnapshot.val()?.gamesPublished || 0;
      await update(ref(database, 'users/' + currentUser.uid), {
        gamesPublished: currentCount + 1
      });
      
      closeModal('uploadModal');
      resetUploadForm();
      showToast('Jogo publicado com sucesso!', 'success');
      
    } catch (error) {
      console.error(error);
      showToast('Erro ao publicar jogo', 'error');
    } finally {
      hideLoading('uploadBtn', '<i class="fas fa-rocket"></i> Publicar Jogo');
    }
  }
}

// Make functions globally available
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.handleGameUpload = submitGame;
window.playGame = playGame;
window.editGame = editGame;
window.toggleLike = toggleLike;
window.submitComment = submitComment;
window.handleFileSelect = handleFileSelect;
window.handleCoverSelect = handleCoverSelect;
window.generateCover = generateCover;
window.removeFile = removeFile;
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleFullscreen = toggleFullscreen;
window.toggleUserDropdown = toggleUserDropdown;
