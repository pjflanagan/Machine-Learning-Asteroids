/*******************************************************************************
/* Ship Class extends Phaser.Sprite
/******************************************************************************/
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
		{ i: 0, a: 0 },
		{ i: 0, a: Math.PI * 1/3 },
		{ i: 0, a: Math.PI * 2/3 },
		{ i: 0, a: Math.PI * 3/3 },
		{ i: 0, a: Math.PI * 4/3 },
		{ i: 0, a: Math.PI * 5/3 }
	]
};

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

		netRotation: 0,
		totalRotations: 0,
		lastRotation: 0,
		lastRotationChangeTime: 0,
		spinner: false,
		
		movement: 0, //totalMovement
		lastMoveTime: 0,
		lastVelocity: 0,
		lastVelocityChangeTime: 0,
		camper: false,

		time: 0,
	};
	this.sensorReadings = [600,600,600,600,600,600,600,600];
}

Ship.prototype.gas = function(){
	this.trackers.movement += 1;
	this.trackers.lastMoveTime = this.trackers.time;
	this.animations.play('gas', 1, true);
	this.game.physics.arcade.accelerationFromRotation(Math.radians(this.body.rotation), shipProperties.acceleration, this.body.acceleration);
}

Ship.prototype.gasOff = function(){
	this.animations.play('gasOff', 1, true);
	this.body.acceleration.set(0);
}

Ship.prototype.rotate = function(rotation){
	if(rotation != 0.5) this.trackers.totalRotations += 1;
	if(this.trackers.lastRotation != rotation) {
		this.trackers.lastRotationChangeTime = this.trackers.time;
		this.trackers.lastRotation = rotation;
	}
	this.trackers.netRotation += 2 * (.5 - rotation);
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