const io = require('socket.io')(3000, {
  cors: {origin: ['http://localhost:8080']},
});
const { initGame, gameLoop} = require('./game');
const { FRAME_RATE } = require('./constants');
const { makeid } = require('./utils');

//TODO. remove makeid(5) magic number
//      change from clientRoom obj to client.room attribute of each client

//Map each socket IO room with its game state. Property name is room ID. Property value is game state.
const state = {};
//Map each client to the connected room's ID. Property name is a client ID. Property value is room ID.
const clientRooms = {};

io.on('connection', client => {

  client.on('newGame', handleNewGame);
  client.on('joinGame', handleJoinGame);
  client.on('startGame', handleStartGame);
  client.on('gameLoaded', handleGameLoaded);
  client.on('disconnect', handleDisconnect);
  client.on('flipCard', handleFlipCard);
  client.on('grabTotem', handleGrabTotem);

  function handleDisconnect() {
    console.log('a player has disconnected');
    let leftRoomID = clientRooms[client.id]
    //if the room still has clients, send remaining clients updated room state
    if (io.sockets.adapter.rooms.has(leftRoomID)) {
      emitRoomState(leftRoomID);
    }
    delete clientRooms[client.id]
  }

  function handleNewGame() {
    let newRoomID = makeid(5);
    clientRooms[client.id] = newRoomID;
    client.emit('gameCode', newRoomID);

    client.join(newRoomID);
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

    clientRooms[client.id] = roomID;

    client.join(roomID);
    emitRoomState(roomID);
  }
  
  function handleStartGame() {
    console.log('receive start game request');
    const roomID = clientRooms[client.id];
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
      //Request clients to load game collateral. Clients respond with 'gameLoaded' event when done.s
      io.sockets.in(roomID).emit('loadGame', state[roomID]);
    }
  } 

  function handleGameLoaded() {
    const roomID = clientRooms[client.id];
    gameState = state[roomID];
    gameState.collatLoaded += 1;
    if (gameState.collatLoaded === gameState.players.length) {
      //io.sockets.in(roomID).emit('gameState', gameState);
      startGameInterval(roomID);
    }
  }

  function handleFlipCard() {
    const roomID = clientRooms[client.id];
    gameState = state[roomID];
    gameState.flipCard(client.playerNumber);
  }  

  function handleGrabTotem() {
    const roomID = clientRooms[client.id];
    gameState = state[roomID];
    gameState.grabTotem(client.playerNumber);
  }  

});

function startGameInterval(roomID) {
  const intervalId = setInterval(() => {
    const winners = gameLoop(state[roomID]);
    
    if (winners.length === 0) {
      emitGameState(roomID, state[roomID])
    } else {
      emitGameOver(roomID, winners);
      state[roomID] = null;
      clearInterval(intervalId);
    }
  }, 1000 / FRAME_RATE);

}

function emitGameState(roomID, gameState) {
  // Send this event to everyone in the room.
  io.sockets.in(roomID).emit('gameState', gameState);
}

function emitGameOver(roomID, winners) {
  io.sockets.in(roomID).emit('gameOver', {winners});
}

function emitRoomState(roomID) {
  io.sockets.in(roomID).emit('enterRoom', io.sockets.adapter.rooms.get(roomID).size, roomID);
}
