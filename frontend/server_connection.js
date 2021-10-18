import { gameCanvas } from './canvas_utils.js'

export { socket,
         reset,
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
//const socket = io('http://localhost:3000');  
const socket = io('https://rocky-dawn-87570.herokuapp.com');

//DOM objects
const initialScreen = document.getElementById('initialScreen');
const waitingScreen = document.getElementById('waitingScreen');
const gameScreen = document.getElementById('gameScreen');
const gameEndScreen = document.getElementById('gameEndScreen');
const gameCodeInput = document.getElementById('gameCodeInput');
const gameCodeDisplay = document.getElementById('gameCodeDisplay');
const waitingPlayersDisplay = document.getElementById('waitingPlayersDisplay');
const gameEndDisplay = document.getElementById('gameEndDisplay');

//The client's player number assigned by the game server.
let clientPlayerNumber;
let gameState = null;

function reset() {
  clientPlayerNumber = null;
  gameState = null;
  gameCodeInput.value = '';
  initialScreen.style.display = "block";
  waitingScreen.style.display = "none";
  gameScreen.style.display = "none";
  gameEndScreen.style.display = "none";
}

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

function handleGameOver(endStatus) {
  if (endStatus.endMode === 'playerDisconnect') {
    gameEndDisplay.innerText = 'A player has disconnected. Game ended.'
  } else if (endStatus.endMode === 'gameComplete') {
    let gameWon = false;
    endStatus.winners.forEach((winnerNumber) => {
      if (winnerNumber === clientPlayerNumber) { gameWon = true;}
    })

    if (gameWon) {
      gameEndDisplay.innerText = 'You Win!';
    } else {
      gameEndDisplay.innerText = 'You Lose :(';
    }
  } else if (endStatus.endMode === 'gameDraw') {
    gameEndDisplay.innerText = 'The game ended in a draw. No players have any cards left in their play deck.'
  }
  gameEndScreen.style.display = "block";
  gameScreen.style.display = "none";
}

function handleGameCode(gameCode) {
  gameCodeDisplay.innerText = gameCode;
}

function handleUnknownCode() {
  reset();
  alert('Uh-oh, the game you are trying to join cannot be found. \rPlease try another game code.')
}

function handleTooManyPlayers() {
  reset();
  alert('There are too many players in this game.');
}

function handleNotEnoughPlayers() {
  alert('Oops! There aren\'t enough players. \r\rPlease share your game code with other players and wait for them to join the game.');
}

function handleLoadInitialScreen() {
  reset();
}
