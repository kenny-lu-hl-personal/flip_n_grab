import { gameCanvas } from './canvas_utils.js'

export { socket,
         handleEnterRoom, 
         handleLoadGame, 
         handleSetPlayerNumber,
         handleGameState,
         handleGameOver,
         handleGameCode,
         handleUnknownCode,
         handleTooManyPlayers,
         handleNotEnoughPlayers };

//Create socket io instance and connect to game server
const socket = io('http://localhost:3000');

//DOM objects
const gameScreen = document.getElementById('gameScreen');
const waitingScreen = document.getElementById('waitingScreen');
const initialScreen = document.getElementById('initialScreen');
const gameCodeInput = document.getElementById('gameCodeInput');
const gameCodeDisplay = document.getElementById('gameCodeDisplay');
const waitingPlayersDisplay = document.getElementById('waitingPlayersDisplay');

//The client's player number assigned by the game server.
let clientPlayerNumber;
let gameState = null;

function handleEnterRoom(numConnected, roomName) {
  initialScreen.style.display = "none";
  waitingScreen.style.display = "block";
  waitingPlayersDisplay.innerHTML = numConnected.toString() + ' players connected';
  gameCodeDisplay.innerHTML = roomName;
}

async function handleLoadGame(state) {
  await gameCanvas.loadImages()
  socket.emit('gameLoaded');  
  gameState = state;
  gameCanvas.gameDisplayGrid.setPlayerPositions(clientPlayerNumber, gameState.players.length);
  
  //Unhide the canvas and draw the game's initial state.
  waitingScreen.style.display = "none";
  gameScreen.style.display = "block";
  gameCanvas.resize();
  requestAnimationFrame(() => gameCanvas.paintGame(gameState));

  //Resize the canvas and redraw game state when browser window is resized.
  $(window).on('resize', () => {
    gameCanvas.resize()
    requestAnimationFrame(() => gameCanvas.paintGame(gameState));
  });

  //document.addEventListener('keydown', keydown); 
}

function handleSetPlayerNumber(number) {
  clientPlayerNumber = number;
  console.log(`Starting game as player ${clientPlayerNumber}`);
}

function handleGameState(state) {
  gameState = state;
  requestAnimationFrame(() => gameCanvas.paintGame(clientPlayerNumber, gameState));
}

function handleGameOver(data) {
  if (!gameActive) {
    return;
  }
  data = JSON.parse(data);

  gameActive = false;

  if (data.winner === clientPlayerNumber) {
    alert('You Win!');
  } else {
    alert('You Lose :(');
  }
}

function handleGameCode(gameCode) {
  gameCodeDisplay.innerText = gameCode;
}

function handleUnknownCode() {
  reset();
  alert('Unknown Game Code')
}

function handleTooManyPlayers() {
  reset();
  alert('There are not enough players to start the game.');
}

function handleNotEnoughPlayers() {
  alert('Oops! There aren\'t enough players. Please wait for more players to join the game.');
}

function reset() {
  clientPlayerNumber = null;
  gameState = null;
  gameCodeInput.value = '';
  initialScreen.style.display = "block";
  waitingScreen.style.display = "none";
  gameScreen.style.display = "none";
}