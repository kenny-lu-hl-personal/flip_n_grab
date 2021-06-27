module.exports = {
  initGame,
  gameLoop,
}

function initGame(numPlayers) {
  console.log('initializing game state');
  const state = {
    //Phase of the board game
    //'flip' - respond to flipCard and grabTotem emits
    //'duel' - respond to grabTotem emits
    //'pause' - do not respond to grabTotem & flipCard emits 
    gamePhase: 'pause',

    //Cards that do not belong to any player.
    pot: [],

    //contains player objects
    players: [],

    totem: null,

    //0 - matching in pattern mode
    //>= 1 - match in color mode. Integer value corresponds to player who activated the special rule
    matchColors: 0,
    
    //When a player object that has a non-null duel attribute emits a grabTotem event, a duel is activated
    //When activeDuelCnt >= 1, gamePhase is set to duel.
    activeDuelCnt: 0,
    
    //index of players array correspoding to the player whos turn it is to flip a card
    playerToFlip: 0,

    //number of clients browsers that have finised loading collateral
    collatLoaded: 0,
  };
  
  //create and shuffle the 'pot'
  for (const color of ['yellow', 'red', 'green', 'blue']) {
    for (let i = 0; i < 18; i++) {
       state.pot.push(new card(color, i, null));
    }
  }
  for (const special_rule of ['inward', 'outward', 'color']) {
    for (let i = 0; i < 4; i++) {
       state.pot.push(new card(null, null, special_rule));
    }
  }
  shuffleCards(state.pot)

  //initialize players and distribute cards from the pot
  deckSize = Math.floor(state.pot.length / numPlayers)
  for (let i = 0; i < numPlayers; i++) {
    state.players.push(new player(state.pot.splice(-deckSize, deckSize)))
  }
  
  return state;
}

//function createGameState() {
//  return {
//    players: array of player objects,
//    totem: totemobject
//  };
//}

function player(playDeck) {
  this.playDeck = playDeck;   //array of card objects
  this.discardPile = [];      //array of card objects
  this.flipStatus = 0;        //0 if not flipping card. non-zero int signifies flip car animation stage). The card to be animated is top of cards_discard_pile            
  this.duel = null;           //duel object
  this.deckPosition = null;   //position of players card on canvas. Relative position  
}

function card(color, pattern, special) {
  this.color = color;
  this.pattern = pattern;
  this.special = special;
}

function gameLoop(state) {
  if (!state) {
    return;
  }

  const playerOne = state.players[0];
  const playerTwo = state.players[1];

  playerOne.pos.x += playerOne.vel.x;
  playerOne.pos.y += playerOne.vel.y;

  playerTwo.pos.x += playerTwo.vel.x;
  playerTwo.pos.y += playerTwo.vel.y;

  if (playerOne.pos.x < 0 || playerOne.pos.x > GRID_SIZE || playerOne.pos.y < 0 || playerOne.pos.y > GRID_SIZE) {
    return 2;
  }

  if (playerTwo.pos.x < 0 || playerTwo.pos.x > GRID_SIZE || playerTwo.pos.y < 0 || playerTwo.pos.y > GRID_SIZE) {
    return 1;
  }

  if (state.food.x === playerOne.pos.x && state.food.y === playerOne.pos.y) {
    playerOne.snake.push({ ...playerOne.pos });
    playerOne.pos.x += playerOne.vel.x;
    playerOne.pos.y += playerOne.vel.y;
    randomFood(state);
  }

  if (state.food.x === playerTwo.pos.x && state.food.y === playerTwo.pos.y) {
    playerTwo.snake.push({ ...playerTwo.pos });
    playerTwo.pos.x += playerTwo.vel.x;
    playerTwo.pos.y += playerTwo.vel.y;
    randomFood(state);
  }

  if (playerOne.vel.x || playerOne.vel.y) {
    for (let cell of playerOne.snake) {
      if (cell.x === playerOne.pos.x && cell.y === playerOne.pos.y) {
        return 2;
      }
    }

    playerOne.snake.push({ ...playerOne.pos });
    playerOne.snake.shift();
  }

  if (playerTwo.vel.x || playerTwo.vel.y) {
    for (let cell of playerTwo.snake) {
      if (cell.x === playerTwo.pos.x && cell.y === playerTwo.pos.y) {
        return 1;
      }
    }

    playerTwo.snake.push({ ...playerTwo.pos });
    playerTwo.snake.shift();
  }

  return false;
}

function shuffleCards(cards) {
  let temp, randomPos;
  for (let lastPos = cards.length - 1; lastPos > 0; lastPos--) {
    randomPos = Math.floor(Math.random() * (lastPos + 1));
    temp = cards[lastPos];
    cards[lastPos] = cards[randomPos];
    cards[randomPos] = temp;
  }
  return cards;
}

