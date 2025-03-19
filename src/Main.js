const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: { 
        default: 'arcade',
        arcade: {
            debug: false // Set to true for collision debugging
        }
    },
    scene: [MainMenu, Game, GameOver, Credits]
};

const game = new Phaser.Game(config);
