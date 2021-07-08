export {gameCanvas};
const gameCanvas = new GameCanvas();

function GameCanvas() {
  //HTML canvas element to draw game on
  this.canvas = document.getElementById('canvas');
  this.ctx = canvas.getContext('2d');
  //game card, game object, and background images
  this.bg_image_name = 'pattern_pink_dots';
  this.imageObjects = new Map();
  //the canvas is divided into 5x5 gridcells used to position game images.
  this.grid = {
    cellSize: null,
    playerPositions: [],
  };

  //resize canvas and repaint the game when user resizes browser window
  this.activeResize = (gameState) => {
    $(window).on('resize', () => {
      this.canvas.height = window.innerHeight;
      this.canvas.width = window.innerWidth;
      //Math.min(this.canvas.height, this.canvas.width)
      //set this.grid.cellSize;
      requestAnimationFrame(() => this.paintGame(gameState));
    });
  };
  
  //setup 5x5 grid on canvas to display game images/text
  this.setGrid = (playerNumber, gameState) => {
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
      this.grid.playerPositions[currPlayer] = positions[i]; 
      currPlayer += 1;
    }
  };
  
  this.paintBG = () => {
    let bgPattern = this.ctx.createPattern(this.imageObjects.get(this.bg_image_name), 'repeat');
    this.ctx.fillStyle = bgPattern;
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
  
  this.paintGame = (gameState) => {
    this.canvas.height = window.innerHeight;
    this.canvas.width = window.innerWidth;
  
    //paint background
    let bgPattern = this.ctx.createPattern(this.imageObjects.get(this.bg_image_name), 'repeat');
    this.ctx.fillStyle = bgPattern;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  
    //paint game 
    if (gameState) {
    //for each player, print player cards
    //print totem
    }
  };
  
  this.paintPlayer = (playerState, size, colour) => {
    const snake = playerState.snake;
  
    this.ctx.fillStyle = colour;
    for (let cell of snake) {
      this.ctx.fillRect(cell.x * size, cell.y * size, size, size);
    }
  };
  
};
