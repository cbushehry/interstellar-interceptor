// Constants for configurations
const PLAYER_SPEED = 100;
const KEY_CONFIG = {
    UP: 'W',
    DOWN: 'S',
    LEFT: 'A',
    RIGHT: 'D'
};

let config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    scene: {
        preload: preload,
        create: create,
        update: update,
        resize: resize,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },  // Consider revising this value for a space game
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth,
        height: window.innerHeight
    },
    callbacks: {
        postBoot: function (game) {
            // Listen for window resize events
            window.addEventListener('resize', function () {
                game.scale.resize(window.innerWidth, window.innerHeight);
                game.scene.scenes[0].resize({ width: window.innerWidth, height: window.innerHeight });
            });
        }
    },
};

let game = new Phaser.Game(config);
let controls;

function resize(gameSize) {
    let width = gameSize.width;
    let height = gameSize.height;

    if (width === undefined) {
        width = this.game.renderer.width;
    }
    if (height === undefined) {
        height = this.game.renderer.height;
    }
    
    this.cameras.resize(width, height);

    this.bg.setSize(width, height);
    this.bgStars.setSize(width, height);
}

function preload() {
    this.load.image('background', 'assets/images/background.png');
    this.load.image('background-stars', 'assets/images/background-stars.png');
    this.load.image('spaceship11', 'assets/images/spaceship-11.png');
    this.load.image('spaceship12', 'assets/images/spaceship-12.png');
}

function create() {
    this.bg = this.add.tileSprite(0, 0, game.scale.width, game.scale.height, 'background').setOrigin(0);
    this.bgStars = this.add.tileSprite(0, 0, game.scale.width, game.scale.height, 'background-stars').setOrigin(0);

    // Adding the player sprite at the middle of the screen
    this.player = this.physics.add.sprite(game.scale.width / 2, game.scale.height / 2, 'spaceship11');

    // Creating an animation for the propelling fire effect
    this.anims.create({
        key: 'fly',
        frames: [
            { key: 'spaceship11' },
            { key: 'spaceship12' }
        ],
        frameRate: 10, 
        repeat: -1
    });

    // Playing the created animation
    this.player.anims.play('fly');

    // Setting up universal controls with WASD keys
    controls = {
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.UP]),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.DOWN]),
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.LEFT]),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.RIGHT])
    };
}

function update() {
    // Basic movement controls with WASD using player speed constant
    if (controls.left.isDown) {
        this.player.setVelocityX(-PLAYER_SPEED);
    }
    else if (controls.right.isDown) {
        this.player.setVelocityX(PLAYER_SPEED);
    }
    else {
        this.player.setVelocityX(0);
    }

    if (controls.up.isDown) {
        this.player.setVelocityY(-PLAYER_SPEED);
    }
    else if (controls.down.isDown) {
        this.player.setVelocityY(PLAYER_SPEED);
    }
    else {
        this.player.setVelocityY(0);
    }
}