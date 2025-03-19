class Game extends Phaser.Scene {
    constructor() {
        super({ key: 'Game' });
    }

    preload() {
        // Load assets – adjust paths as needed
        this.load.tilemapTiledJSON('map', 'assets/Map.json');
        this.load.spritesheet('terrainTiles_default', 'assets/terrainTiles_default.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        this.load.atlas('allSprites_default', 'assets/allSprites_default.png', 'assets/allSprites_default.json');
        this.load.audio('tank_move', 'assets/tank_move.mp3');
        this.load.audio('explosion', 'assets/explosion.mp3');
        this.load.audio('shoot', 'assets/shoot.mp3');
    }

    create() {
        // --- Create Tilemap & Terrain ---
        const map = this.make.tilemap({ key: 'map' });
        const tileset = map.addTilesetImage('terrainTiles_default', 'terrainTiles_default', 32, 32);
        const terrainLayer = map.createLayer('Background', tileset, 0, 0);
        if (!terrainLayer) {
            console.error('Failed to create terrain layer "Background"');
            return;
        }
        terrainLayer.setCollisionByExclusion([-1]);
        terrainLayer.setDepth(0);

        // --- Set World Bounds ---
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // --- Create the Player ---
        // Place the player near the bottom center of the map
        this.player = this.physics.add.sprite(map.widthInPixels / 2, map.heightInPixels - 100, 'allSprites_default', 'tank_green');
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(1);
        this.player.setData('health', 5);

        // --- Create an Empty Enemy Group ---
        this.enemies = this.physics.add.group();

        // --- Create the Projectiles Group (for player's bullets) ---
        // (Uses your custom Projectile class from Projectile.js)
        this.projectiles = this.physics.add.group({
            classType: Projectile,
            maxSize: 50,
            runChildUpdate: true
        });
        this.projectiles.createMultiple({
            key: 'allSprites_default',
            frame: 'bullet',
            quantity: 50,
            active: false,
            visible: false
        });

        // --- Input Setup ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.shootKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // --- Audio ---
        this.moveSound = this.sound.add('tank_move', { volume: 0.3 });
        this.explosionSound = this.sound.add('explosion', { volume: 0.7 });
        this.shootSound = this.sound.add('shoot', { volume: 0.5 });

        // --- UI Text ---
        this.playerHealthText = this.add.text(10, 10, 'Health: 5', { fontSize: '16px', fill: '#fff' }).setScrollFactor(0);
        this.score = 0;
        this.scoreText = this.add.text(10, 30, 'Score: 0', { fontSize: '16px', fill: '#fff' }).setScrollFactor(0);

        // --- Colliders & Overlap ---
        this.physics.add.collider(this.player, terrainLayer);
        this.physics.add.collider(this.enemies, terrainLayer);
        this.physics.add.collider(this.player, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.projectiles, this.enemies, this.hitEnemyWithProjectile, null, this);

        // --- Camera ---
        const camera = this.cameras.main;
        camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        camera.startFollow(this.player);

        // --- Enemy Spawner ---
        // Spawn an enemy every 1500ms at a random x position at the top of the screen
        this.time.addEvent({
            delay: 1500,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        // --- Score Timer ---
        // Increase score by 10 every second
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.score += 10;
                this.scoreText.setText('Score: ' + this.score);
            },
            callbackScope: this,
            loop: true
        });

        this.canShoot = true;
    }

    update() {
        // --- Player Movement ---
        this.player.setVelocity(0);
        let isMoving = false;
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-200);
            isMoving = true;
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(200);
            isMoving = true;
        }
        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-200);
            isMoving = true;
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(200);
            isMoving = true;
        }
        if (isMoving) {
            const angle = Phaser.Math.RadToDeg(Math.atan2(this.player.body.velocity.y, this.player.body.velocity.x)) - 90;
            this.player.setAngle(angle);
            if (!this.moveSound.isPlaying) {
                this.moveSound.play();
            }
        } else {
            if (this.moveSound.isPlaying) {
                this.moveSound.stop();
            }
        }

        // --- Player Shooting ---
        if (Phaser.Input.Keyboard.JustDown(this.shootKey) && this.canShoot) {
            const gunOffset = 24; // Spawn bullet in front of the tank
            const rad = Phaser.Math.DegToRad(this.player.angle + 90);
            const gunX = this.player.x + Math.cos(rad) * gunOffset;
            const gunY = this.player.y + Math.sin(rad) * gunOffset;
            const projectile = this.projectiles.get(gunX, gunY, 'allSprites_default', 'bullet');
            if (projectile) {
                const speed = 300;
                projectile.fire(false, 1, Phaser.Math.RND.uuid(), Math.cos(rad) * speed, Math.sin(rad) * speed);
                this.shootSound.play();
                this.canShoot = false;
                this.time.addEvent({
                    delay: 1000,
                    callback: () => { this.canShoot = true; },
                    loop: false
                });
            }
        }

        // --- Enemy Behavior: Enemies drive toward the player ---
        this.enemies.children.iterate(enemy => {
            if (enemy.active) {
                this.physics.moveToObject(enemy, this.player, 100);
            }
        });
    }

    spawnEnemy() {
        // Spawn an enemy tank at a random x at the top of the world
        const x = Phaser.Math.Between(50, this.physics.world.bounds.width - 50);
        const y = 0;
        const enemy = this.enemies.create(x, y, 'allSprites_default', 'tank_blue');
        if (enemy) {
            enemy.setDepth(1);
            enemy.setData('health', 1); // one hit kills enemy
            // Give a slight downward velocity so it enters the play area
            enemy.setVelocityY(50);
        }
    }

    hitEnemy(player, enemy) {
        // When an enemy collides with the player:
        player.setData('health', player.getData('health') - 1);
        enemy.destroy();
        this.enemies.remove(enemy, true, true);
        this.createExplosion(enemy.x, enemy.y);
        if (player.getData('health') <= 0) {
            this.scene.start('GameOver', { score: this.score });
        }
    }

    hitEnemyWithProjectile(projectile, enemy) {
        // When the player's bullet hits an enemy:
        projectile.disableBody(true, true);
        projectile.destroy();
        if (enemy && enemy.active) {
            enemy.destroy();
            this.enemies.remove(enemy, true, true);
            this.createExplosion(enemy.x, enemy.y);
            // Reward additional score for shooting an enemy
            this.score += 20;
            this.scoreText.setText('Score: ' + this.score);
        }
    }

    createExplosion(x, y) {
        this.explosionSound.play();
        for (let i = 0; i < 5; i++) {
            const particle = this.add.sprite(x, y, 'allSprites_default', 'bullet');
            particle.setScale(1);
            const angle = Phaser.Math.DegToRad(Phaser.Math.Between(0, 360));
            const speed = Phaser.Math.Between(50, 100);
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                scale: 0,
                alpha: 0,
                duration: 500,
                delay: i * 50,
                onComplete: () => particle.destroy()
            });
        }
    }
}
