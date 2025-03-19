class Credits extends Phaser.Scene {
    constructor() {
        super({ key: 'Credits' });
    }

    create() {
        this.add.text(100, 100, 'Credits', { fontSize: '40px', fill: '#fff' });
        this.add.text(100, 180, 'Game Design & Programming: Yufan Weng', { fontSize: '20px', fill: '#fff' });
        this.add.text(100, 220, 'Assets: Kenney.nl, OpenGameArt.org', { fontSize: '20px', fill: '#fff' });
        this.add.text(100, 260, 'Music: free sound, https://freesound.org/', {fontSize: '20px', fill: '#fff'});
        this.add.text(100, 290, 'Press SPACE to Return to Main Menu', { fontSize: '20px', fill: '#fff' });

        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('MainMenu');
        });
    }
}
