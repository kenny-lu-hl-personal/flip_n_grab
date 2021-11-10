const { CARDS_PATTERN_COUNT,
        ANIMATION_DURATION_FLIP_CARD,
        ANIMATION_DURATION_MESSAGE,
        ANIMATION_FRAME_RATE_FLIP_CARD,
        ANIMATION_FRAME_RATE_MESSAGE, } = require('./constants');

module.exports = {
  initGame,
}

/**
 * Returns a game state object to be assigned to a socket io room.
 * @factory
 * @param  {Int}       numPlayers    Number of players in the socket io room.
 * @return {GameState}               GameState object initialized based on numPlayers.
 */
function initGame(numPlayers) {
  //Create and shuffle the 'pot'. A pot holds Cards that do not belong to any Player.
  let pot = [];
  for (const color of ['yellow', 'red', 'green', 'blue']) {
    for (let i = 0; i < CARDS_PATTERN_COUNT; i++) {
       pot.push(new Card(color, i, null));
    }
  }
  for (const special_rule of ['inward', 'outward', 'color']) {
    for (let i = 0; i < 4; i++) {
       pot.push(new Card(null, null, special_rule));
    }
  }

  Card.shuffle(pot)
  deckSize = Math.floor(pot.length / numPlayers)

  //Create Players and distribute Cards from the pot to the Players.
  const players = [];
  for (let i = 0; i < numPlayers; i++) {
    const startingPlayDeck = pot.splice(-deckSize, deckSize)
    const cardFlipFrameCounter = new FrameCounter(ANIMATION_DURATION_FLIP_CARD, ANIMATION_FRAME_RATE_FLIP_CARD)
    player = new Player(startingPlayDeck, [], cardFlipFrameCounter)
    players.push(player)
  }
  
  //The messenger allows game server to send in game messages that are animated by client browsers.
  const messageFrameCounter = new FrameCounter(ANIMATION_DURATION_MESSAGE, ANIMATION_FRAME_RATE_MESSAGE)
  const messenger = new Messenger(messageFrameCounter);

  const state = new GameState(pot, players, messenger);  
  return state;
}

/**
 * @constructor
 * @param {Array}                playDeck              //Array of Card objects representing player's face down cards.
 * @param {Array}                discardPile           //Array of Card objects representing player's face up cards.
 * @param {CardFlipFrameCounter} cardFlipFrameCounter  //Determines which animation frame to draw for the flip card animation on HTML canvas.
 * @param {Duel}                 duel                  //Duel object player is involved in. Default is null at player instantiation,
 *                                                     //since there are no matching face up cards when the game starts.
 */
function Player(playDeck, discardPile, cardFlipFrameCounter, duel = null) {
  this.playDeck = playDeck;                         
  this.discardPile = discardPile;                   
  this.cardFlipFrameCounter = cardFlipFrameCounter; 
  this.duel = null;                             
}
  
Player.prototype.showCard = function() {
  if (this.playDeck.length === 0) {
    throw new Error('player tried to flip card without a play deck')
  } else {
    let card = this.playDeck.pop();
    this.discardPile.push(card);
    this.cardFlipFrameCounter.start();
    return card;
  }
}

Player.prototype.moveDiscardPileToPlayDeck = function() {
  this.playDeck.push(...this.discardPile.splice(0));
  Card.shuffle(this.playDeck);
}

Player.matchCards = function(playerNumber, otherPlayerNumber, players, matchColors) {
  let player = players[playerNumber];
  let otherPlayer = players[otherPlayerNumber];
  if (player.discardPile.length && otherPlayer.discardPile.length) {
    let card = player.discardPile[player.discardPile.length - 1];
    let otherCard = otherPlayer.discardPile[otherPlayer.discardPile.length - 1];
    if (matchColors && card.color != null && card.color === otherCard.color) {return true;}
    if (!matchColors && card.pattern != null && card.pattern === otherCard.pattern) {return true};
  }
  return false
}

/**
 * @constructor
 * @param {FrameCounter}  frameCounter  //Determines which animation frame to draw for the message animation on HTML canvas.
 */
function Messenger(frameCounter) {         
  this.frameCounter = frameCounter; 
  this.message = '';                    
}

/**
 * Signals client to show the given in game message.
 * @param  {String}   text   In game message to be displayed by clients
 */
Messenger.prototype.send = function (message) {
  this.message = message;
  this.frameCounter.start();
}

/**
 * @constructor 
 * @param {Array}   pot           Array of Card objects. Represents cards that do not belong to any player.
 * @param {Array}   players       Array of Player objects. Each client is assigned to a player object in the array.
 * @param {Messenger} messenger   Keeps track of animation status of in game messages.
 * @param {String}  phase         Phase of the board game.
 *                                 'flip' - Server responds to flipCard and grabTotem emits.
 *                                 'duel' - Server responds to grabTotem emits.
 *                                 'pause'- Server does not respond to grabTotem & flipCard emits. 
 * @param {Boolean} matchColors   Players must activate duels based on matchColors  
 *                                 0 - match cards by pattern
 *                                 True - match cards by color
 * @param {Int}     playerToFlip  Index into players array. Represends player whos turn it is to flip a card.
 */
function GameState(pot, players, messenger, phase = 'flip', matchColors = false, playerToFlip = 0) {
  this.pot = pot;
  this.players = players;
  this.messenger = messenger;
  this.phase = phase;
  this.matchColors = matchColors;
  this.playerToFlip = 0;
  this.duelCnt = 0;              //The number of duels among all players. When duelCnt >= 1, gamePhase is set to duel.
  this.winningPlayers = [];      //Keeps track of players with no cards left. When winningPlayers.length > 0, the game ends.
}

//TODO: fix pause game not working correctly.
GameState.prototype.pauseForMessage = function(message) {
  //const prevPhase = this.phase;
  //this.phase = 'pause';
  this.messenger.send(message);

  //function resetPhase(phase) {
  //  this.phase = phase;
  //}
  //const resetGamePhase = resetPhase.bind(this);
  //setTimeout(resetPhase.bind(this, prevPhase), ANIMATION_DURATION_MESSAGE * 1000); 
}

GameState.prototype.flipCard = function(playerNumber) {
  console.log(`${playerNumber} requests to flip a card in ${this.phase} phase`);

  if (playerNumber != this.playerToFlip || this.phase != 'flip') { 
    console.log(`${playerNumber}'s request to flip a card is ignored`);
    return;
  } else {
    console.log(`${playerNumber} has flipped a card in ${this.phase} phase`);
  }  

  let card = this.players[playerNumber].showCard();
  if (card.special != null) { 
    this.matchColors = false;  //when a special card is drawn, revert to matching card by pattern
    if (card.special === 'inward') {
      this.envokeSpecialInward();
    } else if (card.special === 'color') {
      this.matchColors = true;
    } else if (card.special === 'outward') {
      this.envokeSpecialOutward();
    }
  }

  this.advancePlayerToFlip();
  this.updateWinningPlayers();
}

GameState.prototype.envokeSpecialInward = function () {
  this.duelCnt = 1;
  this.phase = 'duel';
  let duel = new Duel([...Array(this.players.length).keys()], true);
  for (i = 0; i < this.players.length; i++) {
    this.players[i].duel = duel;
  }
}

GameState.prototype.envokeSpecialOutward = function() {
  this.phase = 'pause';
  this.matchColors = false;

  function flipCardsForAll() { 
    let cards = [];
    let flippedSpecialInward = false;
    let flippedSpecialColor = false;
    let flippedSpecialOutward = false;
    let flippedMatching = false;

    this.players.forEach((player) => {
      if (player.playDeck.length > 0) {
        card = player.showCard();
        cards.push(card);
        if (card.special != null) {
          this.matchColors = false;
          switch(card.special) {
            case 'inward':
              flippedSpecialInward = true;
              break;
            case 'color':
              flippedSpecialColor = true;
              break;
            case 'outward':
              flippedSpecialOutward = true;
              break;
          }
        }
      }
    })

    if (flippedSpecialInward) {
      this.envokeSpecialInward();
      return;
    }
    if (flippedSpecialColor) {
      this.matchColors = true;
    }
    for (let i = 0; i < this.players.length - 1; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
         if (Player.matchCards(i, j, this.players, this.matchColors)) { flippedMatching = true; }
      }
    }
    if (flippedMatching) {
      this.phase = 'duel';
      return;
    }
    if (flippedSpecialOutward) {
      this.envokeSpecialOutward();
      return;
    }
    this.phase = 'flip';
  };

  const boundedflipCardsForAll = flipCardsForAll.bind(this)
  setTimeout( boundedflipCardsForAll, 3000); 
}

GameState.prototype.grabTotem = function(playerNumber) {
  
  if (this.phase === 'pause') { 
    return;
  }

  otherPlayerNumbers = [];
  for (let i = 0; i < this.players.length; i++) {
    if (i != playerNumber) { otherPlayerNumbers.push(i); }
  }

  let player = this.players[playerNumber];
  let involvedDuel = player.duel;

  if (player.discardPile.length === 0 && involvedDuel === null) {
    //Player has no face up cards to match with other players, and is not involved in inward arrow duel.
    this.transferCards(otherPlayerNumbers, [playerNumber]);
    this.pauseForMessage('Player ' + (playerNumber + 1).toString() + ' made a false grab.')
  } else if (involvedDuel != null) {
    involvedDuel.recordGrab(playerNumber);
    if (involvedDuel.isComplete()) { this.endDuel(involvedDuel); }
  } else {
    //Find all players with a matching card
    let matchingPlayerNumbers = [playerNumber];
    otherPlayerNumbers.forEach((otherPlayerNumber) => {
      if (Player.matchCards(playerNumber, otherPlayerNumber, this.players, this.matchColors)) {
        matchingPlayerNumbers.push(otherPlayerNumber);
      }
    })

    if (matchingPlayerNumbers.length === 1) {
      //If no players have matching card, this was wrong grab.
      this.transferCards(otherPlayerNumbers, [playerNumber]);
      this.pauseForMessage('Player ' + (playerNumber + 1).toString() + ' made a false grab.')
    } else {
      //If there are matching card(s), initiate a duel
      this.matchColors = false;          //match color mode ends whenever a duel begins
      this.duelCnt++;
      this.phase = 'duel';
      let newDuel = new Duel(matchingPlayerNumbers);
      matchingPlayerNumbers.forEach((playerNumber) => {
        this.players[playerNumber].duel = newDuel;
      })
      newDuel.recordGrab(playerNumber);
    }
  }

  this.updateWinningPlayers();
}

GameState.prototype.endDuel = function(duelToEnd) {
  let giversAndTakers = duelToEnd.getGiversAndTakers();
  if (duelToEnd.inwardArrow) {
    //Fastest player in a inwardArrow duel puts his or her discardPile in the pot.
    let fastestPlayer = this.players[giversAndTakers[0][0]]
    this.pot.push(...fastestPlayer.discardPile.splice(0));
    this.pauseForMessage('Player ' + (giversAndTakers[0][0] + 1).toString() + ' wins the duel.')
  } else {
    this.transferCards(giversAndTakers[0], giversAndTakers[1]);
    this.pauseForMessage('Player ' + (giversAndTakers[0][0] + 1).toString() + ' wins the duel.')
  }
  duelToEnd.getPlayerNumbers().forEach((number) => { 
    this.players[number].duel = null;
   });
  this.duelCnt--;
  if (this.duelCnt === 0) { this.phase = 'flip'; }
}

GameState.prototype.transferCards = function(givers, takers) {
  let cards = this.pot.splice(0);
  givers.forEach((giverNumber) => {
    cards.push(...this.players[giverNumber].discardPile);
    this.players[giverNumber].discardPile = [];
  });

  let splitCnt = Math.floor(cards.length / takers.length);
  takers.forEach((takerNumber) => {
    let taker = this.players[takerNumber];
    taker.playDeck.push(...taker.discardPile.splice(0));
    taker.playDeck.push(...cards.splice(0, splitCnt));
    taker.playDeck = Card.shuffle(taker.playDeck);
  });
  if (splitCnt) {
    this.players[takers[0]].playDeck.push(...Card.shuffle(cards));
  }
  //Player who takes the most cards starts the next round.
  this.playerToFlip = takers[0]
}

GameState.prototype.advancePlayerToFlip = function() {
  for (let i = 0; i < this.players.length; i++) {
    this.playerToFlip = (this.playerToFlip + 1) % this.players.length;
    if (this.players[this.playerToFlip].playDeck.length > 0) {return;}
  }
  this.playerToFlip = -1;
}

/**
 * Checks if players have cards left in their playDeck.
 * If all players do not have any card in their playDeck, 
 * all players take their discard piles as their play deck.
 */
GameState.prototype.updateWinningPlayers = function() {
  let playersWithoutCards = [];
  let playersWithoutPlayDeck = [];

  for (let i = 0; i < this.players.length; i++) {
    let player = this.players[i];
    if (player.discardPile.length === 0 && player.playDeck.length === 0) {
      playersWithoutCards.push(i);
    }
    if (player.playDeck.length === 0) {
      playersWithoutPlayDeck.push(i);
    }
  }

  if (playersWithoutCards.length > 0) {
    //Players who get rid of their discardPile and playDeck wins.
    this.winningPlayers = playersWithoutCards;
  } else if (playersWithoutPlayDeck.length === this.players.length) {
    //The game ends in a draw when players don't have cards left to flip.
    this.winningPlayers =  playersWithoutPlayDeck;
  } else {
    //Game continues without a winner(s)
    this.winningPlayers = [];
  }
}

/**
 * Represents the current frame and elapsed time of an animation.
 * Used to create animations on HTML canvas.
 * @constructor 
 * @param {Int}   duration              Length of the animation in seconds
 * @param {Int}   framesPerSecond       Number of animation frames per second
 */
function FrameCounter(duration, framesPerSecond) {
  this.duration = duration;
  this.framesPerSecond = framesPerSecond;
  this.frameCount = 0;
  this.maxFrameCount = Math.ceil(duration * framesPerSecond);
  this.active = false;
}


FrameCounter.prototype.start = function() {
  this.frameCount = 0;
  this.active = true;

  const intervalId = setInterval(() => {
    this.frameCount += 1;
    if (this.frameCount === this.maxFrameCount) {
      this.active = false;
      clearInterval(intervalId);
    }
  }, 1000 / this.framesPerSecond);  
}


/**
 * @constructor
 */
function Card(color, pattern, special) {
  this.color = color;
  this.pattern = pattern;
  this.special = special;
  this.imgName = '';

  if (this.special === null) {
    this.imgName = this.color + '_' + this.pattern;
  } else {
    this.imgName = 'special_' + this.special;
  }
}

Card.shuffle = function(cards) {
  let temp, randomPos;
  for (let lastPos = cards.length - 1; lastPos > 0; lastPos--) {
    randomPos = Math.floor(Math.random() * (lastPos + 1));
    temp = cards[lastPos];
    cards[lastPos] = cards[randomPos];
    cards[randomPos] = temp;
  }
  return cards;
}

/**
 * A duel tracks the order in which players with matching cards grab the totem.
 * A duel is instantiated by handleGrabTotem() when a player emits 'grabTotem' event,
 * and there are other player(s) with matching card(s).
 * @constructor 
 */
//TODO: Add functionality to track time duel object was created, and how long it has been since then.
function Duel(playerNumbers, inwardArrow = false) {
  this.playerGrabOrder = new Map();       //Maps playerNumber to order in which that player grabs the totem.
  this.nextGrabOrder = 1;                 //Order assigned to next player who grabs to totem.
  this.inwardArrow = inwardArrow;         //true if this duel is triggered by matching patterns or color
                                          //false if this duel is triggered by inward matching arrow
  this.testOrder = [];

  playerNumbers.forEach((playerNumber) => {
    this.playerGrabOrder.set(playerNumber, Infinity);
  })
}

  /**
   * Called by handleGrabTotem() when a player involved in a duel emits 'grabTotem' event.
   * @param  {Int}      playerNumber   player who grabs the Totem
   * @return {Boolean}                 True when all players have grabbed totem, False otherwise.
   */

Duel.prototype.recordGrab = function(playerNumber) {
  if (this.playerGrabOrder.has(playerNumber) && this.playerGrabOrder.get(playerNumber) === Infinity) {
    this.playerGrabOrder.set(playerNumber, this.nextGrabOrder);
    this.nextGrabOrder++;
    this.testOrder.push(playerNumber);
  }
}

/**
 * @return {Boolean}  True when all involved players have grabbed totem, False otherwise.
 */
Duel.prototype.isComplete = function() {
  return (this.nextGrabOrder > this.playerGrabOrder.size) ? true : false;  
}

Duel.prototype.getPlayerNumbers = function() {
  return Array.from(this.playerGrabOrder.keys());
}

Duel.prototype.getGiversAndTakers = function() {
  let givers = [];
  let takers = [];
  if (this.nextGrabOrder > this.playerGrabOrder.size) {
    //if all players in duel have grabbed the totem, everyone except slowest player give their discardPile
    let map = this.playerGrabOrder;
    let sortedPlayers = Array.from(map.keys()).sort(function (a,b) {
      return map.get(a) - map.get(b);
    });
    givers = (sortedPlayers.slice(0, sortedPlayers.length - 1));
    takers.push(sortedPlayers[sortedPlayers.length - 1]);
  } else {
    //all players who have grabbed the totem give their discardPile
    for (const [playerNumber, grabOrder] of this.playerGrabOrder.entries()) {
      if (grabOrder != Infinity) {
        givers.push(playerNumber);
      } else {
        takers.push(playerNumber);
      }
    }
  }
  return [givers, takers];
}
