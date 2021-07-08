let MAX_CARDFLIP_FRAMES = 20;

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
       state.pot.push(new Card(color, i, null));
    }
  }
  for (const special_rule of ['inward', 'outward', 'color']) {
    for (let i = 0; i < 4; i++) {
       state.pot.push(new Card(null, null, special_rule));
    }
  }
  shuffleCards(state.pot)

  //initialize players and distribute cards from the pot
  deckSize = Math.floor(state.pot.length / numPlayers)
  for (let i = 0; i < numPlayers; i++) {
    state.players.push(new Player(state.pot.splice(-deckSize, deckSize)))
  }
  
  return state;
}

//function createGameState() {
//  return {
//    players: array of player objects,
//    totem: totemobject
//  };
//}

function Player(playDeck) {
  this.playDeck = playDeck;   //array of Card objects representing player's face down cards
  this.discardPile = [];      //array of Card objects representing player's face up cards
  this.cardFlipFrameCounter = new AnimationFrameCounter(MAX_CARDFLIP_FRAMES); //Used by clients to draw card flip animation on HTML canvas
  this.duel = null;           //Duel object
  this.deckPosition = null;   //position of players card on canvas. Relative position
  
  this.flipCard = () => {
    if (this.playDeck.length === 0) {
      throw new Error('player tried to flip card without a play deck')
    } else {
      this.discardPile.push(this.playDeck.pop())
    }
  }
}

/**
 *Counter used by client to draw animation on HTML canvas.
 *Counter value of 0 means animation has stopped. 
 *Animation will have 'maxFrame' frames. 
 *Counter value from 1 to maxFrames signifies which animation frame to draw.
 */
function AnimationFrameCounter(maxFrames) {
  this.maxFrames = maxFrames;
  this.counter = 0;
  this.updateCounter = () => {
    if (this.counter != 0) {
      this.counter += 1;
      this.counter %= maxFrames;
    }
  };
  this.startCounter = () => {
    this.counter = 1;
  };
}

function Card(color, pattern, special) {
  this.color = color;
  this.pattern = pattern;
  this.special = special;
}

function gameLoop(state) {
  if (!state) {
    return;
  } else {
    state.players.forEach((player) => {
      player.cardFlipFrameCounter.updateCounter();
    });
    return false;
  }
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

