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
let myRole = null; 
let playerNickname = "";
let bingoInterval = null;

// ================= UTILITÁRIOS DE NAVEGAÇÃO =================
function togglePlayerCountVisibility() {
    const game = document.getElementById('game-select').value;
    const group = document.getElementById('player-count-group');
    if (game === 'forca-coop' || game === 'bingo') group.style.display = 'block';
    else group.style.display = 'none';
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

// ================= SINGLEPLAYER =================
let snakeCanvas = document.getElementById('snakeCanvas'); let ctx = snakeCanvas?snakeCanvas.getContext('2d'):null;
let snake, food, dx, dy, score, snakeInterval; const box = 20;
function startSnake() {
    document.getElementById('games-menu').style.display = 'none'; document.getElementById('snake-arena').style.display = 'block';
    snake = [{x: 200, y: 200}]; food = {x: 40, y: 40}; dx = box; dy = 0; score = 0;
    document.getElementById('snake-score').innerText = score;
    clearInterval(snakeInterval); snakeInterval = setInterval(() => {
        const head = {x: snake[0].x + dx, y: snake[0].y + dy};
        if(head.x < 0 || head.x >= 400 || head.y < 0 || head.y >= 400 || snake.some(s => s.x===head.x && s.y===head.y)) {
            alert('Fim de Jogo! Pontos: ' + score); startSnake(); return;
        }
        snake.unshift(head);
        if(head.x === food.x && head.y === food.y) { score+=10; document.getElementById('snake-score').innerText = score; food = {x: Math.floor(Math.random()*20)*box, y: Math.floor(Math.random()*20)*box}; } else snake.pop();
        ctx.fillStyle = '#121214'; ctx.fillRect(0,0,400,400); 
        ctx.fillStyle = '#ff4757'; ctx.fillRect(food.x, food.y, box-2, box-2);
        ctx.fillStyle = '#8257e5'; snake.forEach(s => ctx.fillRect(s.x, s.y, box-2, box-2));
    }, 120);
}

const palavras = ['REACT', 'NODE', 'FIREBASE', 'JAVASCRIPT'];
let palSP, descSP, vidasSP;
function startForca() {
    document.getElementById('games-menu').style.display = 'none'; document.getElementById('forca-arena').style.display = 'block';
    palSP = palavras[Math.floor(Math.random() * palavras.length)]; descSP = Array(palSP.length).fill('_'); vidasSP = 6;
    document.getElementById('forca-lives').innerText = vidasSP; document.getElementById('word-display').innerText = descSP.join(' ');
    const kb = document.getElementById('keyboard'); kb.innerHTML = '';
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letra => {
        let b = document.createElement('button'); b.innerText = letra; b.className = 'key-btn';
        b.onclick = () => {
            b.disabled = true;
            if(palSP.includes(letra)) {
                for(let i=0; i<palSP.length; i++) if(palSP[i]===letra) descSP[i]=letra;
                document.getElementById('word-display').innerText = descSP.join(' ');
                if(!descSP.includes('_')) { setTimeout(()=> {alert('Ganhou!'); startForca();}, 100); }
            } else {
                vidasSP--; document.getElementById('forca-lives').innerText = vidasSP;
                if(vidasSP<=0) { setTimeout(()=> {alert('Perdeu! Era: '+palSP); startForca();}, 100); }
            }
        }; kb.appendChild(b);
    });
}

// ================= LOBBY MULTIPLAYER RIGOROSO =================
function createRoom() {
    playerNickname = document.getElementById('username').value.trim();
    if (!playerNickname) return alert('Insira seu apelido!');

    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    currentRoomCode = code; myRole = 'P1';

    const gameMode = document.getElementById('game-select').value;
    let maxPlayers = 2; // Velha, Xadrez e Dominó travados em 2
    if (gameMode === 'forca-coop' || gameMode === 'bingo') maxPlayers = parseInt(document.getElementById('max-players').value);

    // Motor do Xadrez (Estado Inicial em FEN)
    const initialFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    database.ref('rooms/' + code).set({
        game: gameMode, status: "waiting", maxPlayers: maxPlayers, turn: 'P1',
        velhaBoard: Array(9).fill(""),
        chessFen: initialFen,
        coopWord: 'DESENVOLVEDOR', coopDiscovered: Array('DESENVOLVEDOR'.length).fill('_'), coopLives: 6,
        bingoBalls: [0],
        dominoTable: [], dominoHands: { P1: [], P2: [] }
    }).then(() => {
        database.ref('rooms/' + code + '/players/' + playerNickname).set(myRole);
        setupRoomListener(code); showArena(code, gameMode);
    });
}

function joinRoom() {
    playerNickname = document.getElementById('username').value.trim();
    const code = document.getElementById('room-code').value.trim().toUpperCase();
    if (!playerNickname || !code) return alert('Preencha os dados!');

    database.ref('rooms/' + code).once('value', (snap) => {
        if (!snap.exists()) return alert('Sala não encontrada!');
        const data = snap.val();
        const currentPlayers = data.players ? Object.keys(data.players) : [];
        
        if (currentPlayers.includes(playerNickname)) myRole = data.players[playerNickname];
        else if (currentPlayers.length >= data.maxPlayers) return alert('A sala está cheia!');
        else myRole = 'P' + (currentPlayers.length + 1);

        database.ref('rooms/' + code + '/players/' + playerNickname).set(myRole).then(() => {
            currentRoomCode = code; setupRoomListener(code); showArena(code, data.game);
        });
    });
}

function showArena(code, gameMode) {
    document.getElementById('lobby-menu').style.display = 'none'; document.getElementById('multiplayer-arena').style.display = 'block';
    document.getElementById('display-room-code').innerText = code;
    document.querySelectorAll('.mp-subgrid').forEach(el => el.style.display = 'none');
    
    if(gameMode === 'velha') document.getElementById('multi-velha').style.display = 'block';
    if(gameMode === 'xadrez') { document.getElementById('multi-xadrez').style.display = 'block'; buildChessDOM(); }
    if(gameMode === 'forca-coop') document.getElementById('multi-forca-coop').style.display = 'block';
    if(gameMode === 'bingo') { document.getElementById('multi-bingo').style.display = 'block'; generateBingoCardLocal(); }
    if(gameMode === 'domino') document.getElementById('multi-domino').style.display = 'block';
}

function setupRoomListener(code) {
    database.ref('rooms/' + code).on('value', (snap) => {
        const data = snap.val(); if (!data) return;
        const playerNames = Object.keys(data.players || {});
        
        document.getElementById('count-connected').innerText = playerNames.length;
        document.getElementById('count-max').innerText = data.maxPlayers;
        document.getElementById('room-players-list').innerText = playerNames.map(name => `${name} (${data.players[name]})`).join(', ');

        const startBtn = document.getElementById('start-game-btn');
        if (myRole === 'P1' && data.status === 'waiting') {
            if (playerNames.length === data.maxPlayers) {
                startBtn.style.display = 'block'; document.getElementById('turn-indicator').innerText = "Todos prontos! Inicie a partida.";
            } else { startBtn.style.display = 'none'; document.getElementById('turn-indicator').innerText = "Aguardando lotação da sala..."; }
        } else { startBtn.style.display = 'none'; }

        if (data.status === 'waiting') {
            document.getElementById('player-status').innerText = `Role: ${myRole}. Esperando P1 iniciar...`; return;
        }

        document.getElementById('player-status').innerText = `Em Jogo! Role: ${myRole}`;
        
        if (data.game === 'velha') renderMultiVelha(data);
        if (data.game === 'xadrez') renderMultiXadrez(data);
        if (data.game === 'forca-coop') renderMultiForca(data);
        if (data.game === 'bingo') renderMultiBingo(data);
        if (data.game === 'domino') renderMultiDomino(data);
    });
}

function triggerStartGame() {
    database.ref('rooms/' + currentRoomCode).once('value', (snap) => {
        const data = snap.val();
        let updates = { status: 'playing' };
        
        if (data.game === 'domino') {
            // Gerar 28 pedras e dar 7 pra cada
            let tiles = []; for (let i = 0; i <= 6; i++) { for (let j = i; j <= 6; j++) tiles.push(`${i}-${j}`); }
            tiles.sort(() => Math.random() - 0.5);
            updates.dominoHands = { P1: tiles.splice(0, 7), P2: tiles.splice(0, 7) };
            // P1 começa
            updates.turn = 'P1'; 
        }
        database.ref('rooms/' + currentRoomCode).update(updates).then(() => {
            if (data.game === 'bingo') startBingoCallerSystem();
        });
    });
}

// ================= 1. JOGO DA VELHA =================
function renderMultiVelha(data) {
    document.getElementById('turn-indicator').innerText = (data.turn === myRole) ? "Sua vez!" : "Vez do oponente...";
    const cells = document.querySelectorAll('.velha-cell');
    data.velhaBoard.forEach((val, i) => {
        cells[i].innerText = val; cells[i].disabled = (val !== "" || data.turn !== myRole);
    });
}
document.querySelectorAll('.velha-cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
        const idx = e.target.getAttribute('data-index');
        database.ref('rooms/' + currentRoomCode).once('value', (snap) => {
            let d = snap.val(); if(d.turn !== myRole || d.velhaBoard[idx] !== "") return;
            d.velhaBoard[idx] = (myRole === 'P1') ? 'X' : 'O'; d.turn = (myRole === 'P1') ? 'P2' : 'P1';
            database.ref('rooms/' + currentRoomCode).update({ velhaBoard: d.velhaBoard, turn: d.turn });
        });
    });
});

// ================= 2. XADREZ (COM MOTOR CHESS.JS) =================
const chessEngine = new Chess();
let selectedSquare = null;
const squareNames = []; // Mapeia índice 0-63 para notação a8-h1
const files = ['a','b','c','d','e','f','g','h'];
for(let r=8; r>=1; r--) { for(let c=0; c<8; c++) squareNames.push(files[c]+r); }

const pieceUnicode = { 'p':'♟','r':'♜','n':'♞','b':'♝','q':'♛','k':'♚', 'P':'♙','R':'♖','N':'♘','B':'♗','Q':'♕','K':'♔' };

function buildChessDOM() {
    const boardDOM = document.getElementById('chess-board'); boardDOM.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const cell = document.createElement('button');
        cell.className = `chess-cell ${((Math.floor(i/8) + i) % 2 === 0) ? 'light' : 'dark'}`;
        cell.setAttribute('data-sq', squareNames[i]);
        cell.onclick = () => handleChessClick(squareNames[i]);
        boardDOM.appendChild(cell);
    }
}

function renderMultiXadrez(data) {
    chessEngine.load(data.chessFen);
    
    // De quem é a vez pela regra oficial?
    const currentTurnColor = chessEngine.turn(); // 'w' ou 'b'
    const isMyTurn = (myRole === 'P1' && currentTurnColor === 'w') || (myRole === 'P2' && currentTurnColor === 'b');
    document.getElementById('turn-indicator').innerText = isMyTurn ? "Sua vez de jogar!" : "Vez do oponente...";

    const board = chessEngine.board(); // matriz 8x8
    const cells = document.querySelectorAll('.chess-cell');
    
    let i = 0;
    for(let r=0; r<8; r++){
        for(let c=0; c<8; c++){
            let piece = board[r][c];
            cells[i].innerText = piece ? pieceUnicode[piece.color === 'w' ? piece.type.toUpperCase() : piece.type] : "";
            cells[i].disabled = !isMyTurn;
            cells[i].classList.remove('selected');
            i++;
        }
    }
    
    if(chessEngine.game_over()) alert("Fim de Jogo no Xadrez!");
}

function handleChessClick(sqName) {
    if(!currentRoomCode) return;
    
    // Selecionar peça origem
    if (!selectedSquare) {
        const piece = chessEngine.get(sqName);
        if (!piece) return; // clicou no vazio
        // Só pode selecionar a própria peça
        if (myRole === 'P1' && piece.color === 'b') return alert("Você joga com as Brancas!");
        if (myRole === 'P2' && piece.color === 'w') return alert("Você joga com as Pretas!");
        
        selectedSquare = sqName;
        document.querySelector(`[data-sq="${sqName}"]`).classList.add('selected');
    } else {
        // Tentar mover
        const from = selectedSquare;
        const to = sqName;
        selectedSquare = null;

        // O motor do chess.js faz toda a magia de validação aqui (limites, xeque, matar)
        const move = chessEngine.move({ from: from, to: to, promotion: 'q' });
        
        if (move === null) {
            alert("Movimento ilegal!");
            renderMultiXadrez({chessFen: chessEngine.fen()}); // reseta visual
            return;
        }

        // Se o movimento for válido, manda pro Firebase o novo estado
        database.ref('rooms/' + currentRoomCode).update({ chessFen: chessEngine.fen() });
    }
}

// ================= 3. DOMINÓ LÓGICO =================
function renderMultiDomino(data) {
    document.getElementById('turn-indicator').innerText = (data.turn === myRole) ? "Sua vez!" : "Aguardando oponente...";
    
    // MESA
    const tableLine = document.getElementById('domino-table-line'); tableLine.innerHTML = '';
    const table = data.dominoTable || [];
    table.forEach(t => {
        let d = document.createElement('div'); d.className = 'domino-tile table'; 
        d.innerText = `${t.split('-')[0]} | ${t.split('-')[1]}`;
        tableLine.appendChild(d);
    });

    // MÃO
    const handDOM = document.getElementById('domino-hand'); handDOM.innerHTML = '';
    const myHand = data.dominoHands ? (data.dominoHands[myRole] || []) : [];
    
    myHand.forEach(tile => {
        let btn = document.createElement('button'); btn.className = 'domino-tile'; 
        btn.innerText = tile.replace('-', '\n');
        btn.disabled = (data.turn !== myRole); // Bloqueia se não for seu turno
        btn.onclick = () => playDominoTile(tile, data);
        handDOM.appendChild(btn);
    });

    if(myHand.length === 0 && table.length > 0) alert("Você Bateu! Vitória!");
}

function playDominoTile(tile, data) {
    let table = data.dominoTable || [];
    let isValid = false;
    let newTileStr = tile;

    // Regra da mesa vazia (qualquer pedra entra)
    if (table.length === 0) {
        isValid = true;
    } else {
        const leftEnd = table[0].split('-')[0];
        const rightEnd = table[table.length - 1].split('-')[1];
        const tLeft = tile.split('-')[0];
        const tRight = tile.split('-')[1];

        // Lógica de encaixe nas pontas
        if (tRight === leftEnd) { isValid = true; table.unshift(tile); } // Encaixa na esquerda certinho
        else if (tLeft === leftEnd) { isValid = true; table.unshift(`${tRight}-${tLeft}`); } // Encaixa na esquerda virando
        else if (tLeft === rightEnd) { isValid = true; table.push(tile); } // Encaixa na direita certinho
        else if (tRight === rightEnd) { isValid = true; table.push(`${tRight}-${tLeft}`); } // Encaixa na direita virando
    }

    if (!isValid) return alert("Esta pedra não encaixa nas pontas!");

    // Remove da mão e passa turno
    let newHand = data.dominoHands[myRole].filter(t => t !== tile);
    let updates = {
        dominoTable: table,
        turn: (myRole === 'P1') ? 'P2' : 'P1'
    };
    updates[`dominoHands/${myRole}`] = newHand;

    database.ref('rooms/' + currentRoomCode).update(updates);
}

function passDominoTurn() {
    database.ref('rooms/' + currentRoomCode).once('value', (snap) => {
        let data = snap.val();
        if(data.turn === myRole) {
            database.ref('rooms/' + currentRoomCode).update({ turn: (myRole === 'P1') ? 'P2' : 'P1' });
        }
    });
}

// ================= FECHAR SALA =================
function leaveRoom() {
    if (currentRoomCode) {
        database.ref('rooms/' + currentRoomCode + '/players/' + playerNickname).remove();
        database.ref('rooms/' + currentRoomCode).off();
        if(bingoInterval) clearInterval(bingoInterval); currentRoomCode = null;
    }
    document.getElementById('lobby-menu').style.display = 'block'; document.getElementById('multiplayer-arena').style.display = 'none';
}

// (As funções de Forca Multi e Bingo do código anterior seguem as mesmas regras sem alterações, retirei para focar nas que precisavam de lógica estrita).
