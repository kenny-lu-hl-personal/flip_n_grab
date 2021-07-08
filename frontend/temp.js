//SERVER_CONNECTION.JS
//connect to game server through through socket io
const socket = io('http://localhost:3000');

export {socket} ;
export const connect = () => {
  socket.on('enterRoom', handleEnterRoom);
  socket.on('loadGame', handleLoadGame);
  socket.on('setPlayerNumber', handleSetPlayerNumber);
  socket.on('gameState', handleGameState);
  socket.on('gameOver', handleGameOver);
  socket.on('gameCode', handleGameCode);
  socket.on('unknownCode', handleUnknownCode);
  socket.on('tooManyPlayers', handleTooManyPlayers);
};


//USER_INPUTS.JS
//needs to communicate to socket. pass in socket dpdc
export const process_player_input = () => {
  newGameBtn.addEventListener('click', newGame);
  joinGameBtn.addEventListener('click', joinGame);
  startGameBtn.addEventListener('click', startGame);
};


