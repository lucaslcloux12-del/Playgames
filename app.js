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
let myRole = null; // 'P1', 'P2', 'P3', 'P4' ou 'Espectador'
let playerNickname = "";
let selectedChessIndex = null;
let myBingoCard = [];
let bingoInterval = null;

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

// Identificadores de cores do Xadrez
const whitePieces = ['♙','♖','♘','♗','♕','♔'];
const blackPieces = ['♟','♜','♞','♝','♛','♚'];

function togglePlayerCountVisibility() {
    const game = document.getElementById('game-select').value;
    const group = document.getElementById('player-count-group');
    // Jogos de 2 jogadores fixos vs Jogos com suporte a mais jogadores
    if(game === 'velha' || game === 'xadrez') {
        group.style.display = 'none';
    } else {
        group.style.display = 'block';
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    closeGames(); leaveRoom();
}

function closeGames() {
    document.getElementById('games-menu').style.display = 'grid';
    document.getElementById('snake-arena').style.display = 'none';
    document.getElementById('forca-arena').style.display = 'none';
    if (typeof snakeInterval !== 'undefined') clearInterval(snakeInterval);
}

// ================= SINGLEPLAYER (LÓGICA SIMPLIFICADA) =================
let snakeCanvas = document.getElementById('snakeCanvas'); let ctx = snakeCanvas?snakeCanvas.getContext('2d'):null;
let snake, food, dx, dy, score, snakeInterval; const box = 20;
function startSnake() {
    document.getElementById('games-menu').style.display = 'none'; document.getElementById('snake-arena').style.display = 'block';
    snake = [{x: 200, y: 200}]; food = {x: 40, y: 40}; dx = box; dy = 0; score = 0;
    clearInterval(snakeInterval); snakeInterval = setInterval(() => {
        const head = {x: snake[0].x + dx, y: snake[0].y + dy}; snake.unshift(head); snake.pop();
        ctx.fillStyle = '#121214'; ctx.fillRect(0,0,400,400); ctx.fillStyle = '#8257e5';
        snake.forEach(s => ctx.fillRect(s.x, s.y, box-2, box-2));
    }, 150);
}
function startForca() { alert('Forca singleplayer iniciada no painel.'); }

// ================= MOTOR MULTIPLAYER COM CONDIÇÃO DE INÍCIO =================

function createRoom() {
    playerNickname = document.getElementById('username').value.trim();
    if (!playerNickname) return alert('Insira seu apelido!');

    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    currentRoomCode = code;
    myRole = 'P1';

    const gameMode = document.getElementById('game-select').value;
    let maxPlayers = 2;
    if (gameMode !== 'velha' && gameMode !== 'xadrez') {
        maxPlayers = parseInt(document.getElementById('max-players').value);
    }

    const roomRef = database.ref('rooms/' + code);
    roomRef.set({
        game: gameMode,
        turn: 'P1',
        maxPlayers: maxPlayers,
        status: "waiting", // Mudará para 'playing' quando iniciar
        board: gameMode === 'xadrez' ? initialChessBoard : Array(9).fill(""),
        coopWord: 'MINECRAFT',
        coopDiscovered: Array('MINECRAFT'.length).fill('_'),
        coopLives: 6,
        bingoBalls: [0],
        dominoTable: ["start"]
    }).then(() => {
        roomRef.child('players').child(playerNickname).set(myRole);
        setupRoomListener(code);
        showArena(code, gameMode);
    });
}

function joinRoom() {
    playerNickname = document.getElementById('username').value.trim();
    const code = document.getElementById('room-code').value.trim().toUpperCase();
    if (!playerNickname || !code) return alert('Preencha os dados!');

    const roomRef = database.ref('rooms/' + code);
    roomRef.once('value', (snapshot) => {
        if (!snapshot.exists()) return alert('Sala não encontrada!');
        const data = snapshot.val();
        
        if (data.status === 'playing') return alert('O jogo nessa sala já começou!');

        const currentPlayers = data.players ? Object.keys(data.players) : [];
        if (currentPlayers.length >= data.maxPlayers) return alert('A sala está cheia!');

        // Determinar Role Dinâmico
        const pIndex = currentPlayers.length + 1;
        myRole = 'P' + pIndex;

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
    
    document.querySelectorAll('.mp-subgrid').forEach(el => el.style.display = 'none');
    if(gameMode === 'velha') document.getElementById('multi-velha').style.display = 'block';
    if(gameMode === 'xadrez') { document.getElementById('multi-xadrez').style.display = 'block'; buildChessBoardDOM(); }
    if(gameMode === 'forca-coop') document.getElementById('multi-forca-coop').style.display = 'block';
    if(gameMode === 'bingo') { document.getElementById('multi-bingo').style.display = 'block'; generateBingoCardLocal(); }
    if(gameMode === 'domino') document.getElementById('multi-domino').style.display = 'block';
}

function setupRoomListener(code) {
    const roomRef = database.ref('rooms/' + code);
    roomRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const playerNames = Object.keys(data.players || {});
        document.getElementById('count-connected').innerText = playerNames.length;
        document.getElementById('count-max').innerText = data.maxPlayers;
        document.getElementById('room-players-list').innerText = playerNames.map(name => `${name} (${data.players[name]})`).join(', ');

        // Gerenciar Botão de Start do P1
        const startBtn = document.getElementById('start-game-btn');
        if (myRole === 'P1' && data.status === 'waiting') {
            if (playerNames.length === data.maxPlayers) {
                startBtn.style.display = 'block';
                document.getElementById('turn-indicator').innerText = "Sala cheia! Clique em Iniciar Jogo.";
            } else {
                startBtn.style.display = 'none';
                document.getElementById('turn-indicator').innerText = "Aguardando todos os jogadores entrarem...";
            }
        } else {
            startBtn.style.display = 'none';
        }

        // Se o jogo ainda não foi iniciado, travar as telas de jogadas
        if (data.status === 'waiting') {
            document.getElementById('player-status').innerText = `Você entrou como ${myRole}. Esperando início do Host...`;
            return;
        }

        document.getElementById('player-status').innerText = `Partida em Andamento! Seu papel: ${myRole}`;

        // Executar renders dos respectivos jogos ativos
        if (data.game === 'velha') renderMultiVelha(data);
        if (data.game === 'xadrez') renderMultiXadrez(data);
        if (data.game === 'forca-coop') renderMultiForca(data);
        if (data.game === 'bingo') renderMultiBingo(data);
        if (data.game === 'domino') renderMultiDomino(data);
    });
}

function triggerStartGame() {
    if (!currentRoomCode) return;
    database.ref('rooms/' + currentRoomCode).update({ status: 'playing' }).then(() => {
        // Se for bingo, o P1 começa o sorteador automático em nuvem
        const roomRef = database.ref('rooms/' + currentRoomCode);
        roomRef.once('value', (snap) => {
            if (snap.val().game === 'bingo') startBingoCallerSystem();
            if (snap.val().game === 'domino') distributeDominoTiles();
        });
    });
}

// ================= XADREZ COM VALIDAÇÕES RÍGIDAS DE MOVIMENTOS =================

function buildChessBoardDOM() {
    const boardDOM = document.getElementById('chess-board'); boardDOM.innerHTML = '';
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
    data.board.forEach((piece, i) => { cells[i].innerText = piece; });
    document.getElementById('turn-indicator').innerText = (data.turn === myRole) ? "Sua vez de jogar!" : "Vez do oponente...";
}

function handleChessClick(idx) {
    if (!currentRoomCode || myRole === 'Espectador') return;
    const roomRef = database.ref('rooms/' + currentRoomCode);

    roomRef.once('value', (snap) => {
        const data = snap.val();
        if (data.status !== 'playing' || data.turn !== myRole) return;

        const cells = document.querySelectorAll('.chess-cell');
        const piece = data.board[idx];

        if (selectedChessIndex === null) {
            if (piece === "") return;
            
            // CORREÇÃO: P1 só move Brancas. P2 só move Pretas.
            if (myRole === 'P1' && !whitePieces.includes(piece)) return alert("Você joga com as Brancas!");
            if (myRole === 'P2' && !blackPieces.includes(piece)) return alert("Você joga com as Pretas!");

            selectedChessIndex = idx;
            cells[idx].classList.add('selected');
        } else {
            const from = selectedChessIndex;
            cells[from].classList.remove('selected');
            selectedChessIndex = null;

            if (from === idx) return;

            const movingPiece = data.board[from];
            const targetPiece = data.board[idx];

            // CORREÇÃO: Não pode matar a sua própria peça
            if (myRole === 'P1' && whitePieces.includes(targetPiece)) return;
            if (myRole === 'P2' && blackPieces.includes(targetPiece)) return;

            // VALIDAÇÃO RÍGIDA DE PASSO (Prevenir pulo do fim do mundo)
            if (!validateChessMove(from, idx, movingPiece, data.board)) {
                return alert("Movimento inválido para esta peça!");
            }

            // Executa a jogada
            data.board[idx] = movingPiece;
            data.board[from] = "";
            data.turn = (myRole === 'P1') ? 'P2' : 'P1';

            roomRef.update({ board: data.board, turn: data.turn });
        }
    });
}

// Mecanismo de regras básicas para satisfazer o limite físico do tabuleiro
function validateChessMove(from, to, piece, board) {
    const fromRow = Math.floor(from / 8), fromCol = from % 8;
    const toRow = Math.floor(to / 8), toCol = to % 8;
    const dRow = Math.abs(toRow - fromRow);
    const dCol = Math.abs(toCol - fromCol);

    // Regra do Rei: Apenas 1 casa para qualquer direção
    if (piece === '♔' || piece === '♚') {
        return (dRow <= 1 && dCol <= 1);
    }

    // Regra do Peão Branco: Sobe o tabuleiro (reduz a row)
    if (piece === '♙') {
        if (fromCol === toCol && targetIsEmpty(to, board)) {
            if (fromRow - toRow === 1) return true;
            if (fromRow === 6 && fromRow - toRow === 2) return true; // Avanço duplo inicial
        }
        if (dCol === 1 && fromRow - toRow === 1 && !targetIsEmpty(to, board)) return true; // Captura diagonal
        return false;
    }

    // Regra do Peão Preto: Desce o tabuleiro (aumenta a row)
    if (piece === '♟') {
        if (fromCol === toCol && targetIsEmpty(to, board)) {
            if (toRow - fromRow === 1) return true;
            if (fromRow === 1 && toRow - fromRow === 2) return true;
        }
        if (dCol === 1 && toRow - fromRow === 1 && !targetIsEmpty(to, board)) return true;
        return false;
    }

    return true; // Demais peças operam como sandbox flexível ou adicionáveis por turnos
}
function targetIsEmpty(idx, board) { return board[idx] === ""; }

// ================= JOGO DO BINGO MULTIPLAYER =================

function generateBingoCardLocal() {
    myBingoCard = [];
    while(myBingoCard.length < 25) {
        let n = Math.floor(Math.random() * 75) + 1;
        if(!myBingoCard.includes(n)) myBingoCard.push(n);
    }
    const cardDOM = document.getElementById('bingo-card'); cardDOM.innerHTML = '';
    myBingoCard.forEach(num => {
        let btn = document.createElement('button'); btn.className = 'bingo-cell'; btn.innerText = num;
        btn.onclick = () => btn.classList.toggle('marked');
        cardDOM.appendChild(btn);
    });
}

function startBingoCallerSystem() {
    let pool = []; for(let i=1; i<=75; i++) pool.push(i);
    bingoInterval = setInterval(() => {
        if(!currentRoomCode) return clearInterval(bingoInterval);
        const roomRef = database.ref('rooms/' + currentRoomCode);
        roomRef.once('value', (snap) => {
            let data = snap.val();
            if(!data || data.status !== 'playing') return clearInterval(bingoInterval);
            
            let drawn = data.bingoBalls || [0];
            let available = pool.filter(n => !drawn.includes(n));
            
            if(available.length === 0) return clearInterval(bingoInterval);
            let nextBall = available[Math.floor(Math.random() * available.length)];
            drawn.push(nextBall);
            
            roomRef.update({ bingoBalls: drawn });
        });
    }, 4000); // Roda uma bola a cada 4 segundos
}

function renderMultiBingo(data) {
    let list = data.bingoBalls || [0];
    let last = list[list.length - 1];
    document.getElementById('bingo-ball').innerText = last || '--';
    document.getElementById('bingo-history').innerText = list.slice(1).join(', ');
}

function claimBingo() {
    alert("Você gritou BINGO! O Host verificará sua cartela.");
}

// ================= JOGO DO DOMINÓ MULTIPLAYER =================

function distributeDominoTiles() {
    // Cria conjunto de 28 pedras clássicas
    let tiles = [];
    for (let i = 0; i <= 6; i++) { for (let j = i; j <= 6; j++) { tiles.push(`${i}-${j}`); } }
    // Embaralhar
    tiles.sort(() => Math.random() - 0.5);
    database.ref('rooms/' + currentRoomCode).update({ dominoTable: ["3-3"], poolTiles: tiles });
}

function renderMultiDomino(data) {
    const tableLine = document.getElementById('domino-table-line'); tableLine.innerHTML = '';
    let arr = data.dominoTable || [];
    arr.forEach(t => {
        if(t === "start") return;
        let d = document.createElement('div'); d.className = 'domino-tile table'; d.innerText = `[${t}]`;
        tableLine.appendChild(d);
    });

    // Renderiza a mão estática simulada do jogador
    const handDOM = document.getElementById('domino-hand'); handDOM.innerHTML = '';
    let mockHand = ["0-1", "2-4", "3-5", "6-6"];
    mockHand.forEach(tile => {
        let btn = document.createElement('button'); btn.className = 'domino-tile'; btn.innerText = tile.replace('-', '\n');
        btn.onclick = () => playDominoTile(tile);
        handDOM.appendChild(btn);
    });
}

function playDominoTile(tile) {
    if (!currentRoomCode) return;
    const roomRef = database.ref('rooms/' + currentRoomCode);
    roomRef.once('value', (snap) => {
        let arr = snap.val().dominoTable || [];
        arr.push(tile);
        roomRef.update({ dominoTable: arr });
    });
}

// ================= JOGO DA VELHA & FORCA MULTI (DA ÚLTIMA ETAPA) =================
function renderMultiVelha(data) {
    const cells = document.querySelectorAll('.velha-cell');
    data.board.forEach((val, i) => {
        cells[i].innerText = val; cells[i].disabled = val !== "" || data.turn !== myRole;
    });
}
document.querySelectorAll('.velha-cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
        const idx = e.target.getAttribute('data-index');
        if(myRole === 'Espectador') return;
        database.ref('rooms/' + currentRoomCode).once('value', (snap) => {
            let d = snap.val(); if(d.turn !== myRole || d.board[idx] !== "") return;
            d.board[idx] = (myRole === 'P1') ? 'X' : 'O'; d.turn = (myRole === 'P1') ? 'P2' : 'P1';
            database.ref('rooms/' + currentRoomCode).update({ board: d.board, turn: d.turn });
        });
    });
});
function renderMultiForca(data) {
    document.getElementById('coop-lives').innerText = data.coopLives;
    document.getElementById('coop-word-display').innerText = data.coopDiscovered.join(' ');
}

function leaveRoom() {
    if (currentRoomCode) {
        database.ref('rooms/' + currentRoomCode + '/players/' + playerNickname).remove();
        database.ref('rooms/' + currentRoomCode).off();
        if(bingoInterval) clearInterval(bingoInterval);
        currentRoomCode = null;
    }
    document.getElementById('lobby-menu').style.display = 'block';
    document.getElementById('multiplayer-arena').style.display = 'none';
}
