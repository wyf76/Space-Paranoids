class Game extends Phaser.Scene {
    constructor() {
        super({ key: 'Game' });
    }

    create() {
        this.player = this.physics.add.sprite(400, 500, 'tank');
        this.cursors = this.input.keyboard.createCursorKeys();
        this.bullets = this.physics.add.group();
        this.enemies = this.physics.add.group();

        this.time.addEvent({ delay: 1000, callback: this.spawnEnemy, callbackScope: this, loop: true });
    }

    update() {
        if (this.cursors.left.isDown) {
            this.player.setAngularVelocity(-150);
        } else if (this.cursors.right.isDown) {
            this.player.setAngularVelocity(150);
        } else {
            this.player.setAngularVelocity(0);
        }

        if (this.cursors.up.isDown) {
            this.physics.velocityFromRotation(this.player.rotation, 200, this.player.body.velocity);
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
            this.fireBullet();
        }
    }

    fireBullet() {
        let bullet = this.bullets.create(this.player.x, this.player.y, 'bullet');
        this.physics.velocityFromRotation(this.player.rotation, 400, bullet.body.velocity);
    }

    spawnEnemy() {
        let enemy = this.enemies.create(Phaser.Math.Between(50, 750), 50, 'enemy');
        enemy.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(50, 150));
    }
}