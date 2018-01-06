/*******************************************************************************
/* Create a new Phaser Game on window load
/******************************************************************************/

var W = 1800;
var H = 1200;
var CENTER_X = W/2,
	CENTER_Y = H/2;

var shipProperties = {
	acceleration: 320,
    drag: 40,
    maxVelocity: 220,
	angularVelocity: 500,
	names: [
		"Virgin Galactic",
		"Amazon Prime Air",
		"Spirit Airlines",
		"Google Chrome",
		"SpaceX",
		"Blue Origin",
		"Earlybird",
		"Lyft",
		"NASA",
		"Boeing"
	]
};

var bulletProperties = {
    speed: 600,
    interval: 680,
    lifespan: 600,
    maxCount: 90,
}

var asteroidProperties = {
    startingAsteroids: 10,
    maxAsteroids: 30,
	incrementAsteroids: 1,
	maxSize: 2,
	score: 100,
    
    size: [
		{ minVelocity: 80, maxVelocity: 120, minAngularVelocity: 0, maxAngularVelocity: 200 },
    	{ minVelocity: 80, maxVelocity: 180, minAngularVelocity: 0, maxAngularVelocity: 200 },
		{ minVelocity: 80, maxVelocity: 220, minAngularVelocity: 0, maxAngularVelocity: 200 }
	]
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
		this.game.load.spritesheet('imgAsteroid-0', 'assets/img_asteroid_0.png', 344, 334, 1);	
		this.game.load.spritesheet('imgAsteroid-1', 'assets/img_asteroid_1.png', 242, 235, 1);	
		this.game.load.spritesheet('imgAsteroid-2', 'assets/img_asteroid_2.png', 80, 78, 1);
		this.game.load.spritesheet('imgBullet', 'assets/img_bullet.png', 18, 18, 3);		
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

		// create a BulletGroup which contians the bullets
		this.BulletGroup = this.game.add.group();
		
		// create a ShipGroup which contains a number of Ship objects
		this.ShipGroup = this.game.add.group();
		for (var i = 0; i < this.GA.max_units; i++){
			this.ShipGroup.add(new Ship(this.game, CENTER_X, CENTER_Y, i, this.BulletGroup));
		}		
	
		// create a AsteroidGroup which contains a number of Asteroid objects
		this.AsteroidGroup = this.game.add.group();
		
		// create keys for a regular player to play
		this.key_left = this.game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
        this.key_right = this.game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
		this.key_thrust = this.game.input.keyboard.addKey(Phaser.Keyboard.UP);
		this.key_fire = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
				
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

				// init the asteroids
				for (var i = 0; i < asteroidProperties.startingAsteroids; i++){
					this.AsteroidGroup.add(new Asteroid(this.game, 0, 0, 0, this.AsteroidGroup));
				}
							
				this.state = this.STATE_PLAY;
				break;
				
			case this.STATE_PLAY: // play Flappy Bird game by using genetic algorithm AI

				this.BulletGroup.forEachExists(function(bullet){this.checkBoundaries(bullet);}, this);
				this.game.physics.arcade.overlap(this.BulletGroup, this.AsteroidGroup, this.asteroidHit, null, this);
				this.game.physics.arcade.overlap(this.ShipGroup, this.AsteroidGroup, this.asteroidCollision, null, this);

				this.AsteroidGroup.forEachExists(function(asteroid){
					this.checkBoundaries(asteroid);
					// this.AsteroidGroup.forEachExists(function(asteroid_2){
					// 	this.game.physics.arcade.collide(asteroid, asteroid_2);
					// }, this);
				}, this);
				
				this.ShipGroup.forEachAlive(function(ship){
					this.checkBoundaries(ship);
					
					var asteroidDistance = [];
					
					// get the three closest asteroids
					this.AsteroidGroup.forEachExists(function(asteroid){
						var dx = ship.body.x - asteroid.body.x, 
							dy = ship.body.y - asteroid.body.y;
						asteroidDistance.push({
							d: Math.abs(Math.sqrt(dx*dx + dy+dy)),
							dx: dx,
							dy: dy
						});
					}, this);
					asteroidDistance.sort(function(a, b) {
						return Math.abs(a.d - b.d);
					});
					
					if (ship.alive){

						var velocity = Math.sqrt(Math.pow(ship.body.velocity.x,2) + Math.pow(ship.body.velocity.y,2));
						
						var input = [
							Math.radians(ship.body.rotation), // r
							velocity / shipProperties.maxVelocity, // v%
							asteroidDistance[0].dx, // dx1
							asteroidDistance[0].dy, // dy1
							asteroidDistance[1].dx,
							asteroidDistance[1].dy,
							asteroidDistance[2].dx,
							asteroidDistance[2].dy
						]; 

						// perform a proper action by activating its neural network
						// if(ship.index === 0)
						//	this.player(ship);
						// else 
						this.GA.activateBrain(ship, input);
					}
				}, this);
				
				// increase the time alive
				this.time += 0.01;
				break;
				
			case this.STATE_GAMEOVER: // when all birds are killed evolve the population
				this.log();	

				this.GA.evolvePopulation();
				this.GA.iteration++;

				this.AsteroidGroup.removeAll();
				this.BulletGroup.removeAll();
					
				this.state = this.STATE_START;
				break;
		}
	},

	log: function(){
		var ships = [];
		var best = ["",0];
		this.ShipGroup.forEach(function(ship){
			var name = shipProperties.names[ship.index];
			var fitness = Math.round(this.GA.Population[ship.index].fitness);
			var ship = [name,fitness];
			if(fitness > best[1])
				best = ship;
			ships.push(ship);			
		}, this);
		console.log("Iteration:", this.GA.iteration);
		console.log("Best:", best[0], best[1]);
		console.table(ships);
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

		ship.score = 0;

		if (this.key_fire.isDown) {
			ship.shoot();
		}
	},

    checkBoundaries: function (sprite) {
        if (sprite.x < 0) {
            sprite.x = W;
        } else if (sprite.x > W) {
            sprite.x = 0;
        } 

        if (sprite.y < 0) {
            sprite.y = H;
        } else if (sprite.y > H) {
            sprite.y = 0;
        }
	},
	
	asteroidHit : function(bullet, asteroid){
		bullet.logPoints();
		bullet.kill();
		asteroid.hit();
	},

	asteroidCollision : function(ship, asteroid){
		this.onDeath(ship);
		asteroid.hit();
	},
	
	onDeath : function(ship){
		this.GA.Population[ship.index].fitness = (!ship.moved) ? ship.score : this.time * 10 + ship.score;
		this.GA.Population[ship.index].score = ship.score;
					
		ship.death();
		if (this.ShipGroup.countLiving() === 0) this.state = this.STATE_GAMEOVER;
	}
}

/*******************************************************************************
/* Asteroid Class extends Phaser.Sprite
/******************************************************************************/

var Asteroid = function(game, x, y, s, g) {
	//make it so they start off screen and then glide in screen when x and y are 0
	//other ones burst out of an asteroid that got shot so they retain xy
	Phaser.Sprite.call(this, game, x, y, `imgAsteroid-${s}`);
	this.size = s;
	this.group = g;

	this.scale.setTo(.5, .5);
	
	this.game.physics.arcade.enableBody(this, Phaser.Physics.ARCADE);

	this.anchor.set(0.5, 0.5);
	this.body.angularVelocity = this.game.rnd.integerInRange(asteroidProperties.size[this.size].minAngularVelocity, asteroidProperties.size[this.size].maxAngularVelocity);

	var randomAngle = this.game.math.degToRad(this.game.rnd.angle());
	var randomVelocity = this.game.rnd.integerInRange(asteroidProperties.size[this.size].minVelocity, asteroidProperties.size[this.size].maxVelocity);

	game.physics.arcade.velocityFromRotation(randomAngle, randomVelocity, this.body.velocity);
	
};

Asteroid.prototype = Object.create(Phaser.Sprite.prototype);
Asteroid.prototype.constructor = Asteroid;

Asteroid.prototype.hit = function(){
	//add two asteroids to asteroid group if not smallest size
	if(this.size != asteroidProperties.maxSize){
		this.group.add(new Asteroid(this.game, this.body.x + this.body.halfWidth, this.body.y + this.body.halfHeight, this.size + 1, this.group));
		this.group.add(new Asteroid(this.game, this.body.x + this.body.halfWidth, this.body.y + this.body.halfHeight, this.size + 1, this.group));
	}
	//kill this asteroid
	this.kill();
}

/*******************************************************************************
/* Ship Class extends Phaser.Sprite
/******************************************************************************/

var Ship = function(game, x, y, index, bulletGroup) {
	Phaser.Sprite.call(this, game, x, y, 'imgShip');
	this.index = index;
	this.angle = -90;
	this.anchor.set(0.5, 0.5);
	this.restart();
	this.fireable = true;
	this.bullets = bulletGroup;
	  
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
	this.score = 0;
	this.moved = false;
	this.alpha = 1;
	this.reset(CENTER_X - 200 + Math.random() * 400, CENTER_Y - 200 + Math.random() * 400);
};

Ship.prototype.gas = function(){
	this.moved = true;
	this.score += 5;
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

Ship.prototype.reload = function(){
	var ship = this;
	setTimeout(function(){
		ship.fireable = true;
	}, bulletProperties.interval);
}

Ship.prototype.shoot = function(){
	if (!this.fireable)
		return;
		
	this.fireable = false;
	this.reload();

	var length = this.body.width * 0.5;
	var x = this.body.x + this.body.halfWidth;
	var y = this.body.y + this.body.halfHeight;
	this.bullets.add(new Bullet(this.game, x, y, Math.radians(this.body.rotation), this));
	this.bulletInterval = this.game.time + bulletProperties.interval;
}

Ship.prototype.death = function(){
	this.alpha = 0.5;
	this.kill();
};

/*******************************************************************************
/* Bullet Class extends Phaser.Sprite
/******************************************************************************/
var Bullet = function(game, x, y, r, s) {
	Phaser.Sprite.call(this, game, x, y, 'imgBullet');
	this.scale.setTo(.5, .5);
	
	this.reset(x, y);
	this.lifespan = bulletProperties.lifespan;
	this.rotation = r;
	this.ship = s;

	this.animations.add('fire', [0, 1, 2]);
	this.animations.play('fire', 8, true);

	// enable physics on the bullet
	this.game.physics.enable(this, Phaser.Physics.ARCADE);
	this.game.physics.arcade.velocityFromRotation(r, bulletProperties.speed, this.body.velocity);
};

Bullet.prototype = Object.create(Phaser.Sprite.prototype);
Bullet.prototype.constructor = Bullet;

Bullet.prototype.logPoints = function(){
	this.ship.score += asteroidProperties.score;
}