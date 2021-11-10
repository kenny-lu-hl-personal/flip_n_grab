import { IMG_NAME_BG,
         IMG_NAME_CARD_BACKSIDE,
         IMG_NAME_TOTEM,
         IMG_NAME_HAND,
         CANVAS_MIN_SIZE,
         CANVAS_FONT_RATIO_DEFAULT,
         CANVAS_FONT_FAMILY,
         GRID_COLUMN_AND_ROW_COUNT,
         GRID_POS_TOTEM_AND_POT,
         GRID_POS_CLIENT_PLAYDECK } from './constants.js'

export { gameCanvas };

let tempSize = CANVAS_MIN_SIZE;
const gameCanvas = new GameCanvas(document.getElementById('canvas'),
                                  new Map(),
                                  new GameDisplayGrid(tempSize));
/**
 * @constructor
 */
function GameCanvas(canvas, imageObjects, gameDisplayGrid) {
  this.canvas = canvas;
  this.imageObjects = imageObjects;
  this.gameDisplayGrid = gameDisplayGrid;
  this.ctx = this.canvas.getContext('2d');
  this.mousePos = {x: 0, y: 0};  //position of the clients mouse in the canvas
}

  //Called by mousemove event listener on the canvas element
GameCanvas.prototype.setMousePos = function(event) {
  let rect = canvas.getBoundingClientRect();
  this.mousePos.x = event.clientX - rect.left;
  this.mousePos.y = event.clientY - rect.top;
}

GameCanvas.prototype.setFont = function(fontRatio, font) {
  let fontSize = Math.floor(fontRatio * Math.min(this.canvas.height, this.canvas.width));
  this.ctx.font = fontSize.toString() + 'px ' + font; 
  console.log(`font is set to: ${this.ctx.font}`);
}

GameCanvas.prototype.resize = function() {
  this.canvas.height = Math.max(window.innerHeight, CANVAS_MIN_SIZE);
  this.canvas.width = Math.max(window.innerWidth, CANVAS_MIN_SIZE);
  this.gameDisplayGrid.setSize(this.canvas.height, this.canvas.width);
  this.setFont(CANVAS_FONT_RATIO_DEFAULT, CANVAS_FONT_FAMILY);
}

GameCanvas.prototype.paintBG = function() {
  this.ctx.fillStyle = this.ctx.createPattern(this.imageObjects.get(IMG_NAME_BG), 'repeat');
  this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
}

GameCanvas.prototype.loadImages = function() {
  console.log('load images');
  return new Promise(resolve => {

  let path = "https://www.flipngrab.com/static/game_collateral/images/listing_images.html";
    let imagePaths = [];  
    let imageObjects = this.imageObjects

    //jQuery AJAX function to find all image file paths on server
    function getImagePaths() {
      return $.ajax({
          url: path,
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

GameCanvas.prototype.paintGame = function(clientPlayerNumber, gameState) {
  //draw background
  this.ctx.clearRect(0, 0, canvas.width, canvas.height);
  this.ctx.fillStyle = this.ctx.createPattern(this.imageObjects.get(IMG_NAME_BG), 'repeat');
  this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

  //draw game
  if (gameState) {
    //draw pot cards
    this.paintDeck(gameState.pot, 1, 'front', GRID_POS_TOTEM_AND_POT);
    if (gameState.pot.length > 0) {
      this.paintText('x' + gameState.pot.length.toString(), GRID_POS_TOTEM_AND_POT, 'right', 'bottom', 0.95, 0.95);
    }

    //draw cards and names of all players
    for (let i = 0; i < gameState.players.length ; i++) {
      this.paintPlayer(gameState.players[i], i);
    }

    //draw totem in the center of the grid
    let img = this.imageObjects.get(IMG_NAME_TOTEM);
    let displayPosition = 12; // Grid position 12 corresponds to center of the display grid.
    let canvasXCoord = this.gameDisplayGrid.positionCoordinates[displayPosition].x;
    let canvasYCoord = this.gameDisplayGrid.positionCoordinates[displayPosition].y;
    let canvasImgSize = Math.floor(this.gameDisplayGrid.cellSize);
    this.ctx.drawImage(img, canvasXCoord, canvasYCoord, canvasImgSize, canvasImgSize);  
    
    this.paintGrabTotem(gameState.players);

    //If the client's mouse hovers over an actionable area, highlight the actionable area.
    this.paintMouseSelection(clientPlayerNumber, gameState.phase, gameState.playerToFlip);

    this.paintInGameMessage(gameState.messenger);
  }
}

GameCanvas.prototype.paintInGameMessage = function(messenger) {
  if (messenger.frameCounter.active) {
    this.ctx.save();
    this.ctx.fillStyle = 'black'
    this.ctx.fillRect(0, this.canvas.height * 0.25, this.canvas.width, this.canvas.height * 0.5);
    this.ctx.restore();
    this.paintText(messenger.message, GRID_POS_TOTEM_AND_POT, 'center', 'middle', 0.5, 0.5);      
  }
}

GameCanvas.prototype.paintGrabTotem = function(players) {
  let handImg = this.imageObjects.get(IMG_NAME_HAND);
  let scaledImgSize = Math.floor(this.gameDisplayGrid.cellSize * 0.9);

  let duels = new Set();
  players.forEach((player) => {
    if (player.duel != null) { duels.add(player.duel); }
  })
  duels.forEach((duel) => {
    duel.testOrder.forEach((playerNumber) => {
      let player = players[playerNumber];
      let playerPosition = this.gameDisplayGrid.playerPositions[playerNumber]
      let centerX = this.gameDisplayGrid.canvasOffsetX + this.gameDisplayGrid.size/2;
      let centerY = this.gameDisplayGrid.canvasOffsetY + this.gameDisplayGrid.size/2;
      this.ctx.save();
      this.ctx.translate(Math.floor(centerX + playerPosition.handOffsetX * this.gameDisplayGrid.cellSize), 
                         Math.floor(centerY + playerPosition.handOffsetY * this.gameDisplayGrid.cellSize));
      this.ctx.rotate(playerPosition.handRotation * Math.PI/180);
      this.ctx.drawImage(handImg, -scaledImgSize/2, 0, scaledImgSize, scaledImgSize);  
      this.ctx.restore();
    })
  })
}

GameCanvas.prototype.paintMouseSelection = function(clientPlayerNumber, gamePhase, playerToFlip) {
  let selection = this.gameDisplayGrid.coordToGridPos(this.mousePos);
  this.ctx.save();
  this.ctx.fillStyle = 'green';
  this.ctx.globalAlpha = 50/100; 

  if (selection === GRID_POS_TOTEM_AND_POT && gamePhase != 'pause') {
    let canvasXCoord = this.gameDisplayGrid.positionCoordinates[GRID_POS_TOTEM_AND_POT].x;
    let canvasYCoord = this.gameDisplayGrid.positionCoordinates[GRID_POS_TOTEM_AND_POT].y;
    this.ctx.fillRect(canvasXCoord, canvasYCoord, this.gameDisplayGrid.cellSize, this.gameDisplayGrid.cellSize);
  };
  if (selection === GRID_POS_CLIENT_PLAYDECK && gamePhase === 'flip' && clientPlayerNumber === playerToFlip) {
    let canvasXCoord = this.gameDisplayGrid.positionCoordinates[GRID_POS_CLIENT_PLAYDECK].x;
    let canvasYCoord = this.gameDisplayGrid.positionCoordinates[GRID_POS_CLIENT_PLAYDECK].y;
    this.ctx.fillRect(canvasXCoord, canvasYCoord, this.gameDisplayGrid.cellSize, this.gameDisplayGrid.cellSize);
  };
  this.ctx.restore();
}

GameCanvas.prototype.paintPlayer = function(player, playerNumber) {
  //print discardPile
  //TODO: Add animation when flipping card.
  //TODO: Add random rotation of card when flipped.
  let playerPosition = this.gameDisplayGrid.playerPositions[playerNumber];

  if (player.cardFlipFrameCounter.active && player.discardPile.length > 0) {
    let flippedCard = player.discardPile[player.discardPile.length - 1];
    let animationProgress = getFrame(player.cardFlipFrameCounter, 'progress')
    this.paintDeck(player.discardPile, 2,'front', playerPosition.discardPilePos);
    this.paintDeck(player.playDeck, 1, 'back', playerPosition.playDeckPos);
    this.paintFlipCard(flippedCard, playerPosition.playDeckPos, playerPosition.discardPilePos, animationProgress);
  } else {
    this.paintDeck(player.discardPile, 1, 'front', playerPosition.discardPilePos);
    this.paintDeck(player.playDeck, 1, 'back', playerPosition.playDeckPos);
  }

  //Display the player's cards counts on the canvas.
  if (player.playDeck.length > 0) {
    this.paintText('x' + player.playDeck.length.toString(), playerPosition.cntPlayDeckPos, 
                   playerPosition.cntAlignmentX, playerPosition.cntAlignmentY,
                   playerPosition.cntOffsetX, playerPosition.cntOffsetY);
  }
  if (player.discardPile.length > 0) {
    this.paintText('x' + player.discardPile.length.toString(), playerPosition.cntDiscardPilePos, 
                   playerPosition.cntAlignmentX, playerPosition.cntAlignmentY,
                   playerPosition.cntOffsetX, playerPosition.cntOffsetY);
  }

  //Display player numbers next to their cards
  this.paintText('Player ' + (1 + playerNumber).toString(), playerPosition.namePos, 
                  playerPosition.nameAlignmentX, playerPosition.nameAlignmentY,
                  playerPosition.nameOffsetX, playerPosition.nameOffsetY, 'white');
}


GameCanvas.prototype.paintFlipCard = function(card, startPosition, endPosition, animationProgress) {
  //Card image is scaled in X direction based on animationProgress.
  let scaleX = (animationProgress * 2) - 1;
 
  //Card image is moved across the canvas based on animationProgress.
  let startX = this.gameDisplayGrid.positionCoordinates[startPosition].x + this.gameDisplayGrid.cellMargin;
  let startY = this.gameDisplayGrid.positionCoordinates[startPosition].y + this.gameDisplayGrid.cellMargin;
  let endX = this.gameDisplayGrid.positionCoordinates[endPosition].x + this.gameDisplayGrid.cellMargin;
  let endY = this.gameDisplayGrid.positionCoordinates[endPosition].y + this.gameDisplayGrid.cellMargin;
  let deltaX = (endX - startX) * animationProgress * (1/scaleX);
  let deltaY = (endY - startY) * animationProgress;
  let scaledImgSize = this.gameDisplayGrid.cellSizeMargined

  this.ctx.save();
  this.ctx.translate(startX + scaledImgSize/2, startY);
  this.ctx.scale(Math.abs(scaleX), 1);

  if (scaleX >= 0) {
    //When scaling factor is > 0, frontside of the card is drawn
    let frontImg = this.imageObjects.get(card.imgName);
    this.ctx.drawImage(frontImg, deltaX - scaledImgSize/2, deltaY, scaledImgSize, scaledImgSize);
  } else {
    //When scaling factor is between -1 and 0, backside of the card is drawn
    let backImg = this.imageObjects.get(IMG_NAME_CARD_BACKSIDE);
    this.ctx.drawImage(backImg, deltaX - scaledImgSize/2, deltaY, scaledImgSize, scaledImgSize);
  }

  this.ctx.restore();
}

/** 
*  Draws a card in the given dick/pile of cards at the given grid position.
*  @param  {Array}          cardDeck   Array of card Objects.   
*  @param  {Int}            index      Identifies the card in cardDeck to draw. Valid values between 1 and cardDeck.length.
*                                      1 indicates last card in the array. cardDeck.length indicates first card in the array.
*  @param  {String}         side       Valid values are 'front' and 'back.' Specifies which side of the card to draw. 
*  @param  {Int}            gridPos    Valid values are 0 through 24
*/
GameCanvas.prototype.paintDeck = function(cardDeck, index, side, gridPos) {
  if (cardDeck.length - index >= 0 && cardDeck.length - index < cardDeck.length) {
    let img;
    if (side == 'front') {
      let card = cardDeck[cardDeck.length - index];
      img = this.imageObjects.get(card.imgName);
    } else {
      img = this.imageObjects.get(IMG_NAME_CARD_BACKSIDE);
    }
    let x = this.gameDisplayGrid.positionCoordinates[gridPos].x + this.gameDisplayGrid.cellMargin;
    let y = this.gameDisplayGrid.positionCoordinates[gridPos].y + this.gameDisplayGrid.cellMargin;
    this.ctx.drawImage(img, x, y, this.gameDisplayGrid.cellSizeMargined, this.gameDisplayGrid.cellSizeMargined);
  }
}

GameCanvas.prototype.paintText = function(text, gridPos, alignmentX, alignmentY, offsetX, offsetY, color = "white") {
  let x = this.gameDisplayGrid.positionCoordinates[gridPos].x + Math.floor(offsetX * this.gameDisplayGrid.cellSize);
  let y = this.gameDisplayGrid.positionCoordinates[gridPos].y + Math.floor(offsetY * this.gameDisplayGrid.cellSize);
  this.ctx.save();
  this.ctx.fillStyle = color;
  this.ctx.textBaseline = alignmentY;
  this.ctx.textAlign = alignmentX;
  this.ctx.fillText(text, x, y)
  this.ctx.restore();
}

/**
 * @constructor
 */
function GameDisplayGrid(size, canvasOffsetY = 0, canvasOffsetX = 0, positionCoordinates = [], playerPositions = []) {
  this.size = size;
  this.cellSize = Math.floor(this.size / GRID_COLUMN_AND_ROW_COUNT);
  this.canvasOffsetY = canvasOffsetY;
  this.canvasOffsetX = canvasOffsetX;
  this.positionCoordinates = positionCoordinates;  //holds x and y coordinates of each position on the display grid
  this.playerPositions = playerPositions;          //holds PlayerPosition for each player in the game
  this.cellMargin = 0;
  this.cellSizeMargined = 0;

  this.coordToGridPos = (coords) => {
    if (coords.x > this.canvasOffsetX && coords.x < this.canvasOffsetX + this.size &&
        coords.y > this.canvasOffsetY && coords.y < this.canvasOffsetY + this.size) {
      let col = Math.floor((coords.x - this.canvasOffsetX) / this.cellSize);
      let row = Math.floor((coords.y - this.canvasOffsetY) / this.cellSize);
      return row * GRID_COLUMN_AND_ROW_COUNT + col;
    }  
    return -1;
  };

  /**
   * Called by GameCanvas.resize() when game starts or browser is resized.
   * Resets canvas coordinates to display game images. 
   * @param  {Int}  gameDisplaySize  Width or height of the game display area in pixels. The game display area is a square.
   */
  this.setSize = (canvasHeight, canvasWidth) => {
    this.size = Math.min(canvasHeight, canvasWidth);
    this.cellSize = Math.floor(this.size / GRID_COLUMN_AND_ROW_COUNT);
    this.canvasOffsetY = Math.floor((canvasHeight - this.size)/2)
    this.canvasOffsetX = Math.floor((canvasWidth - this.size)/2)
    this.positionCoordinates = [];
    for (let i = 0; i < Math.pow(GRID_COLUMN_AND_ROW_COUNT, 2); i++) {
      let canvasY = this.canvasOffsetY + Math.floor(i / GRID_COLUMN_AND_ROW_COUNT) * this.cellSize;
      let canvasX = this.canvasOffsetX + (i % GRID_COLUMN_AND_ROW_COUNT) * this.cellSize;
      this.positionCoordinates.push({x: canvasX, y:canvasY });
    }

    let marginRatio = 0.025
    this.cellMargin = Math.floor(marginRatio * this.cellSize);
    this.cellSizeMargined = Math.floor(this.cellSize * (1 - 2 * marginRatio));
  };

  /**
   * Called when game starts.
   * Assigns a PlayerPosition to each player.
   * @param  {Int}  clientPlayerNumber     playerNumber assigned to the client by the game server.
   * @param  {Int}  numberOfPlayers  Total number of players in the same game as the client.
   */
  this.setPlayerPositions = (clientPlayerNumber, numberOfPlayers) => {
    const posLower = new PlayerPosition(22);
    const posRight = new PlayerPosition(14);  
    const posUpper = new PlayerPosition(2);  
    const posLeft =  new PlayerPosition(10);   
  
    let positions = [];
    switch(numberOfPlayers) {
      case 2:
        positions = [posLower, posUpper];
        break;
      case 3:
        positions = [posLower, posRight, posLeft];
        break;
      case 4:
        positions = [posLower, posRight, posUpper, posLeft];
        break;
    }
  
    let currPlayer = clientPlayerNumber;  
    for (let i = 0; i < positions.length; i++) {
      if (currPlayer === numberOfPlayers) {
        currPlayer = 0;
      }
      this.playerPositions[currPlayer] = positions[i]; 
      currPlayer += 1;
    }

    console.log(this.playerPositions);
  };
}

/** 
 *  Contains grid positions where a player's discardPile, playDeck, and card cards, and player name are displayed.
 *  The canvas is divided into a 5x5 grid (since GRID_COLUMN_AND_ROW_COUNT === 5).
 *  Grid positions are represented by an Int in the range of 0 to 24.
 *  @constructor 
 *  @param  {Int}            playDeckPos     Position where the player's playDeck will be drawn.
 *  @return {Object}         
 */
function PlayerPosition(playDeckPos) {
  this.playDeckPos = playDeckPos;

  switch(playDeckPos) {
    case 22:
      this.discardPilePos = 17;
      this.cntDiscardPilePos = 18; 
      this.cntPlayDeckPos = 23;
      this.namePos = 23;
      this.cntAlignmentX = 'left';
      this.cntAlignmentY = 'middle';
      this.cntOffsetX = 0;
      this.cntOffsetY = 0.5;
      this.nameAlignmentX = 'left';
      this.nameAlignmentY = 'bottom';
      this.nameOffsetX = 0;
      this.nameOffsetY = 0.95;
      this.handRotation = 0;
      this.handOffsetX = 0;
      this.handOffsetY = -0.2;
      break;
    case 14:
      this.discardPilePos = 13;
      this.cntDiscardPilePos = 8; 
      this.cntPlayDeckPos = 9;
      this.namePos = 9;
      this.cntAlignmentX = 'center';
      this.cntAlignmentY = 'bottom';
      this.cntOffsetX = 0.5;
      this.cntOffsetY = 1;
      this.nameAlignmentX = 'right';
      this.nameAlignmentY = 'middle';
      this.nameOffsetX = 1;
      this.nameOffsetY = 0.55;
      this.handRotation = 270;
      this.handOffsetX = -0.2;
      this.handOffsetY = 0;
      break;
    case 2:
      this.discardPilePos = 7;
      this.cntDiscardPilePos = 6; 
      this.cntPlayDeckPos = 1;
      this.namePos = 1;
      this.cntAlignmentX = 'right';
      this.cntAlignmentY = 'middle';
      this.cntOffsetX = 1;
      this.cntOffsetY = 0.5;
      this.nameAlignmentX = 'right';
      this.nameAlignmentY = 'top';
      this.nameOffsetX = 1;
      this.nameOffsetY = 0.1; 
      this.handRotation = 180;
      this.handOffsetX = 0;
      this.handOffsetY = 0.2;     
      break;
    case 10:
      this.discardPilePos = 11;
      this.cntDiscardPilePos = 16; 
      this.cntPlayDeckPos = 15;
      this.namePos = 15;
      this.cntAlignmentX = 'center';
      this.cntAlignmentY = 'top';
      this.cntOffsetX = 0.5;
      this.cntOffsetY = 0;
      this.nameAlignmentX = 'left';
      this.nameAlignmentY = 'middle';
      this.nameOffsetX = 0;
      this.nameOffsetY = 0.4;
      this.handRotation = 90;
      this.handOffsetX = 0.2;
      this.handOffsetY = 0;  
      break;    
  }

}

function getFrame(frameCounter, option) {
  if (option === 'count') {
    return frameCounter.frameCount;
  } else if (option === 'elapsedTime') {
    return (frameCounter.frameCount * frameCounter.framesPerSecond);
  } else if (option === 'progress') {
    return ((frameCounter.frameCount / frameCounter.maxFrameCount));
  } else {
    throw new Error('Invalid input argument for function parameter "option".');
  }
}
