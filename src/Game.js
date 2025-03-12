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
        this.load.audio('bgm', '/assets/bgm.mp3')
        this.load.audio('tank_move', '/assets/tank_move.mp3')
        this.load.audio('explosion', '/assets/explosion.mp3')
    }

    create() {
        const map = this.make.tilemap({ key: 'map' })

        const terrainTileset = map.addTilesetImage('terrainTiles_default', 'terrainTiles_default', 32, 32)
        const terrainLayer = map.createLayer('Background', terrainTileset, 0, 0)
        if (!terrainLayer) {
            console.error("Failed to create terrain layer 'Background'")
            return
        }
        terrainLayer.setCollisionByExclusion([-1])

        const enemiesLayer = map.getObjectLayer('enemy')
        if (!enemiesLayer || !enemiesLayer.objects) {
            console.error("Object layer 'enemy' not found or contains no objects!")
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
        })

        this.player = this.physics.add.sprite(100, 100, 'allSprites_default', 'tank_green')
        this.player.setData('speed', 200)

        this.physics.add.collider(this.player, terrainLayer)
        this.physics.add.collider(this.enemies, terrainLayer)
        this.physics.add.collider(this.player, this.enemies, this.hitEnemy, null, this)

        const camera = this.cameras.main
        camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
        camera.startFollow(this.player)

        this.cursors = this.input.keyboard.createCursorKeys()

        this.bgm = this.sound.add('bgm', { loop: true, volume: 0.5 })
        this.bgm.play()

        this.moveSound = this.sound.add('tank_move', { volume: 0.3 })

        this.explosionSound = this.sound.add('explosion', { volume: 0.7 })
    }

    update() {
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

        this.enemies.children.iterate(enemy => {
            if (enemy.getData('patrol')) {
                enemy.x += Math.sin(this.time.now / 500) * enemy.getData('speed') * 0.01
            }
        })
    }

    hitEnemy(player, enemy) {
        this.bgm.stop()
        this.moveSound.stop()
        this.explosionSound.play()

        player.disableBody(true, true)
        enemy.disableBody(true, true)

        this.time.delayedCall(1000, () => {
            this.scene.start('GameOver')
        }, [], this)
    }
}