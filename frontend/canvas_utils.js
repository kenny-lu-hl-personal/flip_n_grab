import { IMG_NAME_BG,
         IMG_NAME_CARD_BACKSIDE,
         IMG_NAME_TOTEM,
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

  //Called by mousemove event listener on the canvas element
  this.setMousePos = (event) => {
    let rect = canvas.getBoundingClientRect();
    this.mousePos.x = event.clientX - rect.left;
    this.mousePos.y = event.clientY - rect.top;
  };

  this.setFont = (fontRatio, font) => {
    let fontSize = Math.floor(fontRatio * Math.min(this.canvas.height, this.canvas.width));
    this.ctx.font = fontSize.toString() + 'px ' + font; 
    console.log(`font is set to: ${this.ctx.font}`);
  }

  this.resize = () => {
    this.canvas.height = Math.max(window.innerHeight, CANVAS_MIN_SIZE);
    this.canvas.width = Math.max(window.innerWidth, CANVAS_MIN_SIZE);
    this.gameDisplayGrid.setSize(this.canvas.height, this.canvas.width);
    this.setFont(CANVAS_FONT_RATIO_DEFAULT, CANVAS_FONT_FAMILY);
  }; 

  this.paintBG = () => {
    this.ctx.fillStyle = this.ctx.createPattern(this.imageObjects.get(IMG_NAME_BG), 'repeat');
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  };
  
  this.loadImages = () => {
    console.log('load images');
    return new Promise(resolve => {
      let folder = "static/game_collateral/images/";
      let imagePaths = [];  
      let imageObjects = this.imageObjects

      //jQuery AJAX function to find all image file paths on server
      function getImagePaths() {
        return $.ajax({
            url: folder,
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
  };
  
  this.paintGame = (clientPlayerNumber, gameState) => {
    //draw background
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.fillStyle = this.ctx.createPattern(this.imageObjects.get(IMG_NAME_BG), 'repeat');
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  
    //draw game
    if (gameState) {
      //draw pot cards
      this.paintCard(gameState.pot, 'front', GRID_POS_TOTEM_AND_POT);

      //draw cards of all players
      for (let i = 0; i < gameState.players.length ; i++) {
        this.paintPlayer(gameState.players[i], i);
      };

      //draw totem in the center of the grid
      let img = this.imageObjects.get(IMG_NAME_TOTEM);
      let displayPosition = 12; // Grid position 12 corresponds to center of the display grid.
      let canvasXCoord = this.gameDisplayGrid.positionCoordinates[displayPosition].x;
      let canvasYCoord = this.gameDisplayGrid.positionCoordinates[displayPosition].y;
      let canvasImgSize = Math.floor(this.gameDisplayGrid.cellSize);
      this.ctx.drawImage(img, canvasXCoord, canvasYCoord, canvasImgSize, canvasImgSize);  
      
      //If the client's mouse hovers over an actionable area, highlight the actionable area.
      this.paintMouseHoverPosition(clientPlayerNumber, gameState.phase, gameState.playerToFlip);
    }
   
  };
  
  this.paintMouseHoverPosition = (clientPlayerNumber, gamePhase, playerToFlip) => {
    let selection = this.gameDisplayGrid.coordToGridPos(this.mousePos);
    this.ctx.save();
    this.ctx.fillStyle = 'green';
    this.ctx.globalAlpha = 50/100; 

    console.log(selection);
    if (selection === GRID_POS_TOTEM_AND_POT) {
      let canvasXCoord = this.gameDisplayGrid.positionCoordinates[GRID_POS_TOTEM_AND_POT].x;
      let canvasYCoord = this.gameDisplayGrid.positionCoordinates[GRID_POS_TOTEM_AND_POT].y;
      this.ctx.fillRect(canvasXCoord, canvasYCoord, this.gameDisplayGrid.cellSize, this.gameDisplayGrid.cellSize);
    };
    if (selection === GRID_POS_CLIENT_PLAYDECK && clientPlayerNumber === playerToFlip) {
      let canvasXCoord = this.gameDisplayGrid.positionCoordinates[GRID_POS_CLIENT_PLAYDECK].x;
      let canvasYCoord = this.gameDisplayGrid.positionCoordinates[GRID_POS_CLIENT_PLAYDECK].y;
      this.ctx.fillRect(canvasXCoord, canvasYCoord, this.gameDisplayGrid.cellSize, this.gameDisplayGrid.cellSize);
    };
    this.ctx.restore();
  }
  
  
  this.paintPlayer = (player, playerNumber) => {
    //print discardPile
    //TODO: Add animation when flipping card.
    //TODO: Add random rotation of card when flipped.
    let playerPosition = this.gameDisplayGrid.playerPositions[playerNumber];
    this.paintCard(player.discardPile, 'front', playerPosition.discardPilePos);
    this.paintCard(player.playDeck, 'back', playerPosition.playDeckPos);

    //Write the player's cards counts on the canvas.
    if (player.playDeck.length > 0) {
      this.paintText('x' + player.playDeck.length.toString(), playerPosition.cntPlayDeckPos, 
                     playerPosition.cntAlignmentX, playerPosition.cntAlignmentY,
                     playerPosition.cntOffsetX, playerPosition.cntOffsetY)
    }
    if (player.discardPile.length > 0) {
      this.paintText('x' + player.discardPile.length.toString(), playerPosition.cntDiscardPilePos, 
                     playerPosition.cntAlignmentX, playerPosition.cntAlignmentY,
                     playerPosition.cntOffsetX, playerPosition.cntOffsetY)
    }
  }
  

  /** 
  *  Draws the top card of the given dick/pile of cards at the given grid position.
  *  @param  {Array}          cardDeck   Array of card Objects.   
  *  @param  {String}         side       valid values are 'front' and 'back.' Specifies which side of the card to draw. 
  *  @param  {Int}            gridPos    valid values are 0 through 24
  */
  this.paintCard = (cardDeck, side, gridPos) => {
    if (cardDeck.length > 0) {
      let img;
      if (side == 'front') {
        let card = cardDeck[cardDeck.length - 1];
        img = this.imageObjects.get(card.imgName);
      } else {
        img = this.imageObjects.get(IMG_NAME_CARD_BACKSIDE);
      }
      //Create margins between grid boundary and card image, so that the image does not completely fill the gridPos.
      let marginRatio = 0.025
      let margin = Math.floor(marginRatio * gameDisplayGrid.cellSize);
      let canvasXCoord = this.gameDisplayGrid.positionCoordinates[gridPos].x + margin;
      let canvasYCoord = this.gameDisplayGrid.positionCoordinates[gridPos].y + margin;
      let canvasImgSize = Math.floor(this.gameDisplayGrid.cellSize * (1 - 2*marginRatio));
      this.ctx.drawImage(img, canvasXCoord, canvasYCoord, canvasImgSize, canvasImgSize);
    }   
  };
  
  this.paintText = (text, gridPos, alignmentX, alignmentY, offsetX, offsetY) => {
    let x = this.gameDisplayGrid.positionCoordinates[gridPos].x + Math.floor(offsetX * this.gameDisplayGrid.cellSize);
    let y = this.gameDisplayGrid.positionCoordinates[gridPos].y + Math.floor(offsetY * this.gameDisplayGrid.cellSize);
    this.ctx.save();
    this.ctx.fillStyle = "#e60000";
    this.ctx.textBaseline = alignmentY;
    this.ctx.textAlign = alignmentX;
    this.ctx.fillText(text, x, y)
    this.ctx.restore();
  }


};

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
  
  this.coordToGridPos = (coords) => {
    //console.log(coords.x)
    //console.log(coords.y)
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
    this.canvasOffsetY = Math.floor((canvasHeight - this.size) / 2)
    this.canvasOffsetX = Math.floor((canvasWidth - this.size) / 2)
    this.positionCoordinates = [];
    for (let i = 0; i < Math.pow(GRID_COLUMN_AND_ROW_COUNT, 2); i++) {
      let canvasY = this.canvasOffsetY + Math.floor(i / GRID_COLUMN_AND_ROW_COUNT) * this.cellSize;
      let canvasX = this.canvasOffsetX + (i % GRID_COLUMN_AND_ROW_COUNT) * this.cellSize;
      this.positionCoordinates.push({x: canvasX, y:canvasY });
    }
  };

  /**
   * Called when game starts.
   * Assigns a PlayerPosition to each player.
   * @param  {Int}  clientPlayerNumber     playerNumber assigned to the client by the game server.
   * @param  {Int}  numberOfPlayers  Total number of players in the same game as the client.
   */
  this.setPlayerPositions = (clientPlayerNumber, numberOfPlayers) => {
    const posLower = new PlayerPosition(17, 22, 18, 23, 'left',   'middle');
    const posRight = new PlayerPosition(13, 14,  8,  9, 'center', 'bottom');  
    const posUpper = new PlayerPosition( 7,  2,  6,  1, 'right',  'middle');  
    const posLeft =  new PlayerPosition(11, 10, 16, 15, 'center', 'top');   
  
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
 *  Contains grid positions where a player's discardPile, playDeck, and status are displayed on the canvas.
 *  The canvas is divided into a 5x5 grid (since GRID_COLUMN_AND_ROW_COUNT === 5).
 *  Valid grid positions are represented by an Int in the range of 0 to 24.
 *  @constructor     
 *  @param  {Int}            discardPilePos  Position where the player's discardPile will be drawn.  
 *  @param  {Int}            playDeckPos     Position where the player's playDeck will be drawn.
 *  @param  {Int}            statusPos       Position where the player's card count will be displayed.
 *  @return {Object}         sta
 */
function PlayerPosition(discardPilePos, playDeckPos, cntDiscardPilePos, cntPlayDeckPos, cntAlignmentX, cntAlignmentY) {
  this.discardPilePos = discardPilePos;
  this.playDeckPos = playDeckPos;
  this.cntDiscardPilePos = cntDiscardPilePos;
  this.cntPlayDeckPos = cntPlayDeckPos;
  this.cntAlignmentX = cntAlignmentX;
  this.cntAlignmentY = cntAlignmentY;
  this.cntOffsetX;
  this.cntOffsetY;

  switch(this.cntAlignmentX) {
    case 'left':
      this.cntOffsetX = 0;
      break;
    case 'center':
      this.cntOffsetX = 0.5;
      break;
    case 'right':
      this.cntOffsetX = 1;
      break;
  }

  switch(this.cntAlignmentY) {
    case 'top':
      this.cntOffsetY = 0;
      break;
    case 'middle':
      this.cntOffsetY = 0.5;
      break;
    case 'bottom':
      this.cntOffsetY = 1;
      break;
  }
}


