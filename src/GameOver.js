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