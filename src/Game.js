class Game extends Phaser.Scene {
    constructor() {
        super({ key: 'Game' })
        this.isPaused = false
        this.difficultyFactor = 1  // This increases gradually over time
    }

    preload() {
        // Load assets
        this.load.tilemapTiledJSON('map', 'assets/Map.json')
        this.load.spritesheet('terrainTiles_default', 'assets/terrainTiles_default.png', {
            frameWidth: 32,
            frameHeight: 32
        })
        this.load.atlas('allSprites_default', 'assets/allSprites_default.png', 'assets/allSprites_default.json')
        this.load.audio('tank_move', 'assets/tank_move.mp3')
        this.load.audio('explosion', 'assets/explosion.mp3')
        this.load.audio('shoot', 'assets/shoot.mp3')
        this.load.audio('bgMusic', 'assets/bgMusic.mp3')
    }

    create() {
        // Initialize background music with looping and reduced volume for ambiance
        this.bgMusic = this.sound.add('bgMusic', { volume: 0.3, loop: true })
        this.bgMusic.play()

        // Load and configure the tilemap for the game world
        const map = this.make.tilemap({ key: 'map' })
        const tileset = map.addTilesetImage('terrainTiles_default', 'terrainTiles_default', 32, 32)
        const terrainLayer = map.createLayer('Background', tileset, 0, 0)
        if (!terrainLayer) {
            console.error("Failed to create terrain layer"); // Log error if tilemap fails
            return;
        }
        terrainLayer.setCollisionByExclusion([-1]) // Enable collision for all tiles except index -1
        terrainLayer.setDepth(0) // Set terrain below other game objects

        // Define world boundaries based on tilemap dimensions
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)

        // Spawn player tank at the bottom center of the map
        this.player = this.physics.add.sprite(map.widthInPixels / 2, map.heightInPixels - 100, 'allSprites_default', 'tank_green')
        this.player.setCollideWorldBounds(true) // Prevent player from leaving the world
        this.player.setDepth(1) // Place player above terrain
        this.player.setData('health', 5) // Initialize player health

        // Create a group for enemies to manage spawning and collisions
        this.enemies = this.physics.add.group()

        // Set up a pool of reusable projectiles for player bullets
        this.projectiles = this.physics.add.group({
            classType: Projectile,
            maxSize: 50,
            runChildUpdate: true // Ensure projectiles update their positions
        })
        this.projectiles.createMultiple({
            key: 'allSprites_default',
            frame: 'bullet',
            quantity: 50,
            active: false,
            visible: false // Pre-create bullets, hidden until fired
        })

        // Initialize keyboard inputs for movement, shooting, and pausing
        this.cursors = this.input.keyboard.createCursorKeys()
        this.shootKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
        this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P)

        // Load audio effects for gameplay feedback
        this.moveSound = this.sound.add('tank_move', { volume: 0.3 })
        this.explosionSound = this.sound.add('explosion', { volume: 0.7 })
        this.shootSound = this.sound.add('shoot', { volume: 0.5 })

        // Create UI elements that stay fixed on screen (no scrolling)
        this.playerHealthText = this.add.text(10, 10, 'Health: ' + this.player.getData('health'), { fontSize: '16px', fill: '#fff' }).setScrollFactor(0)
        this.score = 0;
        this.scoreText = this.add.text(10, 30, 'Score: ' + this.score, { fontSize: '16px', fill: '#fff' }).setScrollFactor(0)
        this.instructionsText = this.add.text(10, 50, 'Instructions: Use Arrow Keys to Move, SPACE to Shoot. Avoid enemy tanks!', { fontSize: '16px', fill: '#fff' }).setScrollFactor(0)
        this.pauseText = this.add.text(300, 250, 'Paused\nPress P to Resume', { fontSize: '40px', fill: '#fff', align: 'center' }).setScrollFactor(0).setVisible(false)

        // Set up physics interactions between game objects
        this.physics.add.collider(this.player, terrainLayer) // Player collides with terrain
        this.physics.add.collider(this.enemies, terrainLayer) // Enemies collide with terrain
        this.physics.add.collider(this.player, this.enemies, this.hitEnemy, null, this) // Player-enemy collision
        this.physics.add.overlap(this.projectiles, this.enemies, this.hitEnemyWithProjectile, null, this) // Bullet-enemy overlap

        // Configure camera to follow the player within world bounds
        const camera = this.cameras.main
        camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
        camera.startFollow(this.player)

        // Start enemy spawning timer (every 1.5 seconds)
        this.enemyTimer = this.time.addEvent({
            delay: 1500,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        })

        // Increment score and difficulty every second
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.score += 10
                this.scoreText.setText('Score: ' + this.score)
                this.difficultyFactor += 0.03 // Gradually increase enemy speed
            },
            callbackScope: this,
            loop: true
        })

        this.canShoot = true // Enable shooting at game start
    }

    update() {
        // Handle pause/resume toggle
        if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
            this.isPaused = !this.isPaused
            if (this.isPaused) {
                this.physics.world.pause() // Halt physics updates
                this.bgMusic.pause() // Pause background music
                this.pauseText.setVisible(true) // Show pause message
                this.moveSound.stop() // Stop movement sound
            } else {
                this.physics.world.resume() // Resume physics
                this.bgMusic.resume() // Resume music
                this.pauseText.setVisible(false) // Hide pause message
            }
        }
        if (this.isPaused) return // Skip updates if paused

        // Update health display each frame
        this.playerHealthText.setText('Health: ' + this.player.getData('health'))

        // Control player movement with arrow keys
        this.player.setVelocity(0) // Reset velocity each frame
        let isMoving = false
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-200) // Move left
            isMoving = true
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(200) // Move right
            isMoving = true
        }
        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-200) // Move up
            isMoving = true
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(200) // Move down
            isMoving = true
        }
        if (isMoving) {
            // Rotate player to match movement direction
            const angle = Phaser.Math.RadToDeg(Math.atan2(this.player.body.velocity.y, this.player.body.velocity.x)) - 90
            this.player.setAngle(angle)
            if (!this.moveSound.isPlaying) this.moveSound.play() // Play sound while moving
        } else if (this.moveSound.isPlaying) {
            this.moveSound.stop() // Stop sound when stationary
        }

        // Handle player shooting with spacebar
        if (Phaser.Input.Keyboard.JustDown(this.shootKey) && this.canShoot) {
            const gunOffset = 24 // Offset bullet spawn from tank center
            const rad = Phaser.Math.DegToRad(this.player.angle + 90) // Convert angle to radians
            const gunX = this.player.x + Math.cos(rad) * gunOffset // Calculate bullet spawn X
            const gunY = this.player.y + Math.sin(rad) * gunOffset // Calculate bullet spawn Y
            const projectile = this.projectiles.get(gunX, gunY, 'allSprites_default', 'bullet')
            if (projectile) {
                const speed = 300 // Bullet speed
                projectile.fire(false, 1, Phaser.Math.RND.uuid(), Math.cos(rad) * speed, Math.sin(rad) * speed)
                this.shootSound.play() // Play shooting sound
                this.canShoot = false // Disable shooting temporarily
                this.time.addEvent({
                    delay: 1000, // 1-second cooldown
                    callback: () => { this.canShoot = true },
                    loop: false
                })
            }
        }

        // Update enemy movement: chase the player
        this.enemies.children.iterate(enemy => {
            if (enemy.active) {
                this.physics.moveToObject(enemy, this.player, 80 * this.difficultyFactor) // Speed scales with difficulty
            }
        })
    }

    spawnEnemy() {
        // Spawn an enemy at a random x at the top of the world
        const x = Phaser.Math.Between(50, this.physics.world.bounds.width - 50)
        const y = 0
        let enemy
        // Occasionally spawn a "strong" enemy (20% chance)
        if (Phaser.Math.Between(1, 10) > 8) {
            enemy = this.enemies.create(x, y, 'allSprites_default', 'tank_blue')
            if (enemy) {
                enemy.setDepth(1)
                enemy.setData('health', 3)
                enemy.setVelocityY(60)
            }
        } else {
            enemy = this.enemies.create(x, y, 'allSprites_default', 'tank_blue')
            if (enemy) {
                enemy.setDepth(1)
                enemy.setData('health', 1)
                enemy.setVelocityY(40)
            }
        }
    }

    hitEnemy(player, enemy) {
        // When an enemy collides with the player: reduce player's health and destroy the enemy.
        player.setData('health', player.getData('health') - 1)
        this.createExplosion(enemy.x, enemy.y)
        enemy.destroy()
        this.enemies.remove(enemy, true, true)
        if (player.getData('health') <= 0) {
            this.scene.start('GameOver', { score: this.score })
        }
    }

    hitEnemyWithProjectile(projectile, enemy) {
        projectile.disableBody(true, true)
        projectile.destroy()
        if (enemy && enemy.active) {
            enemy.destroy()
            this.enemies.remove(enemy, true, true)
            this.createExplosion(enemy.x, enemy.y)
            this.score += 20
            this.scoreText.setText('Score: ' + this.score)
        }
    }

    createExplosion(x, y) {
        this.explosionSound.play()
        for (let i = 0; i < 8; i++) {
            const particle = this.add.sprite(x, y, 'allSprites_default', 'bullet')
            particle.setScale(1)
            const angle = Phaser.Math.DegToRad(Phaser.Math.Between(0, 360))
            const speed = Phaser.Math.Between(50, 120)
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                scale: 0,
                alpha: 0,
                duration: 500,
                delay: i * 30,
                onComplete: () => particle.destroy()
            })
        }
    }
}
