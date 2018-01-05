/*******************************************************************************
/* Create a new Phaser Game on window load
/******************************************************************************/

var W = 1800;
var H = 1200;
var CENTER_X = W/2,
	CENTER_Y = H/2;

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

		// set the gravity of the world
		this.game.physics.arcade.gravity.y = 0;
		
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
				this.score = 0;
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

						var closestAsteroids = [];
						
						var input = [ship.orientation];
						// perform a proper action (flap yes/no) for this bird by activating its neural network
						this.GA.activateBrain(ship, input.concat(closestAsteroids));
					}
				}, this);
				
				// increase the time alive
				this.distance += 1;
				
				this.drawStatus();				
				break;
				
			case this.STATE_GAMEOVER: // when all birds are killed evolve the population
				this.GA.evolvePopulation();
				this.GA.iteration++;
					
				this.state = this.STATE_START;
				break;
		}
	},
	
	drawStatus : function(){
		this.bmdStatus.fill(180, 180, 180); // clear bitmap data by filling it with a gray color
		this.bmdStatus.rect(0, 0, this.bmdStatus.width, 35, "#8e8e8e"); // draw the HUD header rect
			
		this.ShipGroup.forEach(function(bird){
			var y = 85 + bird.index*50;
								
			this.bmdStatus.draw(bird, 25, y-25); // draw bird's image
			this.bmdStatus.rect(0, y, this.bmdStatus.width, 2, "#888"); // draw line separator
			
			if (bird.alive){
				var brain = this.GA.Population[bird.index].toJSON();
				var scale = this.GA.SCALE_FACTOR*0.02;
				
				this.bmdStatus.rect(62, y, 9, -(50 - brain.neurons[0].activation/scale), "#000088"); // input 1
				this.bmdStatus.rect(90, y, 9, brain.neurons[1].activation/scale, "#000088"); // input 2
				
				if (brain.neurons[brain.neurons.length-1].activation<0.5) this.bmdStatus.rect(118, y, 9, -20, "#880000"); // output: flap = no
				else this.bmdStatus.rect(118, y, 9, -40, "#008800"); // output: flap = yes
			}
			
			// draw bird's fitness and score
			this.txtStatusCurr[bird.index].setText(bird.fitness_curr.toFixed(2)+"\n" + bird.score_curr);
		}, this);
	},
	
	onDeath : function(ship){
		this.GA.Population[bird.index].fitness = ship.fitness_curr;
		this.GA.Population[bird.index].score = ship.score_curr;
					
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
	this.anchor.setTo(0.5);
	this.angle = Math.random() * 360;
	  
	// add flap animation and start to play it
	var i=index*2;
	this.animations.add('gas', [i, i+1]);
	this.animations.play('gas', 8, true);

	// enable physics on the bird
	this.game.physics.arcade.enableBody(this);
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
	this.body.velocity.y = -400;
};

Ship.prototype.death = function(){
	this.alpha = 0.5;
	this.kill();
};

/*******************************************************************************
/* Text Class extends Phaser.BitmapText
/******************************************************************************/

var Text = function(game, x, y, text, align, font){
	Phaser.BitmapText.call(this, game, x, y, font, text, 16);
	
	this.align = align;
	
	if (align == "right") this.anchor.setTo(1, 0);
	else this.anchor.setTo(0.5);
	
	this.game.add.existing(this);
};

Text.prototype = Object.create(Phaser.BitmapText.prototype);
Text.prototype.constructor = Text;

