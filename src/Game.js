class Game extends Phaser.Scene {
    constructor() {
        super({ key: 'Game' });
    }

    preload() {
        this.load.tilemapTiledJSON('map', '/assets/Map.json');
        this.load.spritesheet('terrainTiles_default', '/assets/terrainTiles_default.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        this.load.atlas('allSprites_default', '/assets/allSprites_default.png', '/assets/allSprites_default.json');
    }

    create() {
        // Load the tilemap
        const map = this.make.tilemap({ key: 'map' });

        // Add terrain layer as walls
        const terrainTileset = map.addTilesetImage('terrainTiles_default', 'terrainTiles_default', 32, 32);
        const terrainLayer = map.createLayer('Tile Layer 1', terrainTileset, 0, 0);
        terrainLayer.setCollisionByExclusion([-1]); // Set all tiles as collidable (adjust if specific tiles should be passable)

        // Enemy setup
        const enemiesLayer = map.getObjectLayer('enemy');
        if (!enemiesLayer || !enemiesLayer.objects) {
            console.error("Object layer 'enemy' not found or contains no objects!");
            return;
        }
        this.enemies = this.physics.add.group();
        enemiesLayer.objects.forEach(obj => {
            const enemy = this.enemies.create(obj.x, obj.y - 23, 'allSprites_default', 'tank_blue');
            enemy.setData('speed', obj.properties.find(p => p.name === 'speed')?.value || 100);
            enemy.setData('patrol', obj.properties.find(p => p.name === 'patrol')?.value || false);
        });

        // Player setup
        this.player = this.physics.add.sprite(100, 100, 'allSprites_default', 'tank_green'); // Start at (100, 100)
        this.player.setData('speed', 200);

        // Physics and collisions
        this.physics.add.collider(this.player, terrainLayer);
        this.physics.add.collider(this.enemies, terrainLayer);
        this.physics.add.collider(this.player, this.enemies);

        // Camera setup
        const camera = this.cameras.main;
        camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        camera.startFollow(this.player);

        // Keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update() {
        // Player movement
        this.player.setVelocity(0);
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-this.player.getData('speed'));
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(this.player.getData('speed'));
        }
        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-this.player.getData('speed'));
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(this.player.getData('speed'));
        }

        // Enemy movement
        this.enemies.children.iterate(enemy => {
            if (enemy.getData('patrol')) {
                enemy.x += Math.sin(this.time.now / 500) * enemy.getData('speed') * 0.01;
            }
        });
    }
}

class GameOver extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOver' });
    }

    create() {
        this.add.text(300, 300, 'Game Over', { fontSize: '40px', fill: '#fff' });
        this.add.text(300, 400, 'Press R to Restart', { fontSize: '20px', fill: '#fff' });
        this.input.keyboard.on('keydown-R', () => {
            this.scene.start('Game');
        });
    }
}

class MainMenu extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenu' });
    }

    create() {
        this.add.text(250, 200, 'SPACE PARANOIDS', { fontSize: '40px', fill: '#fff', fontStyle: 'bold' });
        this.add.text(300, 300, 'Press SPACE to Start', { fontSize: '20px', fill: '#fff' });
        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('Game');
        });
    }
}

// Scene configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [MainMenu, Game, GameOver]
};

const game = new Phaser.Game(config);