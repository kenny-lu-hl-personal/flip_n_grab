import { socket } from './server_connection.js'
export { newGame, joinGame, startGame, keydown, flipCard }

function newGame(event) {
  socket.emit('newGame');
}

function joinGame(event) {
  const code = gameCodeInput.value;
  socket.emit('joinGame', code);
}

function startGame(event) {
  socket.emit('startGame');
  console.log('request start game');
}

function keydown(event) {
  socket.emit('keydown', event.keyCode);
}

function flipCard(event) {
  console.log('you tried to flip a card');
  socket.emit('flipCard');
}
