// Phaser components used: Physics system, Camera, Animation Manager, Timers, Text Objects
// Assets sourced from: Kenney.nl (terrainTiles_default, allSprites_default), OpenGameArt.org (tank_move.mp3, explosion.mp3)
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [MainMenu, Game, GameOver]
}
const game = new Phaser.Game(config)