/*******************************************************************************
/* Bullet Class extends Phaser.Sprite
/******************************************************************************/

var bulletProperties = {
    speed: 600,
    interval: 420,
    lifespan: 600,
    maxCount: 90,
};

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

Bullet.prototype.hit = function(){
	this.ship.trackers.hits += 1;
	this.kill();
}