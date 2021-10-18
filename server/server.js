
//Create socket io instance and connect to game server
let front_end_origin;
let backend_port;
if (typeof process.env.IS_HEROKU === 'undefined') {
  front_end_origin = 'http://localhost:8080';    //local testing
  backend_port = 3000 
} else {
  front_end_origin = 'https://priceless-nightingale-6a1611.netlify.app';
  backend_port = process.env.PORT
}
const io = require('socket.io')(backend_port, {
  cors: {origin: [front_end_origin]},
});

const { initGame, gameLoop} = require('./game');
const { FRAME_RATE } = require('./constants');
const { generateGameCode } = require('./utils');

//Map each socket IO room with its game state. Property name is room ID. Property value is game state.
const state = {};
//Map each socket IO room with the interval loop that updates its game state.
const intervals = {};
//Map each socket IO room with the number of players that have finished loading game imgs/files.
const gameLoadedCount = {};


io.on('connection', client => {

  client.on('newGame', handleNewGame);
  client.on('joinGame', handleJoinGame);
  client.on('startGame', handleStartGame);
  client.on('playAgain', handlePlayAgain);
  client.on('gameLoaded', handleGameLoaded);
  client.on('disconnect', handleDisconnect);
  client.on('flipCard', handleFlipCard);
  client.on('grabTotem', handleGrabTotem);

  function handleDisconnect() {
    console.log('a player has disconnected');
    let leftRoomID = client.roomID;
    delete client.roomID;
    //if the room still has clients, send remaining clients updated room state
    if (io.sockets.adapter.rooms.has(leftRoomID)) {
      emitGameOver(leftRoomID, 'playerDisconnect');
    }
    clearGame(leftRoomID);
  }

  function handleNewGame() {
    let newRoomID = generateGameCode(5);
    client.emit('gameCode', newRoomID);
    client.join(newRoomID);
    client.roomID = newRoomID;
    emitRoomState(newRoomID);
  }

  function handleJoinGame(roomID) {
    const room = io.sockets.adapter.rooms.get(roomID);

    clientsInRoom = 0;
    if (room) {
      clientsInRoom = room.size;
    }

    if (clientsInRoom === 0) {
      client.emit('unknownCode');
      return;
    } else if (clientsInRoom >= 4) {
      client.emit('tooManyPlayers');
      return;
    }

    client.join(roomID);
    client.roomID = roomID;
    emitRoomState(roomID);
  }
  
  function handleStartGame() {
    console.log('receive start game request');
    const roomID = client.roomID;
    //set of all client ids in the room
    const clientIDs = io.sockets.adapter.rooms.get(roomID);    
    const numClients = clientIDs ? clientIDs.size : 0;

    if (numClients <= 1) {
      client.emit('notEnoughPlayers');
    } else {
      //assign a player number to each client
      let playerNumber = 0;
      for (const clientID of Array.from(clientIDs) ) {    
           const client = io.sockets.sockets.get(clientID);
           client.playerNumber = playerNumber;    
           client.emit('setPlayerNumber', playerNumber);
           playerNumber += 1;    
      }  

      state[roomID] = initGame(playerNumber);
      //Request clients to load game collateral. Clients respond with 'gameLoaded' event when done.
      gameLoadedCount[roomID] = 0;
      io.sockets.in(roomID).emit('loadGame', state[roomID]);
    }
  } 

  function handleGameLoaded() {
    const roomID = client.roomID;
    gameLoadedCount[roomID]++;
    if (gameLoadedCount[roomID] === state[roomID].players.length) {
      intervals[roomID] = startGameInterval(roomID);
    }
  }

  function handleFlipCard() {
    const roomID = client.roomID;
    gameState = state[roomID];
    gameState.flipCard(client.playerNumber);
  }  

  function handleGrabTotem() {
    const roomID = client.roomID;
    gameState = state[roomID];
    gameState.grabTotem(client.playerNumber);
  }  

  function handlePlayAgain() {
    client.emit('loadInitialScreen');
  }

});

function startGameInterval(roomID) {
  const intervalId = setInterval(() => {
    const gameState = state[roomID];
    const winners = gameState.winningPlayers;
    
    if (winners.length === 0) {
      emitGameState(roomID, gameState)
    } else if (winners.length === gameState.players.length) {
      emitGameOver(roomID, 'gameDraw', winners);
      clearGame(roomID);    
    } else {
      emitGameOver(roomID, 'gameComplete', winners);
      clearGame(roomID);
    }
    console.log('running')
  }, 1000 / FRAME_RATE);

  return intervalId;
}

function emitGameState(roomID, gameState) {
  // Send this event to everyone in the room.
  io.sockets.in(roomID).emit('gameState', gameState);
}

function emitGameOver(roomID, endMode, winners = []) {
  if (endMode != 'playerDisconnect' && endMode != 'gameComplete') {
    throw new Error('Invalid value for function argument "endMode"');
  }
  if (endMode === "gameComplete" && winners.length < 1) {
    throw new Error('Invalid value for function argument "winners"');
  }
  io.sockets.in(roomID).emit('gameOver', {endMode, winners});
}

function emitRoomState(roomID) {
  io.sockets.in(roomID).emit('enterRoom', io.sockets.adapter.rooms.get(roomID).size, roomID);
}

function clearGame(roomID) {
  if (io.sockets.adapter.rooms.has(roomID)) {
    let clientIDs = io.sockets.adapter.rooms.get(roomID);
    clientIDs.forEach((clientID) => {
      let client = io.sockets.sockets.get(clientID);
      delete client.roomID;
    }) 
    io.in(roomID).socketsLeave(roomID);
  }
  clearInterval(intervals[roomID]);
  delete intervals[roomID];
  delete state[roomID];
  delete gameLoadedCount[roomID]; 
}
