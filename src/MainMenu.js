class MainMenu extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenu' });
    }

    preload() {
        this.load.image('title', 'assets/title.png');
    }

    create() {
        this.add.image(400, 300, 'title');
        this.add.text(300, 500, 'Press SPACE to Start', { fontSize: '20px', fill: '#fff' });
        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('Game');
        });
    }
}