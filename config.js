const firebaseConfig = {
    apiKey: "AIzaSyAMHAKVot044psR421B_t-Ht5EmsueVS8A",
    authDomain: "game-dev-space.firebaseapp.com",
    databaseURL: "https://game-dev-space-default-rtdb.firebaseio.com",
    projectId: "game-dev-space",
    storageBucket: "game-dev-space.firebasestorage.app",
    messagingSenderId: "1073185335190",
    appId: "1:1073185335190:web:ae9ffd88cdf89f53cbdfb7"
};

// Inicializa Firebase apenas se não houver outra instância
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const ADMIN = "contapropredro@gmail.com";

// Função para sanitizar textos e evitar XSS
function sanitize(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// Scanner de "IA" simples para arquivos maliciosos
async function scanForMalware(content) {
    const forbidden = [
        /document\.cookie/gi, 
        /localStorage\.clear/gi, 
        /parent\.location/gi, 
        /<script.*src.*http/gi,
        /eval\(/gi
    ];
    for (let pattern of forbidden) {
        if (pattern.test(content)) return false;
    }
    return true;
}
