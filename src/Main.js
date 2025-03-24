// Space Paranoids - Final Project Description
// This project is a recreation of the fictional arcade game "Space Paranoids" from the movie Tron.
// You play as a green tank in a grid-based arena, battling waves of blue enemy tanks that spawn from the top.
// The goal is to survive as long as possible, scoring points by destroying enemies and collecting power-ups.
// Features:
// - Core Gameplay: Move with arrow keys, shoot with spacebar, avoid or destroy enemies.
// - Power-Ups: Collect tiles on the map for random power-ups Rapid Fire (faster shooting) or blue power-ups for Speed Boost (faster movement), spawning every 10 seconds with a 50% chance.
// - Dynamic Difficulty: Enemy speed increases over time, and some enemies are tougher (higher health).
// - UI: Displays health, score, instructions, and active power-up status.
// - Audio: Background music, sound effects for movement, shooting, explosions, and power-up collection.
// - Visual Effects: Explosion particles when enemies are destroyed, pulsing effect on power-ups.
// Phaser Components Used: Physics System (collisions, movement), Cameras (follow player), Particle Effects (explosions), Tween Manager (power-up pulsing, explosion animations), 
// Timers (enemy spawning, score updates, power-up spawning, shooting cooldown).
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
}

const game = new Phaser.Game(config);
