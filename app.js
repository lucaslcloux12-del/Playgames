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

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentRoomCode = null;
let myRole = null; // 'P1', 'P2', ou 'Espectador'
let playerNickname = "";
let selectedChessIndex = null; // Controle local do clique de xadrez

// Tabuleiro Inicial de Xadrez (Matriz convertida em Array linear de 64 posições)
const initialChessBoard = [
    '♜','♞','♝','♛','♚','♝','♞','♜',
    '♟','♟','♟','♟','♟','♟','♟','♟',
    '','','','','','','','',
    '','','','','','','','',
    '','','','','','','','',
    '','','','','','','','',
    '♙','♙','♙','♙','♙','♙','♙','♙',
    '♖','♘','♗','♕','♔','♗','♘','♖'
];

// ================= INTERFACE & SYSTEM TABS =================
function switchTab(tabId) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    closeGames();
    leaveRoom();
}

function closeGames() {
    document.getElementById('games-menu').style.display = 'grid';
    document.getElementById('snake-arena').style.display = 'none';
    document.getElementById('forca-arena').style.display = 'none';
    if (typeof snakeInterval !== 'undefined') clearInterval(snakeInterval);
}

// ================= SINGLEPLAYER GAMES (SNAKE & FORCA) =================
let snakeCanvas = document.getElementById('snakeCanvas');
let ctx = snakeCanvas ? snakeCanvas.getContext('2d') : null;
let snake, food, dx, dy, score, snakeInterval; const box = 20;

function startSnake() {
    document.getElementById('games-menu').style.display = 'none';
    document.getElementById('snake-arena').style.display = 'block';
    snake = [{x: 200, y: 200}]; generateFood(); dx = box; dy = 0; score = 0;
    document.getElementById('snake-score').innerText = score;
    clearInterval(snakeInterval); snakeInterval = setInterval(updateSnake, 120);
}
function generateFood() { food = { x: Math.floor(Math.random() * 20) * box, y: Math.floor(Math.random() * 20) * box }; }
document.addEventListener('keydown', (e) => {
    if(e.key === 'ArrowUp' && dy === 0) { dx = 0; dy = -box; } if(e.key === 'ArrowDown' && dy === 0) { dx = 0; dy = box; }
    if(e.key === 'ArrowLeft' && dx === 0) { dx = -box; dy = 0; } if(e.key === 'ArrowRight' && dx === 0) { dx = box; dy = 0; }
});
function updateSnake() {
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    if(head.x < 0 || head.x >= 400 || head.y < 0 || head.y >= 400 || snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        alert('Fim de Jogo Sp! Pontos: ' + score); startSnake(); return;
    }
    snake.unshift(head);
    if(head.x === food.x && head.y === food.y) { score += 10; document.getElementById('snake-score').innerText = score; generateFood(); } else { snake.pop(); }
    ctx.fillStyle = '#121214'; ctx.fillRect(0, 0, 400, 400);
    ctx.fillStyle = '#ff4757'; ctx.fillRect(food.x, food.y, box - 2, box - 2);
    ctx.fillStyle = '#8257e5'; snake.forEach(seg => ctx.fillRect(seg.x, seg.y, box - 2, box - 2));
}

const listaPalavras = ['REACT', 'MINECRAFT', 'NODEJS', 'WEBDEVELOPER'];
let palSP, descSP, vidasSP;
function startForca() {
    document.getElementById('games-menu').style.display = 'none'; document.getElementById('forca-arena').style.display = 'block';
    palSP = listaPalavras[Math.floor(Math.random() * listaPalavras.length)]; descSP = Array(palSP.length).fill('_'); vidasSP = 6;
    document.getElementById('forca-lives').innerText = vidasSP; document.getElementById('word-display').innerText = descSP.join(' ');
    const kb = document.getElementById('keyboard'); kb.innerHTML = '';
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letra => {
        let b = document.createElement('button'); b.innerText = letra; b.className = 'key-btn';
        b.onclick = () => {
            b.disabled = true;
            if(palSP.includes(letra)) {
                for(let i=0; i<palSP.length; i++) if(palSP[i]===letra) descSP[i]=letra;
                document.getElementById('word-display').innerText = descSP.join(' ');
                if(!descSP.includes('_')) { alert('Venceu!'); startForca(); }
            } else {
                vidasSP--; document.getElementById('forca-lives').innerText = vidasSP;
                if(vidasSP<=0) { alert('Perdeu! Era: '+palSP); startForca(); }
            }
        };
        kb.appendChild(b);
    });
}

// ================= ENGINE MULTIPLAYER COMPLETA (FIREBASE) =================

function createRoom() {
    playerNickname = document.getElementById('username').value.trim();
    if (!playerNickname) return alert('Insira seu apelido!');

    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    currentRoomCode = code;
    myRole = 'P1'; // Criador é sempre Player 1

    const gameMode = document.getElementById('game-select').value;
    const roomRef = database.ref('rooms/' + code);

    roomRef.set({
        game: gameMode,
        turn: 'P1', 
        board: gameMode === 'xadrez' ? initialChessBoard : Array(9).fill(""),
        coopWord: gameMode === 'forca-coop' ? 'JAVASCRIPT' : '',
        coopDiscovered: gameMode === 'forca-coop' ? Array('JAVASCRIPT'.length).fill('_') : '',
        coopLives: 6,
        status: "open"
    }).then(() => {
        // Adiciona usuário na lista de membros da sala
        roomRef.child('players').child(playerNickname).set(myRole);
        setupRoomListener(code);
        showArena(code, gameMode);
    });
}

function joinRoom() {
    playerNickname = document.getElementById('username').value.trim();
    const code = document.getElementById('room-code').value.trim().toUpperCase();
    if (!playerNickname || !code) return alert('Preencha os campos!');

    const roomRef = database.ref('rooms/' + code);
    roomRef.once('value', (snapshot) => {
        if (!snapshot.exists()) return alert('Sala não encontrada!');
        
        const data = snapshot.val();
        const currentPlayers = data.players ? Object.keys(data.players) : [];

        // Atribuição de papel dinâmico (>2 pessoas)
        if (currentPlayers.includes(playerNickname)) {
            myRole = data.players[playerNickname];
        } else if (currentPlayers.length === 1) {
            myRole = 'P2'; // Segundo a entrar vira Player 2
        } else {
            myRole = 'Espectador'; // Terceiro em diante vira Espectador!
        }

        roomRef.child('players').child(playerNickname).set(myRole).then(() => {
            currentRoomCode = code;
            setupRoomListener(code);
            showArena(code, data.game);
        });
    });
}

function showArena(code, gameMode) {
    document.getElementById('lobby-menu').style.display = 'none';
    document.getElementById('multiplayer-arena').style.display = 'block';
    document.getElementById('display-room-code').innerText = code;

    // Oculta todas sub-arenas multiplayer antes de abrir a correta
    document.querySelectorAll('.mp-subgrid').forEach(el => el.style.display = 'none');
    if(gameMode === 'velha') document.getElementById('multi-velha').style.display = 'block';
    if(gameMode === 'xadrez') {
        document.getElementById('multi-xadrez').style.display = 'block';
        buildChessBoardDOM();
    }
    if(gameMode === 'forca-coop') document.getElementById('multi-forca-coop').style.display = 'block';
}

function setupRoomListener(code) {
    const roomRef = database.ref('rooms/' + code);
    roomRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // 1. Renderiza lista de pessoas na sala (Mais de 2 pessoas visíveis)
        const playerNames = Object.keys(data.players || {});
        document.getElementById('room-players-list').innerText = playerNames.map(name => `${name} (${data.players[name]})`).join(', ');

        // 2. Define o status do jogador atual
        document.getElementById('player-status').innerText = `Seu Papel: ${myRole}`;
        
        if (data.game === 'forca-coop') {
            document.getElementById('turn-indicator').innerText = "Modo Cooperativo! Todos podem chutar juntos.";
            renderMultiForca(data);
        } else {
            document.getElementById('turn-indicator').innerText = (data.turn === myRole) ? "Sua vez de jogar!" : "Aguardando jogada do oponente...";
            if (data.game === 'velha') renderMultiVelha(data);
            if (data.game === 'xadrez') renderMultiXadrez(data);
        }
    });
}

// ================= MULTIPLAYER: JOGO DA VELHA =================
function renderMultiVelha(data) {
    const cells = document.querySelectorAll('.velha-cell');
    data.board.forEach((val, i) => {
        cells[i].innerText = val;
        cells[i].disabled = val !== "" || data.turn !== myRole || myRole === 'Espectador';
    });
}

document.querySelectorAll('.velha-cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
        const idx = e.target.getAttribute('data-index');
        if (!currentRoomCode || myRole === 'Espectador') return;

        const roomRef = database.ref('rooms/' + currentRoomCode);
        roomRef.once('value', (snap) => {
            const data = snap.val();
            if (data.turn !== myRole || data.board[idx] !== "") return;

            data.board[idx] = (myRole === 'P1') ? 'X' : 'O';
            data.turn = (myRole === 'P1') ? 'P2' : 'P1';

            roomRef.update({ board: data.board, turn: data.turn });
            checkMpVelhaWinner(data.board);
        });
    });
});

function checkMpVelhaWinner(b) {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let p of wins) {
        if (b[p[0]] && b[p[0]] === b[p[1]] && b[p[0]] === b[p[2]]) {
            alert(`Fim de jogo! Símbolo vencedor: ${b[p[0]]}`);
            database.ref('rooms/' + currentRoomCode).update({ board: Array(9).fill(""), turn: 'P1' });
            return;
        }
    }
}

// ================= MULTIPLAYER: XADREZ (SANDBOX SYNC) =================
function buildChessBoardDOM() {
    const boardDOM = document.getElementById('chess-board');
    boardDOM.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const cell = document.createElement('button');
        cell.className = `chess-cell ${((Math.floor(i/8) + i) % 2 === 0) ? 'light' : 'dark'}`;
        cell.setAttribute('data-idx', i);
        cell.onclick = () => handleChessClick(i);
        boardDOM.appendChild(cell);
    }
}

function renderMultiXadrez(data) {
    const cells = document.querySelectorAll('.chess-cell');
    data.board.forEach((piece, i) => {
        cells[i].innerText = piece;
        // Desativa cliques visuais se não for seu turno ou for espectador
        cells[i].disabled = (data.turn !== myRole || myRole === 'Espectador');
    });
}

function handleChessClick(idx) {
    if (!currentRoomCode || myRole === 'Espectador') return;

    const roomRef = database.ref('rooms/' + currentRoomCode);
    roomRef.once('value', (snap) => {
        const data = snap.val();
        if (data.turn !== myRole) return;

        const cells = document.querySelectorAll('.chess-cell');

        if (selectedChessIndex === null) {
            // Primeiro clique: Selecionar a peça de origem
            if (data.board[idx] === "") return; // Casa vazia não seleciona
            selectedChessIndex = idx;
            cells[idx].classList.add('selected');
        } else {
            // Segundo clique: Mover para o destino escolhido
            const originIdx = selectedChessIndex;
            cells[originIdx].classList.remove('selected');
            selectedChessIndex = null;

            if (originIdx === idx) return; // Clicou na mesma casa, cancela

            // Executa o movimento no array do banco
            data.board[idx] = data.board[originIdx];
            data.board[originIdx] = "";
            
            // Passa o turno de jogo
            data.turn = (myRole === 'P1') ? 'P2' : 'P1';

            roomRef.update({ board: data.board, turn: data.turn });
        }
    });
}

// ================= MULTIPLAYER: FORCA COOPERATIVA (ILIMITADOS PLAYERS) =================
function renderMultiForca(data) {
    document.getElementById('coop-lives').innerText = data.coopLives;
    document.getElementById('coop-word-display').innerText = data.coopDiscovered.join(' ');

    const kb = document.getElementById('coop-keyboard');
    kb.innerHTML = '';
    
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letra => {
        let b = document.createElement('button');
        b.innerText = letra;
        b.className = 'key-btn';
        // Se a letra já foi usada (vamos descobrir olhando se está revelada ou se erraram)
        // Para simplificar: botões ficam sempre ativos até alguém clicar
        b.onclick = () => makeCoopGuess(letra);
        kb.appendChild(b);
    });
}

function makeCoopGuess(letra) {
    if (!currentRoomCode) return;
    const roomRef = database.ref('rooms/' + currentRoomCode);

    roomRef.once('value', (snap) => {
        const data = snap.val();
        let acertou = false;
        let word = data.coopWord;

        if (word.includes(letra)) {
            for (let i = 0; i < word.length; i++) {
                if (word[i] === letra && data.coopDiscovered[i] === '_') {
                    data.coopDiscovered[i] = letra;
                    acertou = true;
                }
            }
        }

        if (acertou) {
            roomRef.update({ coopDiscovered: data.coopDiscovered });
            if (!data.coopDiscovered.includes('_')) {
                alert('Vitória Coletiva! A sala inteira ganhou!');
                roomRef.update({ coopDiscovered: Array(word.length).fill('_'), coopLives: 6 });
            }
        } else {
            let novasVidas = data.coopLives - 1;
            roomRef.update({ coopLives: novasVidas });
            if (novasVidas <= 0) {
                alert(`Fim de jogo coletivo! A palavra era: ${word}`);
                roomRef.update({ coopDiscovered: Array(word.length).fill('_'), coopLives: 6 });
            }
        }
    });
}

// ================= FINALIZAR/SAIR DA SALA =================
function leaveRoom() {
    if (currentRoomCode) {
        database.ref('rooms/' + currentRoomCode + '/players/' + playerNickname).remove();
        database.ref('rooms/' + currentRoomCode).off();
        currentRoomCode = null;
    }
    document.getElementById('lobby-menu').style.display = 'block';
    document.getElementById('multiplayer-arena').style.display = 'none';
}
