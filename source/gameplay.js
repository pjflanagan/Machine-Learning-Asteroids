/*******************************************************************************
/* Create a new Phaser Game on window load
/******************************************************************************/

var W = 1800;
var H = 1200;
var CENTER_X = W/2,
	CENTER_Y = H/2;

var shipProperties = {
	acceleration: 220,
    drag: 160,
    maxVelocity: 220,
    angularVelocity: 500,
};

// Converts from degrees to radians.
Math.radians = function(degrees) {
	return degrees * Math.PI / 180;
};

window.onload = function () {
	var game = new Phaser.Game(W, H, Phaser.CANVAS, 'game');
	
	game.state.add('Main', App.Main);
	game.state.start('Main');
};

/*******************************************************************************
/* Main program
/******************************************************************************/

var App = {};

App.Main = function(game){
	this.STATE_INIT = 1;
	this.STATE_START = 2;
	this.STATE_PLAY = 3;
	this.STATE_GAMEOVER = 4;
}

App.Main.prototype = {
	preload : function(){
		this.game.load.spritesheet('imgShip', 'assets/img_ship.png', 36, 36, 20);
		this.game.load.spritesheet('imgAsteroid', 'assets/img_asteroid_0.png', 360, 360, 1);		
	},
	
	create : function(){
		// set scale mode to cover the entire screen
		this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
		this.scale.pageAlignVertically = true;
		this.scale.pageAlignHorizontally = true;

		// set a black color for the background of the stage
		this.game.stage.backgroundColor = "#1C1C1C";
		
		// keep game running if it loses the focus
		this.game.stage.disableVisibilityChange = true;
		
		// start the Phaser arcade physics engine
		this.game.physics.startSystem(Phaser.Physics.ARCADE);
		
		// create a new Genetic Algorithm with a population of 10 units which will be evolving by using 4 top units
		this.GA = new GeneticAlgorithm(10, 4);
		
		// create a ShipGroup which contains a number of Ship objects
		this.ShipGroup = this.game.add.group();
		for (var i = 0; i < this.GA.max_units; i++){
			this.ShipGroup.add(new Ship(this.game, CENTER_X, CENTER_Y, i));
		}		
	
		// create a AsteroidGroup which contains a number of Asteroid objects
		this.AsteroidGroup = this.game.add.group();		
		for (var i = 0; i < 6; i++){
			new Asteroid(this.game, this.AsteroidGroup, i);
		}

		this.key_left = this.game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
        this.key_right = this.game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
        this.key_thrust = this.game.input.keyboard.addKey(Phaser.Keyboard.UP);
				
		// set initial App state
		this.state = this.STATE_INIT;
	},
	
	update : function(){		
		switch(this.state){
			case this.STATE_INIT: // init genetic algorithm
				this.GA.reset();
				this.GA.createPopulation();
				
				this.state = this.STATE_START;
				break;
				
			case this.STATE_START: // start/restart the game
				// update text objects
				this.time = 0;
				
				// start a new population of ships
				this.ShipGroup.forEach(function(ship){
					ship.restart(this.GA.iteration);
				}, this);
							
				this.state = this.STATE_PLAY;
				break;
				
			case this.STATE_PLAY: // play Flappy Bird game by using genetic algorithm AI
				
				this.ShipGroup.forEachAlive(function(ship){
					// calculate the current fitness and the score for this ship
					ship.fitness_curr = this.time + this.score;
					ship.score_curr = this.score;
					
					// check collision between a ship and asteroids
					//this.game.physics.arcade.collide(ship, this.targetBarrier, this.onDeath, null, this);
					
					if (ship.alive){
						// check if a bird flies out of bounds
						if (ship.y < 0 || ship.y > H || ship.x < 0 || ship.x > W) this.onDeath(ship);

						var closestAsteroids = [
							Math.random()*40 - 20,
							Math.random()*40 - 20,
							Math.random()*40 - 20,
							Math.random()*40 - 20,
							Math.random()*40 - 20,
							Math.random()*40 - 20
						];

						var velocity = Math.sqrt(Math.pow(ship.body.velocity.x,2) + Math.pow(ship.body.velocity.y,2));
						
						var input = [Math.radians(ship.body.rotation), velocity / shipProperties.maxVelocity];
						// perform a proper action (flap yes/no) for this bird by activating its neural network
						if(ship.index == 0)
							this.player(ship);
						else 
							this.GA.activateBrain(ship, input.concat(closestAsteroids));
					}
				}, this);
				
				// increase the time alive
				this.time += 1;
				break;
				
			case this.STATE_GAMEOVER: // when all birds are killed evolve the population
				this.GA.evolvePopulation();
				this.GA.iteration++;
					
				this.state = this.STATE_START;
				break;
		}
	},

	player : function(ship){
		if (this.key_left.isDown) {
			ship.rotate(1);
		} else if (this.key_right.isDown) {
			ship.rotate(0);
		} else {
			ship.rotate(.5);
		}
		
		if (this.key_thrust.isDown) {
			ship.gas();
		} else {
			ship.gasOff();
		}
	},
	
	onDeath : function(ship){
		this.GA.Population[ship.index].fitness = this.time + ship.score;
		this.GA.Population[ship.index].score = ship.score;
					
		ship.death();
		if (this.ShipGroup.countLiving() == 0) this.state = this.STATE_GAMEOVER;
	}/*,
	
	onRestartClick : function(){
		this.state = this.STATE_INIT;
	},
	
	onPauseClick : function(){
		this.game.paused = true;
		this.btnPause.input.reset();
		this.sprPause.revive();
    },
	
	onResumeClick : function(){
		if (this.game.paused){
			this.game.paused = false;
			this.btnPause.input.enabled = true;
			this.sprPause.kill();
		}
    }*/
}

/*******************************************************************************
/* Asteroid Class extends Phaser.Sprite
/******************************************************************************/

var Asteroid = function(game, frame) {
	Phaser.Sprite.call(this, game, 0, 0, 'imgAsteroid', frame);
	
	this.game.physics.arcade.enableBody(this);
	
	this.body.allowGravity = false;
	this.body.immovable = true;
};

Asteroid.prototype = Object.create(Phaser.Sprite.prototype);
Asteroid.prototype.constructor = Asteroid;

/*******************************************************************************
/* Ship Class extends Phaser.Sprite
/******************************************************************************/

var Ship = function(game, x, y, index) {
	Phaser.Sprite.call(this, game, x, y, 'imgShip');
	this.index = index;
	this.angle = -90;
	this.anchor.set(0.5, 0.5);
	this.score = 0;
	  
	// add flap animation and start to play it
	var i=index*2;
	this.animations.add('gas', [i+1]);
	this.animations.add('gasOff', [i]);

	// enable physics on the bird
	this.game.physics.enable(this, Phaser.Physics.ARCADE);
	this.body.drag.set(shipProperties.drag);
	this.body.maxVelocity.set(shipProperties.maxVelocity);
};

Ship.prototype = Object.create(Phaser.Sprite.prototype);
Ship.prototype.constructor = Ship;

Ship.prototype.restart = function(iteration){
	this.fitness_prev = (iteration == 1) ? 0 : this.fitness_curr;
	this.fitness_curr = 0;
	
	this.score_prev = (iteration == 1) ? 0: this.score_curr;
	this.score_curr = 0;
	
	this.alpha = 1;
	this.reset(CENTER_X, CENTER_Y);
};

Ship.prototype.gas = function(){
	this.animations.play('gas', 1, true);
	this.game.physics.arcade.accelerationFromRotation(Math.radians(this.body.rotation), shipProperties.acceleration, this.body.acceleration);
};

Ship.prototype.gasOff = function(){
	this.animations.play('gasOff', 1, true);
	this.body.acceleration.set(0);
}

Ship.prototype.rotate = function(rotation){
	this.body.angularVelocity = (.5 - rotation) * shipProperties.angularVelocity;
}

Ship.prototype.shoot = function(){
	//release a bullet sprite
}

Ship.prototype.death = function(){
	this.alpha = 0.5;
	this.kill();
};


