import { socket } from './server_connection.js'
import { GRID_POS_TOTEM_AND_POT, GRID_POS_CLIENT_PLAYDECK } from './constants.js'
export { newGame, joinGame, startGame, keydown, flipCard, clickInGame }

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

function clickInGame(event, gameCanvas) {
  console.log('ingameclick');
  
  let clickedPosition = gameCanvas.gameDisplayGrid.coordToGridPos(gameCanvas.mousePos);
  //If click on totem
  if (clickedPosition === GRID_POS_TOTEM_AND_POT) {
    console.log('you tried to grab a totem');
    socket.emit('grabTotem');

  } else if (clickedPosition === GRID_POS_CLIENT_PLAYDECK) {
    console.log('you tried to flip a card');
    socket.emit('flipCard');
  }

}