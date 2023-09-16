let config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
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
            gravity: { y: 300 },
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
    // Load your assets here, e.g.:
    this.load.image('background', 'assets/images/background.png');
    this.load.image('background-stars', 'assets/images/background-stars.png');
    // this.load.image('star', 'path/to/your/star.png');
}

function create() {
    this.bg = this.add.tileSprite(0, 0, game.scale.width, game.scale.height, 'background').setOrigin(0);
    this.bgStars = this.add.tileSprite(0, 0, game.scale.width, game.scale.height, 'background-stars').setOrigin(0);
}

function update() {
    // Update your game in this function, e.g.:
    // Here you'll update your game's logic, check for collisions, etc.
}