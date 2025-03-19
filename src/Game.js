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
        this.load.audio('shoot', '/assets/shoot.mp3')
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

        // Add map borders
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
        this.physics.world.setBoundsCollision(true, true, true, true)

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
            enemy.setData('health', 3)
            enemy.setData('lastShot', 0)
            enemy.setData('hitBy', new Set())
        })

        // Player
        this.player = this.physics.add.sprite(100, 100, 'allSprites_default', 'tank_green')
        this.player.setData('speed', 200)
        this.player.setData('health', 5)
        this.player.setCollideWorldBounds(true) // Prevent player from leaving the map

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
        this.shootSound = this.sound.add('shoot', { volume: 0.5 })

        // Health text and instructions
        this.playerHealthText = this.add.text(10, 10, 'Health: 5', { fontSize: '16px', fill: '#fff' })
        this.enemyHealthText = this.add.text(10, 30, 'Enemy Health: 3', { fontSize: '16px', fill: '#fff' })
        this.add.text(10, 50, 'Arrows to move, SPACE to shoot', { fontSize: '16px', fill: '#fff' })

        // Projectiles setup
        this.projectiles = this.physics.add.group()
        this.canShoot = true
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

        // Rotate player based on velocity with corrected offset
        if (isMoving) {
            const angle = Phaser.Math.RadToDeg(Math.atan2(this.player.body.velocity.y, this.player.body.velocity.x)) - 90
            this.player.setAngle(angle)
        }

        if (isMoving && !this.moveSound.isPlaying) {
            this.moveSound.play()
        } else if (!isMoving && this.moveSound.isPlaying) {
            this.moveSound.stop()
        }

        // Shooting
        if (Phaser.Input.Keyboard.JustDown(this.shootKey) && this.canShoot) {
            const gunOffset = 20
            const rad = Phaser.Math.DegToRad(this.player.angle + 90)
            const gunX = this.player.x + Math.cos(rad) * gunOffset
            const gunY = this.player.y + Math.sin(rad) * gunOffset

            const projectile = this.projectiles.create(gunX, gunY, 'allSprites_default', 'bullet')
            projectile.setScale(1)
            const speed = 300
            projectile.setVelocity(
                Math.cos(rad) * speed,
                Math.sin(rad) * speed
            )
            projectile.setData('damage', 1)
            projectile.setData('isEnemyBullet', false)
            projectile.setData('id', Phaser.Math.RND.uuid())
            this.shootSound.play()
            this.canShoot = false
            this.time.addEvent({
                delay: 1000,
                callback: () => this.canShoot = true,
                loop: false
            })
        }

        // Enemy AI
        this.enemies.children.iterate(enemy => {
            if (enemy.active) {
                if (enemy.getData('patrol')) {
                    enemy.x += Math.sin(this.time.now / 500) * enemy.getData('speed') * 0.01
                } else {
                    this.physics.moveTo(enemy, this.player.x, this.player.y, enemy.getData('speed'))
                    const angle = Phaser.Math.RadToDeg(Math.atan2(enemy.body.velocity.y, enemy.body.velocity.x)) + 90
                    enemy.setAngle(angle)
                }
                if (enemy.x < 0 || enemy.x > this.cameras.main.width || enemy.y < 0 || enemy.y > this.cameras.main.height) {
                    enemy.setVelocity(0)
                }
                const distanceToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y)
                if (distanceToPlayer < 300) {
                    const currentTime = this.time.now
                    const lastShot = enemy.getData('lastShot') || 0
                    if (currentTime - lastShot > 3000) {
                        this.shootEnemyBullet(enemy)
                        enemy.setData('lastShot', currentTime)
                    }
                }
            }
        })

        // Projectile collision with enemies
        this.physics.add.overlap(this.projectiles, this.enemies, this.hitEnemyWithProjectile, null, this)

        // Update health text (show nearest active enemy's health)
        this.playerHealthText.setText('Health: ' + this.player.getData('health'))
        const activeEnemies = this.enemies.getChildren().filter(enemy => enemy.active)
        let nearestEnemy = null
        let minDistance = Infinity
        activeEnemies.forEach(enemy => {
            const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y)
            if (distance < minDistance) {
                minDistance = distance
                nearestEnemy = enemy
            }
        })
        const enemyHealth = nearestEnemy ? nearestEnemy.getData('health') || 0 : 0
        this.enemyHealthText.setText('Enemy Health: ' + enemyHealth)
    }

    shootEnemyBullet(enemy) {
        const gunOffset = 20
        const rad = Phaser.Math.DegToRad(enemy.angle + 90)
        const gunX = enemy.x + Math.cos(rad) * gunOffset
        const gunY = enemy.y + Math.sin(rad) * gunOffset
        const projectile = this.projectiles.create(gunX, gunY, 'allSprites_default', 'bullet')
        projectile.setScale(1)
        const speed = 300
        projectile.setVelocity(
            Math.cos(rad) * speed,
            Math.sin(rad) * speed
        )
        projectile.setData('damage', 1)
        projectile.setData('isEnemyBullet', true)
        projectile.setData('id', Phaser.Math.RND.uuid())
        this.shootSound.play()
    }

    hitEnemy(player, enemy) {
        this.moveSound.stop()
        this.explosionSound.play()
        player.setData('health', player.getData('health') - 1)
        enemy.setData('health', enemy.getData('health') - 1)

        if (player.getData('health') <= 0 || enemy.getData('health') <= 0) {
            player.disableBody(true, true)
            enemy.disableBody(true, true)
            this.createExplosion(enemy.x, enemy.y) // Add explosion effect
            enemy.destroy()
            this.enemies.remove(enemy, true, true)
            this.time.delayedCall(1000, () => {
                this.scene.start('GameOver')
            }, [], this)
        }
    }

    hitEnemyWithProjectile(projectile, enemy) {
        if (projectile.getData('isEnemyBullet')) return
        const projectileId = projectile.getData('id')
        const hitBy = enemy.getData('hitBy')

        if (hitBy.has(projectileId)) return
        hitBy.add(projectileId)

        projectile.destroy()
        if (enemy && enemy.active) {
            const currentHealth = enemy.getData('health') || 0
            const damage = projectile.getData('damage') || 1
            console.log('Projectile damage:', damage)
            const newHealth = currentHealth - damage
            console.log(`Enemy hit! Health: ${currentHealth} -> ${newHealth}`)

            if (isNaN(newHealth)) {
                console.error('Health calculation resulted in NaN! Current health:', currentHealth, 'Damage:', damage)
                return
            }

            enemy.setData('health', newHealth)

            if (newHealth <= 0) {
                console.log('Enemy destroyed at:', enemy.x, enemy.y)
                this.createExplosion(enemy.x, enemy.y) // Add explosion effect
                enemy.disableBody(true, true)
                enemy.destroy()
                this.enemies.remove(enemy, true, true)
                console.log('Enemy removed from group. Active enemies:', this.enemies.getChildren().length)
            }
        }
    }

    createExplosion(x, y) {
        // Play explosion sound
        this.explosionSound.play()

        // Create multiple particles for a more dynamic explosion effect
        for (let i = 0; i < 5; i++) {
            const particle = this.add.sprite(x, y, 'allSprites_default', 'bullet')
            particle.setScale(1)
            const angle = Phaser.Math.DegToRad(Phaser.Math.Between(0, 360))
            const speed = Phaser.Math.Between(50, 100)
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                scale: 0,
                alpha: 0,
                duration: 500,
                delay: i * 50, // Stagger the particles
                onComplete: () => particle.destroy()
            })
        }
    }

    hitPlayerWithProjectile(projectile, player) {
        if (!projectile.getData('isEnemyBullet')) return
        projectile.destroy()
        if (player && player.active) {
            const currentHealth = player.getData('health') || 0
            const damage = projectile.getData('damage') || 1
            player.setData('health', currentHealth - damage)
            player.setTint(0xff0000)
            this.time.delayedCall(200, () => player.clearTint(), [], this)
            if (player.getData('health') <= 0) {
                player.disableBody(true, true)
                this.time.delayedCall(1000, () => {
                    this.scene.start('GameOver')
                }, [], this)
            }
        }
    }
}