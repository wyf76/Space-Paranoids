class Game extends Phaser.Scene {
    constructor() {
        super({ key: 'Game' })
    }

    preload() {
        this.load.tilemapTiledJSON('map', '/assets/Map.json')
        this.load.spritesheet('terrainTiles_default', '/assets/terrainTiles_default.png', {
            frameWidth: 32,
            frameHeight: 32
        })
        this.load.atlas('allSprites_default', '/assets/allSprites_default.png', '/assets/allSprites_default.json')
        this.load.audio('tank_move', '/assets/tank_move.mp3')
        this.load.audio('explosion', '/assets/explosion.mp3')
    }

    create() {
        // Tilemap and layers
        const map = this.make.tilemap({ key: 'map' })
        const terrainTileset = map.addTilesetImage('terrainTiles_default', 'terrainTiles_default', 32, 32)
        const terrainLayer = map.createLayer('Background', terrainTileset, 0, 0)
        if (!terrainLayer) {
            console.error('Failed to create terrain layer "Background"')
            return
        }
        terrainLayer.setCollisionByExclusion([-1])

        // Enemies
        const enemiesLayer = map.getObjectLayer('enemy')
        if (!enemiesLayer || !enemiesLayer.objects) {
            console.error('Object layer "enemy" not found or contains no objects!')
            return
        }
        this.enemies = this.physics.add.group()
        enemiesLayer.objects.forEach(obj => {
            const enemy = this.enemies.create(obj.x, obj.y - 23, 'allSprites_default', 'tank_blue')
            if (!enemy) {
                console.error('Failed to create enemy sprite')
                return
            }
            enemy.setData('speed', obj.properties.find(p => p.name === 'speed')?.value || 100)
            enemy.setData('patrol', obj.properties.find(p => p.name === 'patrol')?.value || false)
            enemy.setData('health', 3) // Enemy health
        })

        // Player
        this.player = this.physics.add.sprite(100, 100, 'allSprites_default', 'tank_green')
        this.player.setData('speed', 200)
        this.player.setData('health', 5) // Player health

        // Physics and collisions
        this.physics.add.collider(this.enemies, terrainLayer)
        this.physics.add.collider(this.player, this.enemies, this.hitEnemy, null, this)
        this.physics.add.collider(this.player, terrainLayer)

        // Camera
        const camera = this.cameras.main
        camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
        camera.startFollow(this.player)

        // Input
        this.cursors = this.input.keyboard.createCursorKeys()
        this.shootKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

        // Audio
        this.moveSound = this.sound.add('tank_move', { volume: 0.3 })
        this.explosionSound = this.sound.add('explosion', { volume: 0.7 })

        // Health text
        this.playerHealthText = this.add.text(10, 10, 'Health: 5', { fontSize: '16px', fill: '#fff' })
        this.enemyHealthText = this.add.text(10, 30, 'Enemy Health: 3', { fontSize: '16px', fill: '#fff' })

        // Projectiles setup
        this.projectiles = this.physics.add.group()
        this.canShoot = true
        this.time.addEvent({
            delay: 500, // Cooldown of 0.5 seconds
            callback: () => this.canShoot = true,
            loop: true
        })
    }

    update() {
        // Player movement
        this.player.setVelocity(0)
        let isMoving = false
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-this.player.getData('speed'))
            isMoving = true
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(this.player.getData('speed'))
            isMoving = true
        }
        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-this.player.getData('speed'))
            isMoving = true
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(this.player.getData('speed'))
            isMoving = true
        }

        if (isMoving && !this.moveSound.isPlaying) {
            this.moveSound.play()
        } else if (!isMoving && this.moveSound.isPlaying) {
            this.moveSound.stop()
        }

        // Shooting
        if (this.shootKey.isDown && this.canShoot) {
            const projectile = this.projectiles.create(this.player.x, this.player.y, 'allSprites_default', 'bullet')
            projectile.setScale(1) // Adjust scale if needed
            this.physics.moveTo(projectile, this.input.activePointer.x + this.cameras.main.scrollX, this.input.activePointer.y + this.cameras.main.scrollY, 300)
            projectile.setData('damage', 1)
            this.canShoot = false
            this.time.addEvent({ delay: 500, callback: () => this.canShoot = true })
        }

        // Enemy AI
        this.enemies.children.iterate(enemy => {
            if (enemy.active) {
                if (enemy.getData('patrol')) {
                    enemy.x += Math.sin(this.time.now / 500) * enemy.getData('speed') * 0.01
                } else {
                    this.physics.moveTo(enemy, this.player.x, this.player.y, enemy.getData('speed'))
                }
                // Enemy bounds
                if (enemy.x < 0 || enemy.x > this.cameras.main.width || enemy.y < 0 || enemy.y > this.cameras.main.height) {
                    enemy.setVelocity(0)
                }
            }
        })

        // Projectile collision with enemies
        this.physics.add.overlap(this.projectiles, this.enemies, this.hitEnemyWithProjectile, null, this)

        // Update health text
        this.playerHealthText.setText('Health: ' + this.player.getData('health'))
        this.enemyHealthText.setText('Enemy Health: ' + (this.enemies.countActive() > 0 ? this.enemies.getChildren()[0].getData('health') : 0))
    }

    hitEnemy(player, enemy) {
        this.moveSound.stop()
        this.explosionSound.play()
        player.setData('health', player.getData('health') - 1)
        enemy.setData('health', enemy.getData('health') - 1)

        if (player.getData('health') <= 0 || enemy.getData('health') <= 0) {
            player.disableBody(true, true)
            enemy.disableBody(true, true)
            this.time.delayedCall(1000, () => {
                this.scene.start('GameOver')
            }, [], this)
        }
    }

    hitEnemyWithProjectile(projectile, enemy) {
        projectile.destroy()
        enemy.setData('health', enemy.getData('health') - projectile.getData('damage'))
        if (enemy.getData('health') <= 0) {
            enemy.disableBody(true, true)
        }
    }
}