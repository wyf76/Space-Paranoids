class Game extends Phaser.Scene {
    constructor() {
        super({ key: 'Game' });
        this.isPaused = false;
        this.difficultyFactor = 1;  // Gradually increases over time
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
        this.load.audio('bgMusic', 'assets/bgMusic.mp3'); // Ensure this file exists
    }

    create() {
        // Background Music
        this.bgMusic = this.sound.add('bgMusic', { volume: 0.3, loop: true });
        this.bgMusic.play();

        // Create Tilemap & Terrain
        const map = this.make.tilemap({ key: 'map' });
        const tileset = map.addTilesetImage('terrainTiles_default', 'terrainTiles_default', 32, 32);
        const terrainLayer = map.createLayer('Background', tileset, 0, 0);
        if (!terrainLayer) { return; }
        terrainLayer.setCollisionByExclusion([-1]);
        terrainLayer.setDepth(0);

        // Set World Bounds
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // Create the Player (placed near bottom center)
        this.player = this.physics.add.sprite(map.widthInPixels / 2, map.heightInPixels - 100, 'allSprites_default', 'tank_green');
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(1);
        this.player.setData('health', 5);

        // Create Enemy Group
        this.enemies = this.physics.add.group();

        // Create the Projectiles Group (for player's bullets)
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

        // Input Setup
        this.cursors = this.input.keyboard.createCursorKeys();
        this.shootKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this.specialKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);

        // Audio Setup
        this.moveSound = this.sound.add('tank_move', { volume: 0.3 });
        this.explosionSound = this.sound.add('explosion', { volume: 0.7 });
        this.shootSound = this.sound.add('shoot', { volume: 0.5 });

        // UI Text Setup
        this.playerHealthText = this.add.text(10, 10, 'Health: ' + this.player.getData('health'), { fontSize: '16px', fill: '#fff' }).setScrollFactor(0);
        this.score = 0;
        this.scoreText = this.add.text(10, 30, 'Score: ' + this.score, { fontSize: '16px', fill: '#fff' }).setScrollFactor(0);
        // Special ability status text
        this.specialAbilityUnlocked = false;
        this.specialText = this.add.text(10, 50, 'Special: Locked', { fontSize: '16px', fill: '#fff' }).setScrollFactor(0);
        // Pause overlay text
        this.pauseText = this.add.text(300, 250, 'Paused\nPress P to Resume', { fontSize: '40px', fill: '#fff', align: 'center' });
        this.pauseText.setScrollFactor(0);
        this.pauseText.setVisible(false);

        // Colliders & Overlap
        this.physics.add.collider(this.player, terrainLayer);
        this.physics.add.collider(this.enemies, terrainLayer);
        this.physics.add.collider(this.player, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.projectiles, this.enemies, this.hitEnemyWithProjectile, null, this);

        // Camera Setup
        const camera = this.cameras.main;
        camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        camera.startFollow(this.player);

        // Enemy Spawner (initially every 1500ms; later adjusted by difficulty)
        this.enemyTimer = this.time.addEvent({
            delay: 1500,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        // Score Timer (increases score and difficulty over time)
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.score += 10;
                this.scoreText.setText('Score: ' + this.score);
                this.difficultyFactor += 0.03;
            },
            callbackScope: this,
            loop: true
        });

        // Special Ability Unlock Timer (unlock after 30 seconds)
        this.time.addEvent({
            delay: 30000,
            callback: () => {
                this.specialAbilityUnlocked = true;
                this.specialText.setText('Special: Ready (Press B)');
            },
            callbackScope: this,
            loop: false
        });

        this.canShoot = true;
    }

    update() {
        // Pause/Resume Handling
        if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
            this.isPaused = !this.isPaused;
            if (this.isPaused) {
                this.physics.world.pause();
                this.bgMusic.pause();
                this.pauseText.setVisible(true);
                this.moveSound.stop();
            } else {
                this.physics.world.resume();
                this.bgMusic.resume();
                this.pauseText.setVisible(false);
            }
        }
        if (this.isPaused) return;

        // Update Health Display
        this.playerHealthText.setText('Health: ' + this.player.getData('health'));

        // Update enemy spawn rate based on difficultyFactor (min delay 800ms)
        let newDelay = 1500 - (this.difficultyFactor - 1) * 200;
        if(newDelay < 800) newDelay = 800;
        this.enemyTimer.delay = newDelay;

        // Player Movement
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
        } else if (this.moveSound.isPlaying) {
            this.moveSound.stop();
        }

        // Player Shooting
        if (Phaser.Input.Keyboard.JustDown(this.shootKey) && this.canShoot) {
            const gunOffset = 24;
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

        // Special Ability: If unlocked and player presses B, destroy all enemies.
        if (Phaser.Input.Keyboard.JustDown(this.specialKey) && this.specialAbilityUnlocked) {
            this.enemies.children.iterate(enemy => {
                if (enemy.active) {
                    this.createExplosion(enemy.x, enemy.y);
                    enemy.destroy();
                    this.enemies.remove(enemy, true, true);
                    this.score += 20; // Award bonus score per enemy
                }
            });
            this.scoreText.setText('Score: ' + this.score);
            this.specialAbilityUnlocked = false;
            this.specialText.setText('Special: Cooldown');
            // Restart special ability unlock after cooldown (30 seconds)
            this.time.addEvent({
                delay: 3000,
                callback: () => {
                    this.specialAbilityUnlocked = true;
                    this.specialText.setText('Special: Ready (Press B)');
                },
                callbackScope: this,
                loop: false
            });
        }

        // Enemy Behavior: Enemies drive toward the player; speed scales with difficulty
        this.enemies.children.iterate(enemy => {
            if (enemy.active) {
                this.physics.moveToObject(enemy, this.player, 80 * this.difficultyFactor);
            }
        });
    }

    spawnEnemy() {
        // Spawn an enemy at a random x at the top
        const x = Phaser.Math.Between(50, this.physics.world.bounds.width - 50);
        const y = 0;
        let enemy;
        // Occasionally spawn a "strong" enemy (20% chance)
        if (Phaser.Math.Between(1, 10) > 8) {
            enemy = this.enemies.create(x, y, 'allSprites_default', 'tank_blue');
            if (enemy) {
                enemy.setDepth(1);
                enemy.setData('health', 3);
                enemy.setVelocityY(60);
            }
        } else {
            enemy = this.enemies.create(x, y, 'allSprites_default', 'tank_blue');
            if (enemy) {
                enemy.setDepth(1);
                enemy.setData('health', 1);
                enemy.setVelocityY(40);
            }
        }
    }

    hitEnemy(player, enemy) {
        // On collision: reduce player's health and destroy the enemy.
        player.setData('health', player.getData('health') - 1);
        this.createExplosion(enemy.x, enemy.y);
        enemy.destroy();
        this.enemies.remove(enemy, true, true);
        if (player.getData('health') <= 0) {
            this.scene.start('GameOver', { score: this.score });
        }
    }

    hitEnemyWithProjectile(projectile, enemy) {
        projectile.disableBody(true, true);
        projectile.destroy();
        if (enemy && enemy.active) {
            enemy.destroy();
            this.enemies.remove(enemy, true, true);
            this.createExplosion(enemy.x, enemy.y);
            this.score += 20;
            this.scoreText.setText('Score: ' + this.score);
        }
    }

    createExplosion(x, y) {
        this.explosionSound.play();
        for (let i = 0; i < 8; i++) {
            const particle = this.add.sprite(x, y, 'allSprites_default', 'bullet');
            particle.setScale(1);
            const angle = Phaser.Math.DegToRad(Phaser.Math.Between(0, 360));
            const speed = Phaser.Math.Between(50, 120);
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                scale: 0,
                alpha: 0,
                duration: 500,
                delay: i * 30,
                onComplete: () => particle.destroy()
            });
        }
    }
}
