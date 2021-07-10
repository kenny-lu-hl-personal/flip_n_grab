let MAX_CARDFLIP_FRAMES = 20;

module.exports = {
  initGame,
  gameLoop,
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
    for (let i = 0; i < 18; i++) {
       pot.push(new Card(color, i, null));
    }
  }
  for (const special_rule of ['inward', 'outward', 'color']) {
    for (let i = 0; i < 4; i++) {
       pot.push(new Card(null, null, special_rule));
    }
  }
  shuffleCards(pot)
  console.log(pot.length)

  //Create Players and distribute Cards from the pot to the Players.
  let players = [];
  deckSize = Math.floor(pot.length / numPlayers)
  for (let i = 0; i < numPlayers; i++) {
    startingPlayDeck = pot.splice(-deckSize, deckSize)
    player = new Player(startingPlayDeck, [], new AnimationFrameCounter(MAX_CARDFLIP_FRAMES))
    players.push(player)
  }

  console.log(pot.length)
  const state = new GameState('flip', pot, players, null);  
  return state;
}

/**
 * @constructor
 * @param {Array}                playDeck              //Array of Card objects representing player's face down cards.
 * @param {Array}                discardPile           //Array of Card objects representing player's face up cards.
 * @param {CardFlipFrameCounter} cardFlipFrameCounter  //Used by clients to draw card flip animation on HTML canvas.
 * @param {Duel}                 duel                  //Duel object player is involved in. Default is null at player instantiation,
 *                                                     //since there are no matching face up cards when the game starts.
 */
function Player(playDeck, discardPile, cardFlipFrameCounter, duel = null) {
  this.playDeck = playDeck;                         
  this.discardPile = discardPile;                   
  this.cardFlipFrameCounter = cardFlipFrameCounter; 
  this.duel = null;                                 
  
  //TODO: part of complete functionality must be moved to GameState.
  this.flipCard = () => {
    if (this.playDeck.length === 0) {
      throw new Error('player tried to flip card without a play deck')
    } else {
      this.discardPile.push(this.playDeck.pop())
    }
  };
}

Player.transferCards = (givers, takers, players) => {
  let cards = [];
  givers.forEach((giverNumber) => {
    cards.push(...players[giverNumber].discardPile);
    players[giverNumber].discardPile = [];
  });

  let splitCnt = Math.floor(cards.length / takers.length);
  takers.forEach((takerNumber) => {
    let taker = players[takerNumber];
    taker.playDeck.push(...taker.discardPile.splice(0));
    taker.playDeck.push(...cards.splice(0, splitCnt));
    taker.playDeck = shuffleCards(taker.playDeck);
  });
  if (splitCnt) {
    players[takers[0]].playDeck.push(...shuffleCards(cards));
  }
  
}

Player.matchCards = (playerNumber, otherPlayerNumber, players, matchColors) => {
  let player = players[playerNumber];
  let otherPlayer = players[otherPlayerNumber];
  if (player.discardPile.length && otherPlayer.discardPile.length) {
    let card = player.discardPile[player.discardPile.length - 1];
    let otherCard = otherPlayer.discardPile[otherPlayer.discardPile.length - 1];
    if (matchColors && card.color === otherCard.color) {return true;}
    if (!matchColors && card.pattern === otherCard.pattern) {return true};
  }
  return false
}

/**
 * @constructor 
 * @param {String} phase         Phase of the board game.
 *                                 'flip' - Server responds to flipCard and grabTotem emits.
 *                                 'duel' - Server responds to grabTotem emits.
 *                                 'pause'- Server does not respond to grabTotem & flipCard emits. 
 * @param {Array}  pot           Array of Card objects. Represents cards that do not belong to any player.
 * @param {Array}  players       Array of Player objects. Each client is assigned to a player object in the array.
 * @param {Totem}  totem    
 * @param {int}    matchColors   Players must activate duels based on matchColors  
 *                                 0 - match cards by pattern
 *                                 >= 1 - match cards by color. Integer value corresponds to player who activated the special rule.
 * @param {String} duelCnt The number of duels among all players. When duelCnt >= 1, gamePhase is set to duel.
 * @param {Int}    playerToFlip  Index into this.players array. Represends player whos turn it is to flip a card.
 * @param {Int}    collatLoaded  Counts the number of clients in the room that have emitted 'gameLoaded' event.
 *                               Game starts when all clients have emitted the event. 
 */
function GameState(phase, pot, players, totem = null, matchColors = 0, duelCnt = 0, playerToFlip = 0, collatLoaded = 0) {
  this.phase = phase;
  this.pot = pot;
  this.players = players;
  this.totem = totem;
  this.matchColors = matchColors;
  this.duelCnt = duelCnt;
  this.playerToFlip = playerToFlip;
  this.collatLoaded = collatLoaded;
  this.advancePlayerToFlip = () => {
    for (let i = 0; i < this.players.length; i++) {
      this.playerToFlip = (this.playerToFlip + 1) % this.players.length;
      if (this.players[this.playerToFlip].playDeck.length > 0) {return;}
    }
    this.playerToFlip = -1;
  };

  this.grabTotem = (playerNumber) => {
    if (this.phase === 'pause') { return;}

    otherPlayerNumbers = [];
    for (let i = 0; i < this.players.length; i++) {
      if (i != playerNumber) {
        otherPlayerNumbers.push(i);
      }
    }

    if (player.discardPile.length === 0) {
      //The player has no face up cards to match with other players.
      Player.transferCards(otherPlayerNumbers, [playerNumber], this.players);
    } else if (player.duel != null) {
      if (player.duel.recordGrab(playerNumber)) {
        this.duelCnt--;
        if (this.duelCnt === 0) { this.phase = 'flip'; }
        let giversAndTakers = player.duel.getGiversAndTakers()
        Player.transferCards(giversAndTakers[0], giversAndTakers[1], this.players);
        player.duel.getPlayerNumbers().forEach((playerNumber) => {this.players[playerNumber].duel = null});
      }
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
        Player.transferCards(otherPlayerNumbers, [playerNumber], this.players);
      } else {
        this.duelCnt++;
        this.phase = 'duel';
        let duel = new Duel(matchingPlayerNumbers);
        matchingPlayerNumbers.forEach((playerNumber) => {
          this.players[playerNumber].duel = duel;
        })
        duel.recordGrab(playerNumber);
      }
    }
  }

}


/**
 * Counter used by client to draw animation on HTML canvas.
 * Counter value of 0 means animation has stopped. 
 * Animation will have 'maxFrame' frames. 
 * Counter value from 1 to maxFrames signifies which animation frame to draw.
 * @constructor 
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


/**
 * A duel tracks the order in which players with matching cards grab the totem.
 * A duel is instantiated by handleGrabTotem() when a player emits 'grabTotem' event,
 * and there are other player(s) with matching card(s).
 * @constructor 
 * @param  
 */
//TODO: Add functionality to track time duel object was created, and how long it has been since then.
function Duel(playerNumbers) {
  this.playerGrabOrder = new Map();       //Maps playerNumber to order in which that player grabs the totem.
  playerNumbers.forEach((playerNumber) => {
    this.playerGrabOrder.set(playerNumber, Infinity);
  })
  this.nextGrabOrder = 1;                 //Order assigned to next player who grabs to totem.

  /**
   * Called by handleGrabTotem() when a player involved in a duel emits 'grabTotem' event.
   * @param  {Int}      playerNumber   player who grabs the Totem
   * @return {Boolean}                 True when all players have grabbed totem, False otherwise.
   */
  this.recordGrab = (playerNumber) => {
    if (this.playerGrabOrder.has(playerNumber) && this.playerGrabOrder.get(playerNumber) === Infinity) {
      this.playerGrabOrder.set(playerNumber, this.nextGrabOrder);
      this.nextGrabOrder++;
    }
    return (this.nextGrabOrder > this.playerGrabOrder.size) ? true : false;  
  }
 
  this.getPlayerNumbers = () => {
    return Array.from(this.playerGrabOrder.keys());
  }

  this.getGiversAndTakers = () => {
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
