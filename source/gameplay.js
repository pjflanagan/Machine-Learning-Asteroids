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

	percentTimeAiming: 0
}

/*******************************************************************************
/* Math
/******************************************************************************/

Math.radians = function(degrees) {
	return degrees * Math.PI / 180; // Converts from degrees to radians
};
Math.PI_2 = 2 * Math.PI;
Math.toroidal = function(x,y){
	v1 = Math.sin(x / W * Math.PI_2);
	v2 = Math.cos(x / W * Math.PI_2);
	v3 = Math.sin(y / H * Math.PI_2);
	v4 = Math.cos(y / H * Math.PI_2);
};
Math.rankSimilarity = function(shipScore, playerScore){
	return 1 / (Math.abs(shipScore - playerScore) + 0.000001); 
};
Math.runningIterationAverage = function(currentData, newData){
	return ((currentData * (this.GA.iteration - 1)) + newData) / this.GA.iteration;
};

/*******************************************************************************
/* Onload
/******************************************************************************/

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
	/***************************************************************************
	/* Preload (member overload)
	/**************************************************************************/
	preload : function(){
		this.game.load.spritesheet('imgShip', 'assets/img_ship.png', 36, 36, 20);
		this.game.load.spritesheet('imgAsteroid-0', 'assets/img_asteroid_0.png', 344, 334, 1);	
		this.game.load.spritesheet('imgAsteroid-1', 'assets/img_asteroid_1.png', 242, 235, 1);	
		this.game.load.spritesheet('imgAsteroid-2', 'assets/img_asteroid_2.png', 80, 78, 1);
		this.game.load.spritesheet('imgBullet', 'assets/img_bullet.png', 18, 18, 3);		
	},
	
	/***************************************************************************
	/* Create (member overload)
	/**************************************************************************/
	create : function(){
		// set scale mode to cover the entire screen
		this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
		this.scale.pageAlignVertically = true;
		this.scale.pageAlignHorizontally = true;

		this.game.stage.backgroundColor = "#1C1C1C"; // set a black color for the background of the stage
		this.game.stage.disableVisibilityChange = true; // keep game running if it loses the focus
		this.game.physics.startSystem(Phaser.Physics.ARCADE); // start the Phaser arcade physics engine
		
		// create a new Genetic Algorithm with a population of 10 units which will be evolving by using 4 top units
		this.GA = new GeneticAlgorithm(10, 4);
		this.BulletGroup = this.game.add.group(); // create a BulletGroup which contians the bullets
		this.ShipGroup = this.game.add.group(); // create a ShipGroup which contains a number of Ship objects
		for (var i = 0; i < this.GA.max_units; i++){
			this.ShipGroup.add(new Ship(this.game, CENTER_X, CENTER_Y, i, this.BulletGroup));
		}
		this.AsteroidGroup = this.game.add.group(); // create a AsteroidGroup which contains a number of Asteroid objects
		
		// create keys for a human to play
		this.keyLeft = this.game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
        this.keyRight = this.game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
		this.keyThrust = this.game.input.keyboard.addKey(Phaser.Keyboard.UP);
		this.keyFire = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
				
		// set initial App state
		this.state = this.STATE_INIT;
	},
	
	/***************************************************************************
	/* Update (member overload)
	/**************************************************************************/
	update : function(){		
		switch(this.state){
			/*******************************************************************
			/* INIT
			/******************************************************************/
			case this.STATE_INIT: 
				this.GA.reset();
				this.GA.createPopulation();
				this.state = this.STATE_START;
				break;
				
			/*******************************************************************
			/* START
			/******************************************************************/
			case this.STATE_START: 
				this.time = 0; // update time objects
				
				// start a new population of ships
				this.ShipGroup.forEach(function(ship){ ship.restart(this.GA.iteration); }, this);

				// init the asteroids
				asteroidProperties.currentResetAsteroids = asteroidProperties.startingAsteroids;
				for (var i = 0; i < asteroidProperties.startingAsteroids; i++){
					this.AsteroidGroup.add(new Asteroid(this.game, 0, 0, 0, this.AsteroidGroup));
				}
							
				this.state = this.STATE_PLAY;
				break;
			
			/*******************************************************************
			/* PLAY
			/******************************************************************/
			case this.STATE_PLAY:
				this.BulletGroup.forEachExists(function(bullet){this.checkBoundaries(bullet);}, this);
				this.AsteroidGroup.forEachExists(function(asteroid){this.checkBoundaries(asteroid);}, this);
				this.game.physics.arcade.overlap(this.BulletGroup, this.AsteroidGroup, this.asteroidHit, null, this);
				this.game.physics.arcade.overlap(this.ShipGroup, this.AsteroidGroup, this.asteroidCollision, null, this);

				this.ShipGroup.forEachAlive(function(ship){
					this.autoKill(ship);
					this.checkBoundaries(ship);
					if (ship.alive){
						this.runSensors(ship);
						var input = ship.sensorReadings;
						// perform a proper action by activating its neural network
						if(playerStats.playing && ship.index === 0) this.userMovement(ship);
						else this.GA.activateBrain(ship, input);
					}
				}, this);
				
				this.time += 1; // increase the time alive
				break;
			
			/*******************************************************************
			/* GAMEOVER
			/******************************************************************/
			case this.STATE_GAMEOVER: 
				this.log();	
				this.GA.evolvePopulation();
				this.GA.iteration++;
				this.AsteroidGroup.removeAll();
				this.BulletGroup.removeAll();
				this.state = this.STATE_START;
				break;
		}
	},

	/***************************************************************************
	/* Log
	/**************************************************************************/
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

	/***************************************************************************
	/* User Movement
	/**************************************************************************/
	userMovement : function(ship){
		if (this.keyLeft.isDown) ship.rotate(1);
		else if (this.keyRight.isDown) ship.rotate(0);
		else ship.rotate(.5);
		
		if (this.keyThrust.isDown) ship.gas();
		else ship.gasOff();
		
		if (this.keyFire.isDown) ship.shoot();
	},

	/***************************************************************************
	/* Cheack Boundaries
	/**************************************************************************/
    checkBoundaries: function (sprite) {
        if (sprite.x < 0) sprite.x = W;
		else if (sprite.x > W) sprite.x = 0;
		
        if (sprite.y < 0) sprite.y = H;
        else if (sprite.y > H) sprite.y = 0;
	},

	/***************************************************************************
	/* Run Sensors
	/**************************************************************************/
	runSensors: function(ship){
		var x = ship.body.x,
			y = ship.body.y,
			r = Math.radians(ship.body.rotation);
		var phaser = this;
		_.each(shipProperties.sensors, function(sensor){
			for(var d = 0; d < 300; d += 8){ 
				x = ship.body.x + d * Math.cos(r + sensor.a);
				y = ship.body.y + d * Math.sin(r + sensor.a);
				if(phaser.game.physics.arcade.getObjectsAtLocation(x, y, phaser.AsteroidGroup).length > 0){
					ship.sensorReadings[sensor.i] = d;
					return;
				}
			}
		});
	},
	
	/***************************************************************************
	/* Asteroid Hit
	/**************************************************************************/
	asteroidHit : function(bullet, asteroid){
		bullet.hit();
		asteroid.hit();
		if(this.AsteroidGroup.countLiving() <= asteroidProperties.startingAsteroids){
			asteroidProperties.currentResetAsteroids += 4;
			for (var i = this.AsteroidGroup.countLiving(); i < asteroidProperties.currentResetAsteroids; i++){
				this.AsteroidGroup.add(new Asteroid(this.game, 0, 0, 0, this.AsteroidGroup));
			}
		}
	},

	/***************************************************************************
	/* Asteroid Collision
	/**************************************************************************/
	asteroidCollision : function(ship, asteroid){
		this.onDeath(ship);
		asteroid.hit();
	},
	
	/***************************************************************************
	/* Auto Kill
	/**************************************************************************/
	autoKill : function(ship){
		// auto kill if they haven't hit the gas in a while
		if(this.time > shipProperties.offencePermitableTime){
			if(ship.trackers.time - ship.trackers.lastMoveTime > shipProperties.offencePermitableTime){
				ship.trackers.camper = true;
				this.onDeath(ship);
			}
			else if(ship.trackers.time - ship.trackers.lastRotationChangeTime > shipProperties.offencePermitableTime){
				ship.trackers.spinner = true;
				this.onDeath(ship);
			}
		}
	},

	/***************************************************************************
	/* On Death
	/**************************************************************************/
	onDeath : function(ship){
		this.GA.Population[ship.index].fitness = this.calculateFitness(ship);
		ship.death();
		if (this.ShipGroup.countLiving() === 0) this.state = this.STATE_GAMEOVER;
	},

	/***************************************************************************
	/* Calculate Fitness
	/**************************************************************************/
	calculateFitness : function(ship){
		// RECORD TIME ACCURATE, RECORD TIME DISTANT FROM ASTEROID

		if(ship.trackers.spinner || ship.trackers.camper || ship.trackers.movement === 0){
			return 0;
		}
		
		var time = this.time * 1.000;
		if(playerStats.playing && ship.index === 0){
			playerStats.movePerTime = Math.runningIterationAverage(playerStats.movePerTime, ship.trackers.movement / time);
			playerStats.shotsPerTime = Math.runningIterationAverage(playerStats.shotsPerTime, ship.trackers.shots / time);
			playerStats.hitsPerTime = Math.runningIterationAverage(playerStats.hitsPerTime, ship.trackers.hits / time); 
			playerStats.netRotationPerTime = Math.runningIterationAverage(playerStats.netRotationPerTime, Math.abs(ship.trackers.netRotation / time));
			playerStats.totalRotationPerTime = Math.runningIterationAverage(playerStats.totalRotationPerTime, ship.trackers.totalRotations / time);
			console.log(playerStats);
			return 0;
		}

		var movementSimilarity = Math.rankSimilarity(ship.trackers.movement / time, playerStats.movePerTime),
			shotsSimilarity = Math.rankSimilarity(ship.trackers.shots / time, playerStats.shotsPerTime),
			accuracySimilarity = (ship.trackers.shots === 0) ? 0 :
				Math.rankSimilarity(ship.trackers.hits / ship.trackers.shots, playerStats.hitsPerTime / playerStats.shotsPerTime),
			netRotationSimilarity = Math.rankSimilarity(Math.abs(ship.trackers.netRotation / time), playerStats.netRotationPerTime),
			totalRotationSimilarity = Math.rankSimilarity(ship.trackers.totalRotations / time, playerStats.totalRotationPerTime);

		return  1000 * movementSimilarity + 
				100  * shotsSimilarity + 
				100  * accuracySimilarity + 
				100  * netRotationSimilarity + 
				100  * totalRotationSimilarity;

	}

}







