/*******************************************************************************
/* Asteroid Class extends Phaser.Sprite
/******************************************************************************/

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