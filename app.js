// ================= CONFIGURAÇÃO DO FIREBASE =================
const firebaseConfig = {
    apiKey: "AIzaSyAfG1gFI4SoEdttmhwORZt92_9bgqJcsgw",
    authDomain: "call-9cc3b.firebaseapp.com",
    databaseURL: "https://call-9cc3b-default-rtdb.firebaseio.com",
    projectId: "call-9cc3b",
    storageBucket: "call-9cc3b.firebasestorage.app",
    messagingSenderId: "919168566449",
    appId: "1:919168566449:web:b57c4c4020bf3cace30e90",
    measurementId: "G-GYBCF1LG64"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Variáveis de controle de sala multiplayer
let currentRoomCode = null;
let mySymbol = null; // 'X' ou 'O'
let currentTurn = 'X';
let playerNickname = "";

// ================= INTERFACE E NAVEGAÇÃO =================
function switchTab(tabId) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => btn.getAttribute('onclick').includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');
    
    closeGames();
    leaveRoom();
}

function closeGames() {
    document.getElementById('games-menu').style.display = 'grid';
    document.getElementById('snake-arena').style.display = 'none';
    document.getElementById('forca-arena').style.display = 'none';
    if (snakeInterval) clearInterval(snakeInterval);
}

// ================= COBRINHA (SNAKE) SINGLEPLAYER =================
let snakeCanvas = document.getElementById('snakeCanvas');
let ctx = snakeCanvas ? snakeCanvas.getContext('2d') : null;
let snake, food, dx, dy, score, snakeInterval;
const box = 20;

function startSnake() {
    document.getElementById('games-menu').style.display = 'none';
    document.getElementById('snake-arena').style.display = 'block';
    snake = [{x: 200, y: 200}];
    generateFood();
    dx = box; dy = 0; score = 0;
    document.getElementById('snake-score').innerText = score;
    clearInterval(snakeInterval);
    snakeInterval = setInterval(updateSnake, 100);
}

function generateFood() {
    food = { x: Math.floor(Math.random() * 20) * box, y: Math.floor(Math.random() * 20) * box };
}

document.addEventListener('keydown', (e) => {
    if(e.key === 'ArrowUp' && dy === 0) { dx = 0; dy = -box; }
    if(e.key === 'ArrowDown' && dy === 0) { dx = 0; dy = box; }
    if(e.key === 'ArrowLeft' && dx === 0) { dx = -box; dy = 0; }
    if(e.key === 'ArrowRight' && dx === 0) { dx = box; dy = 0; }
});

function updateSnake() {
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    if(head.x < 0 || head.x >= 400 || head.y < 0 || head.y >= 400 || snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        alert('Fim de Jogo! Pontos: ' + score);
        startSnake();
        return;
    }
    snake.unshift(head);
    if(head.x === food.x && head.y === food.y) {
        score += 10;
        document.getElementById('snake-score').innerText = score;
        generateFood();
    } else {
        snake.pop();
    }
    ctx.fillStyle = '#121214';
    ctx.fillRect(0, 0, 400, 400);
    ctx.fillStyle = '#ff4757';
    ctx.fillRect(food.x, food.y, box - 2, box - 2);
    ctx.fillStyle = '#8257e5';
    snake.forEach(seg => ctx.fillRect(seg.x, seg.y, box - 2, box - 2));
}

// ================= JOGO DA FORCA SINGLEPLAYER =================
const listaPalavras = ['REACT', 'NODEJS', 'MINECRAFT', 'JAVASCRIPT', 'ARCADE'];
let palavraEscolhida, letrasDescobertas, vidas;

function startForca() {
    document.getElementById('games-menu').style.display = 'none';
    document.getElementById('forca-arena').style.display = 'block';
    palavraEscolhida = listaPalavras[Math.floor(Math.random() * listaPalavras.length)];
    letrasDescobertas = Array(palavraEscolhida.length).fill('_');
    vidas = 6;
    document.getElementById('forca-lives').innerText = vidas;
    updateForcaDisplay();
    generateKeyboard();
}

function updateForcaDisplay() {
    document.getElementById('word-display').innerText = letrasDescobertas.join(' ');
}

function generateKeyboard() {
    const kb = document.getElementById('keyboard');
    kb.innerHTML = '';
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letra => {
        let btn = document.createElement('button');
        btn.innerText = letra;
        btn.className = 'key-btn';
        btn.onclick = () => guessLetter(letra, btn);
        kb.appendChild(btn);
    });
}

function guessLetter(letra, btn) {
    btn.disabled = true;
    if(palavraEscolhida.includes(letra)) {
        for(let i = 0; i < palavraEscolhida.length; i++) {
            if(palavraEscolhida[i] === letra) letrasDescobertas[i] = letra;
        }
        updateForcaDisplay();
        if(!letrasDescobertas.includes('_')) {
            alert('Parabéns! Você acertou!');
            startForca();
        }
    } else {
        vidas--;
        document.getElementById('forca-lives').innerText = vidas;
        if(vidas <= 0) {
            alert('Fim de jogo! A palavra era: ' + palavraEscolhida);
            startForca();
        }
    }
}

// ================= LÓGICA MULTIPLAYER (FIREBASE) =================

// Criar uma nova sala no Banco de Dados
function createRoom() {
    playerNickname = document.getElementById('username').value.trim();
    if (!playerNickname) return alert('Insira seu apelido primeiro!');

    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    currentRoomCode = code;
    mySymbol = 'X'; // O criador da sala sempre joga com 'X'

    const roomRef = database.ref('rooms/' + code);
    roomRef.set({
        game: document.getElementById('game-select').value,
        player1: playerNickname,
        player2: "",
        turn: 'X',
        board: Array(9).fill(""),
        status: "waiting"
    }).then(() => {
        setupRoomListener(code);
        showArena(code);
    });
}

// Entrar em uma sala existente
function joinRoom() {
    playerNickname = document.getElementById('username').value.trim();
    const code = document.getElementById('room-code').value.trim().toUpperCase();
    
    if (!playerNickname || !code) return alert('Preencha seu apelido e o código da sala!');

    const roomRef = database.ref('rooms/' + code);
    roomRef.once('value', (snapshot) => {
        if (!snapshot.exists()) {
            alert('Sala não encontrada!');
            return;
        }
        const data = snapshot.val();
        if (data.player2 !== "") {
            alert('Esta sala já está cheia!');
            return;
        }

        mySymbol = 'O'; // Quem entra é o 'O'
        roomRef.update({
            player2: playerNickname,
            status: "playing"
        }).then(() => {
            currentRoomCode = code;
            setupRoomListener(code);
            showArena(code);
        });
    });
}

// Atualizar a interface mudando do menu para o jogo
function showArena(code) {
    document.getElementById('lobby-menu').style.display = 'none';
    document.getElementById('multiplayer-arena').style.display = 'block';
    document.getElementById('display-room-code').innerText = code;
}

// Ficar escutando as mudanças na sala em tempo real
function setupRoomListener(code) {
    const roomRef = database.ref('rooms/' + code);
    
    roomRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        currentTurn = data.turn;

        // Gerenciar textos de status
        if (data.status === "waiting") {
            document.getElementById('player-status').innerText = `Aguardando oponente... Seu símbolo: ${mySymbol}`;
            document.getElementById('turn-indicator').innerText = "";
        } else if (data.status === "playing") {
            document.getElementById('player-status').innerText = `Partida contra: ${mySymbol === 'X' ? data.player2 : data.player1} (Você é: ${mySymbol})`;
            document.getElementById('turn-indicator').innerText = currentTurn === mySymbol ? "Sua vez de jogar!" : "Vez do oponente...";
        }

        // Atualizar o tabuleiro visualmente
        const cells = document.querySelectorAll('.velha-cell');
        data.board.forEach((val, index) => {
            cells[index].innerText = val;
            cells[index].disabled = val !== "" || data.status !== "playing" || currentTurn !== mySymbol;
        });

        // Verificar vencedores localmente baseado no banco de dados
        checkWinner(data.board, data.player1, data.player2);
    });
}

// Ação de clique em uma casa do Jogo da Velha
document.querySelectorAll('.velha-cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
        const index = e.target.getAttribute('data-index');
        
        if (currentTurn !== mySymbol || !currentRoomCode) return;

        const roomRef = database.ref('rooms/' + currentRoomCode);
        roomRef.once('value', (snapshot) => {
            const data = snapshot.val();
            if (data.board[index] === "") {
                data.board[index] = mySymbol;
                // Alterna o turno
                const nextTurn = mySymbol === 'X' ? 'O' : 'X';
                
                roomRef.update({
                    board: data.board,
                    turn: nextTurn
                });
            }
        });
    });
});

// Checar condições de vitória
function checkWinner(board, p1, p2) {
    const winPatterns = [
        [0,1,2], [3,4,5], [6,7,8], // Linhas
        [0,3,6], [1,4,7], [2,5,8], // Colunas
        [0,4,8], [2,4,6]           // Diagonais
    ];

    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            const vencedor = board[a] === 'X' ? p1 : p2;
            alert(`Fim de Jogo! O vencedor foi: ${vencedor} (${board[a]})`);
            resetMatch();
            return;
        }
    }

    if (!board.includes("")) {
        alert("Deu Empate!");
        resetMatch();
    }
}

// Reiniciar o tabuleiro no banco de dados para nova partida
function resetMatch() {
    if (!currentRoomCode) return;
    database.ref('rooms/' + currentRoomCode).update({
        board: Array(9).fill(""),
        turn: 'X'
    });
}

// Sair da sala atual e apagar ou limpar dados
function leaveRoom() {
    if (currentRoomCode) {
        database.ref('rooms/' + currentRoomCode).off(); // Desliga o listener em tempo real
        currentRoomCode = null;
    }
    document.getElementById('lobby-menu').style.display = 'block';
    document.getElementById('multiplayer-arena').style.display = 'none';
}

