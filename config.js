// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAMHAKVot044psR421B_t-Ht5EmsueVS8A",
  authDomain: "game-dev-space.firebaseapp.com",
  databaseURL: "https://game-dev-space-default-rtdb.firebaseio.com",
  projectId: "game-dev-space",
  storageBucket: "game-dev-space.firebasestorage.app",
  messagingSenderId: "1073185335190",
  appId: "1:1073185335190:web:ae9ffd88cdf89f53cbdfb7"
};

// AI Configuration (placeholder - replace with actual API key)
const AI_CONFIG = {
  // For image generation, you can use services like:
  // - OpenAI DALL-E
  // - Stability AI
  // - Replicate
  enabled: true,
  placeholder: true // Set to false when using real AI
};

// App Configuration
const APP_CONFIG = {
  appName: "GameDev Space",
  version: "1.0.0",
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.mp3', '.wav', '.ogg'],
  gamesPerPage: 12
};
