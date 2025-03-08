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