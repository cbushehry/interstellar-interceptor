// Define constants for game settings
const LASER_SPEED = 1000;
const PLAYER_SCALE = 1;
const PLAYER_SPEED = 10;
const KEY_CONFIG = {
    UP: 'W',
    DOWN: 'S',
    LEFT: 'A',
    RIGHT: 'D'
};

function preload() {
    this.load.image('background', 'assets/images/background1.png');
    this.load.image('background-stars', 'assets/images/background2.png');
    this.load.image('asteroid1', 'assets/images/asteroid1.png');
    this.load.image('asteroid2', 'assets/images/asteroid2.png');
    this.load.image('playerShip1', 'assets/images/playerShip1.png');
    this.load.image('playerShip2', 'assets/images/playerShip2.png');
    this.load.image('laser1', 'assets/images/laser1.png');
}

function create() {
    this.bg = this.add.tileSprite(0, 0, game.scale.width, game.scale.height, 'background').setOrigin(0);
    this.bgStars = this.add.tileSprite(0, 0, game.scale.width, game.scale.height, 'background-stars').setOrigin(0);

    // Initialize player sprite
    this.player = this.physics.add.sprite(game.scale.width / 2, game.scale.height / 2, 'playerShip1');
    this.player.setScale(PLAYER_SCALE);

    // Creating an animation for the propelling fire effect
    this.anims.create({
        key: 'fly',
        frames: [
            { key: 'playerShip1' },
            { key: 'playerShip2' }
        ],
        frameRate: 8, 
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
    // Getting the angle between the player and the pointer
    var pointer = this.input.activePointer;
    var angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y);

    // Setting the player's rotation to the angle towards the pointer
    this.player.rotation = angle;

    // Calculate velocity based on the player's rotation
    if (controls.up.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x + Math.cos(this.player.rotation) * PLAYER_SPEED * 0.1);
        this.player.setVelocityY(this.player.body.velocity.y + Math.sin(this.player.rotation) * PLAYER_SPEED * 0.1);
    } else {
        // You might want to introduce a constant to control the slow down speed
        this.player.setVelocityX(this.player.body.velocity.x * 0.96);
        this.player.setVelocityY(this.player.body.velocity.y * 0.96);
    }
    
    if (controls.down.isDown) {
        // Slow down the player gradually
        this.player.setVelocityX(this.player.body.velocity.x * 0.94);
        this.player.setVelocityY(this.player.body.velocity.y * 0.94);
    }

    // The left and right controls can remain as they are for strafing, or removed if not needed
    if (controls.left.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x - PLAYER_SPEED * 0.05);
    }
    else if (controls.right.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x + PLAYER_SPEED * 0.05);
    }
}

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

// Create the game instance
const game = new Phaser.Game(config);