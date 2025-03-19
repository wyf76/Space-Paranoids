class Projectile extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, frame) {
        super(scene, x, y, texture, frame)
        this.isEnemyBullet = false
        this.setData('damage', 0)
        this.setData('id', null)
    }

    fire(isEnemyBullet, damage, id, velocityX, velocityY) {
        // Set up bullet properties
        this.isEnemyBullet = isEnemyBullet
        this.setData('damage', damage)
        this.setData('id', id)

        // Make sure the bullet is active, visible, and above terrain
        this.setActive(true).setVisible(true).setDepth(2)

        // Reset size in case it was changed from a previous shot
        this.setScale(1)
        if (this.body) {
            this.setSize(16, 16) // collision box
        }

        // Give the bullet velocity
        this.setVelocity(velocityX, velocityY)
    }
}