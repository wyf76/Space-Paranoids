class Game extends Phaser.Scene {
    constructor() {
        super({ key: 'Game' });
    }

    preload() {
        // Load map JSON
        this.load.tilemapTiledJSON('./map', '/assets/Map.json');

        // Load tilesets
        this.load.spritesheet('./terrainTiles_default', '/assets/kenney_top-down-tanks-redux/Tilesheet/terrainTiles_default.png', {
            frameWidth: 32,
            frameHeight: 32
        });

        this.load.spritesheet('./allSprites_default', '/assets/kenney_top-down-tanks-redux/Spritesheet/allSprites_default.png', {
            frameWidth: 32,
            frameHeight: 32
        });
    }

    create() {
        // Load the tilemap
        const map = this.make.tilemap({ key: 'map' });

        // Attach tilesets (now both 32x32)
        const terrainTileset = map.addTilesetImage('terrainTiles_default', 'terrainTiles_default', 32, 32);
        const allSpritesTileset = map.addTilesetImage('allSprites_default', 'allSprites_default', 32, 32);

        // Create layers
        const terrainLayer = map.createLayer('Tile Layer 1', terrainTileset, 0, 0);
        const spriteLayer = map.createLayer('enemy', allSpritesTileset, 0, 0);

        // Load enemy objects
        const enemiesLayer = map.getObjectLayer('enemy');
        if (!enemiesLayer) {
            console.error("Object layer 'enemy' not found!");
            return;
        }

        this.enemies = this.physics.add.group();

        enemiesLayer.objects.forEach(obj => {
            const enemy = this.enemies.create(obj.x, obj.y, 'allSprites_default');
            enemy.setData('speed', obj.properties.find(p => p.name === 'speed')?.value || 100);
            enemy.setData('patrol', obj.properties.find(p => p.name === 'patrol')?.value || false);
        });

        this.physics.add.collider(this.enemies, terrainLayer);
    }

    update() {
        this.enemies.children.iterate(enemy => {
            if (enemy.getData('patrol')) {
                enemy.x += Math.sin(this.time.now / 500) * enemy.getData('speed') * 0.01;
            }
        });
    }
}
