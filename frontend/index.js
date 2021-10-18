
import { gameCanvas } from './canvas_utils.js';

import { socket,
         reset,
         handleEnterRoom, 
         handleLoadGame, 
         handleSetPlayerNumber,
         handleGameState,
         handleGameOver,
         handleGameCode,
         handleUnknownCode,
         handleTooManyPlayers,
         handleNotEnoughPlayers } from './server_connection.js';

import { newGame, joinGame, startGame, flipCard, clickInGame } from './user_inputs.js';

//Respond to events emitted by the game server.
socket.on('enterRoom', handleEnterRoom);
socket.on('loadGame', handleLoadGame);
socket.on('setPlayerNumber', handleSetPlayerNumber);
socket.on('gameState', handleGameState);
socket.on('gameOver', handleGameOver);
socket.on('gameCode', handleGameCode);
socket.on('unknownCode', handleUnknownCode);
socket.on('tooManyPlayers', handleTooManyPlayers);
socket.on('notEnoughPlayers', handleNotEnoughPlayers);


//Process player inputs.
const newGameBtn = document.getElementById('newGameButton');
const joinGameBtn = document.getElementById('joinGameButton');
const startGameBtn = document.getElementById('startGameButton');
const playAgainBtn = document.getElementById('playAgainButton');

newGameBtn.addEventListener('click', newGame);
joinGameBtn.addEventListener('click', joinGame);
startGameBtn.addEventListener('click', startGame);
gameCanvas.canvas.addEventListener('click', (event) => { clickInGame(event, gameCanvas) })
gameCanvas.canvas.addEventListener('mousemove', (event) => { gameCanvas.setMousePos.call(gameCanvas, event) });
playAgainBtn.addEventListener('click', reset);
