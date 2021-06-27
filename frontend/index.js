const BG_IMG_NAME = 'pattern_pink_dots'

import { insertHTML } from './markup_utils.js';

const socket = io('http://localhost:3000');

socket.on('enterRoom', handleEnterRoom);
socket.on('loadGame', handleLoadGame);
socket.on('setPlayerNumber', handleSetPlayerNumber);
socket.on('gameState', handleGameState);
socket.on('gameOver', handleGameOver);
socket.on('gameCode', handleGameCode);
socket.on('unknownCode', handleUnknownCode);
socket.on('tooManyPlayers', handleTooManyPlayers);

const gameScreen = document.getElementById('gameScreen');
const waitingScreen = document.getElementById('waitingScreen');
const initialScreen = document.getElementById('initialScreen');
const newGameBtn = document.getElementById('newGameButton');
const joinGameBtn = document.getElementById('joinGameButton');
const startGameBtn = document.getElementById('startGameButton');
const gameCodeInput = document.getElementById('gameCodeInput');
const gameCodeDisplay = document.getElementById('gameCodeDisplay');

newGameBtn.addEventListener('click', newGame);
joinGameBtn.addEventListener('click', joinGame);
startGameBtn.addEventListener('click', startGame);

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageObjects = new Map();
const displayGrid = {
  cellSize: null,
  playerPositions: [],
};
let playerNumber;
let gameState = null;

//Dynamically resize and repaint canvas
$(window).on('resize', function() {
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
  //Math.min(canvas.height, canvas.width)
  //set displayGrid.cellSize;
  requestAnimationFrame(() => paintGame(gameState));
});


function newGame() {
  socket.emit('newGame');
}


function joinGame() {
  const code = gameCodeInput.value;
  socket.emit('joinGame', code);
}

function startGame() {
  socket.emit('startGame');
  console.log('request start game');
}

function handleEnterRoom(numConnected, roomName) {
  initialScreen.style.display = "none";
  waitingScreen.style.display = "block";

  let html = numConnected.toString() + ' players connected';
  insertHTML('#waitingPlayers', html);
  insertHTML('#gameCodeDisplay', roomName);
}

async function handleLoadGame(state) {
  await loadImages()
  socket.emit('gameLoaded');  
  gameState = state;

  //paint background on the canvas
  waitingScreen.style.display = "none";
  gameScreen.style.display = "block";
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
  requestAnimationFrame(() => paintGame(gameState));

  //document.addEventListener('keydown', keydown); 

  setDisplayGrid();
}

//setup 5x5 grid on canvas to display game images/text
function setDisplayGrid() {

  //each player is assigned unique positions to display his/her cards
  //positions ranges from 0 to 24, each representing a position in 5x5 grid matrix
  function playerPosition(num1, num2) {
    this.discardPilePos = num1;
    this.playDeckPos = num2;   
  }

  const pos_lower = new playerPosition(17, 22);
  const pos_right = new playerPosition(13, 14);
  const pos_upper = new playerPosition(7, 2);
  const pos_left = new playerPosition(11, 10);

  let positions = [];
  switch(gameState.players.length) {
    case 1:
      positions = [pos_lower];
      break;
    case 2:
      positions = [pos_lower, pos_upper];
      break;
    case 3:
      positions = [pos_lower, pos_right, pos_left];
      break;
    case 4:
      positions = [pos_lower, pos_right, pos_upper, pos_left];
      break;
  }

  let currPlayer = playerNumber;  
  for (let i = 0; i < positions.length; i++) {
    if (currPlayer === gameState.players.length) {
      currPlayer = 0;
    }
    displayGrid.playerPositions[currPlayer] = positions[i]; 
    currPlayer += 1;
  }
}

function paintBG() {
  let bgPattern = ctx.createPattern(imageObjects.get(BG_IMG_NAME), 'repeat');
  ctx.fillStyle = bgPattern;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}


function loadImages() {
  console.log('load images');
  return new Promise(resolve => {
    let folder = "static/game_collateral/images/";
    let imagePaths = [];  

    //jQuery AJAX function to find all image file paths on server
    function getImagePaths() {
      return $.ajax({
          url : folder,
          success: function (data) {
            $(data).find("a").attr("href", function (i, val) {
              if( val.match(/\.(jpe?g|png|gif)$/) ) { 
                imagePaths.push(val);
              } 
            });
          }
      });
    }
    
    //wait for jQuery function to finish getting paths, then load images
    $.when(getImagePaths()).done(function(response) {
      let loaded = 0;  

      function cntLoaded() {
        loaded++;
        if (loaded == imagePaths.length) {
          //finish loading all images
          console.log(imageObjects);
          resolve();
        }
      }    

      for (let i = 0; i < imagePaths.length; i++) {
        let img = new Image();
        img.onload = cntLoaded;
        img.src = imagePaths[i];
        imageObjects.set(imagePaths[i].replace(/.*\/(.*)\..+/, '$1'), img);
      }
    });
  });
}

function keydown(e) {
  socket.emit('keydown', e.keyCode);
}

function paintGame(state) {
  //paint background
  let bgPattern = ctx.createPattern(imageObjects.get(BG_IMG_NAME), 'repeat');
  ctx.fillStyle = bgPattern;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  //paint game 
  if (gameState) {
  //for each player, print player cards
  //print totem
  }
}

function paintPlayer(playerState, size, colour) {
  const snake = playerState.snake;

  ctx.fillStyle = colour;
  for (let cell of snake) {
    ctx.fillRect(cell.x * size, cell.y * size, size, size);
  }
}

function handleSetPlayerNumber(number) {
  playerNumber = number;
  console.log(`Starting game as player ${playerNumber}`);
}

function handleGameState(state) {
  //gameState = JSON.parse(gameState);
  gameState = state;
  console.log(gameState);
  requestAnimationFrame(() => paintGame(gameState));
}

function handleGameOver(data) {
  if (!gameActive) {
    return;
  }
  data = JSON.parse(data);

  gameActive = false;

  if (data.winner === playerNumber) {
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
  alert('This game has too many players');
}

function reset() {
  playerNumber = null;
  gameState = null;
  gameCodeInput.value = '';
  initialScreen.style.display = "block";
  waitingScreen.style.display = "none";
  gameScreen.style.display = "none";
}
