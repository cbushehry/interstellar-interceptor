// Define constants for game settings
const LASER_SPEED = 800;
const PLAYER_SCALE = 1;
const PLAYER_ACCEL = 10;
const KEY_CONFIG = {
    ACCELERATE: 'W',
    DECELERATE: 'S',
    STRAFE_LEFT: 'A',
    STRAFE_RIGHT: 'D'
};

function preload() {
    this.load.image('background', 'assets/images/background1.png');
    this.load.image('background-stars', 'assets/images/background2.png');
    this.load.image('playerShip1', 'assets/images/playerShip1.png');
    this.load.image('playerShip2', 'assets/images/playerShip2.png');
    this.load.image('laser1', 'assets/images/laser1.png');
    this.load.image('heart', 'assets/images/heart.png');

    this.load.image('asteroid1', 'assets/images/asteroid1.png');
    this.load.image('asteroid2', 'assets/images/asteroid2.png');
    this.load.image('explosion1', 'assets/images/explosion/explosion1.png');
    this.load.image('explosion2', 'assets/images/explosion/explosion2.png');
    this.load.image('explosion3', 'assets/images/explosion/explosion3.png');
    this.load.image('explosion4', 'assets/images/explosion/explosion4.png');
    this.load.image('explosion5', 'assets/images/explosion/explosion5.png');
    this.load.image('explosion6', 'assets/images/explosion/explosion6.png');
    this.load.image('explosion7', 'assets/images/explosion/explosion7.png');
}

function create() {
    this.bg = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'background').setOrigin(0);
    this.bgStars = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'background-stars').setOrigin(0);

    // Setting up universal controls with WASD keys
    controls = {
        ACCELERATE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.ACCELERATE]),
        DECELERATE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.DECELERATE]),
        STRAFE_LEFT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.STRAFE_LEFT]),
        STRAFE_RIGHT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.STRAFE_RIGHT])
    };

    // Initialize player sprite
    this.player = this.physics.add.sprite(this.scale.width / 2, this.scale.height / 2, 'playerShip1');
    this.player.setScale(PLAYER_SCALE);
    this.input.on('pointerdown', shootLaser, this);
    this.lastShotTime = 0;
    this.isShooting = false;

    // Set isShooting to true when the pointer is down
    this.input.on('pointerdown', function () {
        this.isShooting = true;
    }, this);

    // Set isShooting to false when the pointer is up
    this.input.on('pointerup', function () {
        this.isShooting = false;
    }, this);

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

    // Create a group for lasers
    lasers = this.physics.add.group({
        classType: Phaser.Physics.Arcade.Image, // Setting class type to Arcade Image for performance benefits
        maxSize: 1000, // Set a maximum size for the group to limit the number of active laser objects
    });

    // Create a group for asteroids
    asteroids = this.physics.add.group({
        classType: Phaser.Physics.Arcade.Image,
        maxSize: 164,  // Adjust the size as necessary
    });

    // Setup collision detection between lasers and asteroids with explosion animation
    this.physics.add.collider(lasers, asteroids, onLaserHitAsteroid, null, this);
    this.anims.create({
        key: 'explode',
        frames: [
            { key: 'explosion1' },
            { key: 'explosion2' },
            { key: 'explosion3' },
            { key: 'explosion4' },
            { key: 'explosion5' },
            { key: 'explosion6' },
            { key: 'explosion7' }
        ],
        frameRate: 20,
        repeat: 0,
        hideOnComplete: true
    });

    this.time.addEvent({
        delay: 2000,  // 10 seconds
        callback: spawnAsteroids,
        callbackScope: this,
        loop: true
    });

    // Initialize player health
    this.playerHealth = 3;
    this.hearts = this.add.group({
        key: 'heart',
        repeat: this.playerHealth - 1,
        setXY: { x: 10, y: 10, stepX: 36 }
    });
}

function update() {
    var pointer = this.input.activePointer;
    var angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y);
    this.player.rotation = Phaser.Math.Angle.RotateTo(this.player.rotation, angle, 0.04);

        // Check if the player is holding down the shoot button
        if (this.isShooting) {
            shootLaser.call(this);
        }

    // Calculate velocity based on the player's rotation
    if (controls.ACCELERATE.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x + Math.cos(this.player.rotation) * PLAYER_ACCEL * 0.1);
        this.player.setVelocityY(this.player.body.velocity.y + Math.sin(this.player.rotation) * PLAYER_ACCEL * 0.1);
    } else if (controls.DECELERATE.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x * 0.94);
        this.player.setVelocityY(this.player.body.velocity.y * 0.94);
    } else {
        this.player.setVelocityX(this.player.body.velocity.x * 0.96);
        this.player.setVelocityY(this.player.body.velocity.y * 0.96);
    }

    // Implementing strafing
    if (controls.STRAFE_LEFT.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x + Math.sin(this.player.rotation) * PLAYER_ACCEL * 0.1);
        this.player.setVelocityY(this.player.body.velocity.y - Math.cos(this.player.rotation) * PLAYER_ACCEL * 0.1);
    }
    else if (controls.STRAFE_RIGHT.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x - Math.sin(this.player.rotation) * PLAYER_ACCEL * 0.1);
        this.player.setVelocityY(this.player.body.velocity.y + Math.cos(this.player.rotation) * PLAYER_ACCEL * 0.1);
    }

    // Introduce a velocity cap to prevent indefinite acceleration
    let speed = Math.sqrt(this.player.body.velocity.x ** 2 + this.player.body.velocity.y ** 2);
    let maxSpeed = 100;
    if (speed > maxSpeed) {
        this.player.body.velocity.normalize().scale(maxSpeed);
    }

    // Update lasers and asteroids
    lasers.getChildren().forEach(laser => {
        if (laser.x < 0 || laser.x > game.scale.width || laser.y < 0 || laser.y > game.scale.height) {
            laser.setActive(false);
            laser.setVisible(false);
        }
    });

    asteroids.getChildren().forEach(asteroid => {
        if (asteroid.active) {
            // Retrieve the initial position of the asteroid
            const initialPosition = asteroid.getData('initialPosition');
    
            // Calculate the distance traveled by the asteroid from its initial position
            const distanceTraveled = Phaser.Math.Distance.Between(initialPosition.x, initialPosition.y, asteroid.x, asteroid.y);
    
            // Check if the distance traveled exceeds the threshold, for example, 500 units
            if (distanceTraveled > 3200) {
                asteroid.setActive(false);
                asteroid.setVisible(false);
            }
        }
    });
}

function shootLaser() {
    // Get the current time
    let currentTime = this.time.now;

    // Check if enough time has passed since the last shot
    if (currentTime - this.lastShotTime < 400) {
        // If not enough time has passed, exit the function without firing
        return;
    }
    
    // Update the last shot time
    this.lastShotTime = currentTime;

    // Existing laser shooting logic
    let laser = lasers.get(this.player.x, this.player.y, 'laser1');
    if (laser) {
        laser.setActive(true);
        laser.setVisible(true);
        this.physics.velocityFromRotation(this.player.rotation, LASER_SPEED, laser.body.velocity);
    }
}

function spawnAsteroids() {
    let asteroidSprite = Phaser.Math.RND.pick(['asteroid1', 'asteroid2']);

    // Define the radius of the invisible circle around the player
    let radius = 2400;

    // Generate a random angle in radians
    let randomAngle = Phaser.Math.FloatBetween(0, 2 * Math.PI);

    // Calculate the spawn position on the invisible circle around the player
    let x = this.player.x + Math.cos(randomAngle) * radius;
    let y = this.player.y + Math.sin(randomAngle) * radius;

    // Get an inactive asteroid from the group or create a new one if none are available
    let asteroid = asteroids.get(x, y, asteroidSprite);

    if (asteroid) {
        asteroid.setActive(true);
        asteroid.setVisible(true);
        asteroid.setScale(Phaser.Math.Between(3, 4)); // Set the scale/size of asteroid between 3x to 4x

        // Calculate the velocity to make the asteroid move towards the playerShip
        let velocityX = (this.player.x - x) * 0.07; // Increase the speed factor for faster movement
        let velocityY = (this.player.y - y) * 0.07;

        asteroid.body.setVelocity(velocityX, velocityY);

        // Store the original velocities and initial position using setData
        asteroid.setData('velocity', {x: velocityX, y: velocityY});
        asteroid.setData('initialPosition', {x: x, y: y});

        // Set the maximum hit count for all asteroids to 10
        asteroid.maxHitCount = 4;
        asteroid.hitCount = 0;

        // Add a slight rotation to the asteroid
        if (Phaser.Math.Between(0, 1)) {
            asteroid.body.setAngularVelocity(Phaser.Math.Between(-120, 120)); // Adjust the range for more or less rotation
        }
    }
}

function onLaserHitAsteroid(laser, asteroid) {
    // Deactivate and hide the laser
    laser.setActive(false);
    laser.setVisible(false);
    
    // Move the laser off-screen
    laser.x = -10;
    laser.y = -10;

    // Increase the hit count of the asteroid
    asteroid.hitCount = (asteroid.hitCount || 0) + 1;

    // Check if the asteroid hit count is less than the maximum hit count
    if (asteroid.hitCount < asteroid.maxHitCount) {
        // Reset the velocity to the original velocity to maintain its course
        let originalVelocity = asteroid.getData('velocity');
        asteroid.body.setVelocity(originalVelocity.x, originalVelocity.y);
        return;
    }

    // If the asteroid hit count is equal to or greater than the maximum hit count, destroy it
    asteroid.setActive(false);
    asteroid.setVisible(false);

    // Create and play the explosion animation at the asteroid's position
    let explosion = this.add.sprite(asteroid.x, asteroid.y, 'explosion1');
    
    // Set the scale of the explosion to match the scale of the asteroid
    explosion.setScale(asteroid.scaleX, asteroid.scaleY);
    
    explosion.play('explode');
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
                clearTimeout(resizeTimer);
                var resizeTimer = setTimeout(function() {
                    game.scale.resize(window.innerWidth, window.innerHeight);
                    game.scene.scenes[0].resize({ width: window.innerWidth, height: window.innerHeight });
                }, 200);
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