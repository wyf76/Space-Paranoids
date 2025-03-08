class Game extends Phaser.Scene {
    constructor() {
        super({ key: 'Game' });
    }

    preload() {
        this.load.tilemapTiledJSON('map', 'assets/Map.tmx');
        this.load.image('tiles', 'assets/kenney_top-down-tanks/Tilesheet/terrainTiles_default.png');
        this.load.spritesheet('enemy', 'assets/kenney_top-down-tanks/Spritesheet/allSprites_default.png', { frameWidth: 32, frameHeight: 32 });
    }

    create() {
        const map = this.make.tilemap({ key: 'map' });
        const tileset = map.addTilesetImage('terrainTiles_default', 'tiles');
        const layer = map.createLayer('Tile Layer 1', tileset, 0, 0);

        const enemiesLayer = map.getObjectLayer('Enemies');
        this.enemies = this.physics.add.group();

        enemiesLayer.objects.forEach(obj => {
            const enemy = this.enemies.create(obj.x, obj.y, 'enemy');
            enemy.setData('speed', obj.properties.find(p => p.name === 'speed')?.value || 100);
            enemy.setData('patrol', obj.properties.find(p => p.name === 'patrol')?.value || false);
        });

        this.physics.add.collider(this.enemies, layer);
    }

    update() {
        this.enemies.children.iterate(enemy => {
            if (enemy.getData('patrol')) {
                enemy.x += Math.sin(this.time.now / 500) * enemy.getData('speed') * 0.01;
            }
        });
    }
}