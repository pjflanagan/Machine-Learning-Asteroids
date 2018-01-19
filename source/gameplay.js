/*******************************************************************************
/* Create a new Phaser Game on window load
/******************************************************************************/

var W = 1800;
var H = 1400;
var CENTER_X = W/2,
	CENTER_Y = H/2,
	D = Math.sqrt(W*W + H*H);

var playerStats = {
	hitsPerTime: 0.005108160595824615,
	movePerTime: 0.29899789971247337,
	netRotationPerTime: 0.08307079199195985,
	playing: false, 
	shotsPerTime: 0.007633429477892699,
	totalRotationPerTime: 0.23894501451554687,

	percentTimeAiming: 0,
	averageAsteroidDistance: 0
}

var shipProperties = {
	acceleration: 320,
    drag: 40,
    maxVelocity: 260,
	angularVelocity: 500,
	offencePermitableTime: 600,
	names: [
		"Virgin Galactic", "Amazon Prime Air", "Spirit Airlines", "Google Chrome",
		"SpaceX", "Blue Origin", "Earlybird", "Lyft", "NASA", "Boeing"
	],
	sensors: [
		0,
		Math.PI * .25,
		Math.PI * .5,
		Math.PI * .75,
		Math.PI,
		Math.PI * 1.25,
		Math.PI * 1.5,
		Math.PI * 1.75,
	]
};

var bulletProperties = {
    speed: 600,
    interval: 420,
    lifespan: 600,
    maxCount: 90,
};

var asteroidProperties = {
	startingAsteroids: 8,
	currentResetAsteroids: 8,
    maxAsteroids: 30,
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
Math.PI_2 = 2 * Math.PI;

Math.toroidal = function(x,y){
	v1 = Math.sin(x / W * Math.PI_2);
	v2 = Math.cos(x / W * Math.PI_2);
	v3 = Math.sin(y / H * Math.PI_2);
	v4 = Math.cos(y / H * Math.PI_2);
}

window.onload = function () {

	playerStats.playing = gup("player");

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
		
		// create keys for a human to play
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
				asteroidProperties.currentResetAsteroids = asteroidProperties.startingAsteroids;
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
				}, this);
				
				this.ShipGroup.forEachAlive(function(ship){
					this.checkBoundaries(ship);
					if (ship.alive){
						this.runSensors(ship);
						var input = ship.sensorReadings;

						// perform a proper action by activating its neural network
						if(playerStats.playing && ship.index === 0) this.userMovement(ship);
						else this.GA.activateBrain(ship, input);
					}
				}, this);
				
				// increase the time alive
				this.time += 1;
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

	log : function(){
		var ships = [];
		var best = ["",0];
		var ave = 0;
		this.ShipGroup.forEach(function(ship){
			var name = shipProperties.names[ship.index];
			var fitness = this.GA.Population[ship.index].fitness;
			var ship = [name,fitness];
			ave += fitness;
			if(fitness > best[1])
				best = ship;
			ships.push(ship);			
		}, this);
		console.log("Iteration:", this.GA.iteration);
		console.log("Best:", best[0], best[1]);
		console.log("Average:", ave/10);
		console.table(ships);
	},

	userMovement : function(ship){
		if (this.key_left.isDown) ship.rotate(1);
		else if (this.key_right.isDown) ship.rotate(0);
		else ship.rotate(.5);
		
		if (this.key_thrust.isDown) ship.gas();
		else ship.gasOff();
		
		if (this.key_fire.isDown) ship.shoot();
	},

    checkBoundaries: function (sprite) {
        if (sprite.x < 0) sprite.x = W;
		else if (sprite.x > W) sprite.x = 0;
		
        if (sprite.y < 0) sprite.y = H;
        else if (sprite.y > H) sprite.y = 0;
	},

	runSensors: function(ship){
		var x = ship.body.x,
			y = ship.body.y,
			r = Math.radians(ship.body.rotation);
		for(var s = 0; s < shipProperties.sensors.length; s++){
			for(var d = 0; d < 600; d += 20){
				x = ship.body.x + d * Math.cos(r + shipProperties.sensors[s]);
				y = ship.body.y + d * Math.sin(r + shipProperties.sensors[s]);
				if(this.game.physics.arcade.getObjectsAtLocation(x, y, this.AsteroidGroup).length > 0){
					ship.sensorReadings[s] = d;
					break;
				}
			}
		}
	},
	
	asteroidHit : function(bullet, asteroid){
		bullet.addPoints();
		bullet.kill();
		asteroid.hit();
		if(this.AsteroidGroup.countLiving() <= asteroidProperties.startingAsteroids){
			asteroidProperties.currentResetAsteroids += 4;
			for (var i = this.AsteroidGroup.countLiving(); i < asteroidProperties.currentResetAsteroids; i++){
				this.AsteroidGroup.add(new Asteroid(this.game, 0, 0, 0, this.AsteroidGroup));
			}
		}
	},

	asteroidCollision : function(ship, asteroid){
		this.onDeath(ship);
		asteroid.hit();
	},
	
	onDeath : function(ship){
		this.GA.Population[ship.index].fitness = this.calculateFitness(ship);
		ship.death();
		if (this.ShipGroup.countLiving() === 0) this.state = this.STATE_GAMEOVER;
	},

	calculateFitness : function(ship){
		var accuracy = (ship.trackers.shots === 0) ? 0 : ship.trackers.hits / ship.trackers.shots;
		return this.time * accuracy;
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

	this.scale.setTo(.64, .64);
	
	this.game.physics.arcade.enableBody(this, Phaser.Physics.ARCADE);

	this.anchor.set(0.5, 0.5);
	this.body.angularVelocity = this.game.rnd.integerInRange(
		asteroidProperties.size[this.size].minAngularVelocity, 
		asteroidProperties.size[this.size].maxAngularVelocity
	);

	var randomAngle = this.game.math.degToRad(this.game.rnd.angle());
	var randomVelocity = this.game.rnd.integerInRange(asteroidProperties.size[this.size].minVelocity, asteroidProperties.size[this.size].maxVelocity);

	game.physics.arcade.velocityFromRotation(randomAngle, randomVelocity, this.body.velocity) * (this.size + 1);
	
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
	this.bullets = bulletGroup;
	this.fireable = false;
	this.interval = 0;
	this.restart();
	  
	// add gas animation as options
	var i=index*2;
	this.animations.add('gas', [i+1]);
	this.animations.add('gasOff', [i]);

	// enable physics on the ship
	this.game.physics.enable(this, Phaser.Physics.ARCADE);
	this.body.drag.set(shipProperties.drag);
	this.body.maxVelocity.set(shipProperties.maxVelocity);
};

Ship.prototype = Object.create(Phaser.Sprite.prototype);
Ship.prototype.constructor = Ship;

Ship.prototype.restart = function(iteration){
	this.resetTrackers();
	this.fireable = true;
	this.reset(CENTER_X - CENTER_X/2 + Math.random() * CENTER_X, CENTER_Y - CENTER_Y/2 + Math.random() * CENTER_Y);
}

Ship.prototype.resetTrackers = function(){
	this.trackers = {
		shots: 0, //totalShots
		hits: 0, //totalHits
	};
	this.sensorReadings = [600,600,600,600,600,600,600,600];
}

Ship.prototype.gas = function(){
	this.animations.play('gas', 1, true);
	this.game.physics.arcade.accelerationFromRotation(Math.radians(this.body.rotation), shipProperties.acceleration, this.body.acceleration);
}

Ship.prototype.gasOff = function(){
	this.animations.play('gasOff', 1, true);
	this.body.acceleration.set(0);
}

Ship.prototype.rotate = function(rotation){
	this.body.angularVelocity = (.5 - rotation) * shipProperties.angularVelocity;
}

Ship.prototype.reload = function(){
	var ship = this;
	this.interval = setTimeout(function(){
		ship.fireable = true;
	}, bulletProperties.interval);
	
}

Ship.prototype.shoot = function(){
	this.trackers.shots += 1;
	
	if (!this.fireable)return;
	this.fireable = false;
	this.reload();

	var x = this.body.x + this.body.halfWidth;
	var y = this.body.y + this.body.halfHeight;
	this.bullets.add(new Bullet(this.game, x, y, Math.radians(this.body.rotation), this));
}

Ship.prototype.death = function(){
	clearTimeout(this.interval);
	this.kill();
}

/*******************************************************************************
/* Bullet Class extends Phaser.Sprite
/******************************************************************************/
var Bullet = function(game, x, y, r, s) {
	Phaser.Sprite.call(this, game, x, y, 'imgBullet');
	this.scale.setTo(.25, .25);
	this.anchor.setTo(.5, .5);
	
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

Bullet.prototype.addPoints = function(){
	this.ship.trackers.hits += 1;
}

