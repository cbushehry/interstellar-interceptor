// Define constants for game settings
const PLAYER_SCALE = 1.2;
const PLAYER_ACCEL = 10;
const LASER_SPEED = 1111;
const scoreElement = document.getElementById('score');
let playerScore = 0;

const KEY_CONFIG = {
    ACCELERATE: 'W',
    DECELERATE: 'S',
    STRAFE_LEFT: 'A',
    STRAFE_RIGHT: 'D'
};

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
    this.player.setData('isInvincible', false);

    // Set isShooting to true when the pointer is down
    this.input.on('pointerdown', function () {
        this.isShooting = true;
    }, this);

    // Set isShooting to false when the pointer is up
    this.input.on('pointerup', function () {
        this.isShooting = false;
    }, this);

    // Animation for the propelling fire effect
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
        maxSize: 512,  // Adjust the size as necessary
    });

    // Setup collision detection between lasers and asteroids and playerShip with explosion animation
    this.physics.add.collider(asteroids, asteroids, asteroidHitAsteroid, null, this);
    this.physics.add.collider(this.player, asteroids, playerShipHitAsteroid, null, this);
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
        delay: 5000,  // 3 seconds
        callback: spawnAsteroids,
        callbackScope: this,
        loop: true
    });

    this.time.addEvent({
        delay: 15000, // 9 seconds
        callback: spawnAsteroidClusters,
        callbackScope: this,
        loop: true
    });

    // Initialize player health
    this.playerHealth = 3;
    this.hearts = this.add.group({
        key: 'heart',
        repeat: this.playerHealth - 1,
        setXY: { x: 20, y: 20, stepX: 36 }
    });

    // Set the scale of each heart in the group
    let scaleValue = 2; // Set this to whatever scale you desire
    this.hearts.getChildren().forEach(heart => {
        heart.setScale(scaleValue);
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
            if (distanceTraveled > 4800) {
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
    if (currentTime - this.lastShotTime < 500) {
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
        laser.setScale(1.2);
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

        // Set the scale/size of asteroid between 2x to 4x
        let scale = Phaser.Math.Between(2, 4);
        asteroid.setScale(scale);

        // Calculate the speed factor based on the size of the asteroid
        let speedFactor = Phaser.Math.Linear(0.10, 0.05, (scale - 2) / (4 - 2));

        // Calculate the velocity to make the asteroid move towards the playerShip
        let velocityX = (this.player.x - x) * speedFactor;
        let velocityY = (this.player.y - y) * speedFactor;

        asteroid.body.setVelocity(velocityX, velocityY);

        // Store the original velocities and initial position using setData
        asteroid.setData('velocity', {x: velocityX, y: velocityY});
        asteroid.setData('initialPosition', {x: x, y: y});

        // Set the maximum hit count for all asteroids based on their scale
        asteroid.maxHitCount = scale <= 3 ? 3 : 4;
        asteroid.hitCount = 0;

        // Add a slight rotation to the asteroid
        if (Phaser.Math.Between(0, 1)) {
            asteroid.body.setAngularVelocity(Phaser.Math.Between(-120, 120)); // Adjust the range for more or less rotation
        }
    }
}

function spawnAsteroidClusters() {
    // Number of asteroids in a cluster
    let clusterSize = Phaser.Math.Between(32, 32);

    // Define the initial spawn position slightly off screen to the top right
    let startX = this.game.config.width + 100;
    let startY = -50;

    // Velocity towards bottom left of the screen
    let velocityX = -Phaser.Math.Between(100, 120);
    let velocityY = Phaser.Math.Between(60, 70);

    for (let i = 0; i < clusterSize; i++) {
        // Adjusting the spawn position for each asteroid in the cluster
        let x = startX + Phaser.Math.Between(-200, 200);
        let y = startY + Phaser.Math.Between(-200, 200);

        let asteroidSprite = Phaser.Math.RND.pick(['asteroid1', 'asteroid2']);
        let asteroid = asteroids.get(x, y, asteroidSprite);

        if (asteroid) {
            asteroid.setActive(true);
            asteroid.setVisible(true);

            // Set the scale/size of asteroid to 1x
            asteroid.setScale(1);

            // Setting the velocity to make the asteroid move towards the bottom left of the screen
            asteroid.body.setVelocity(velocityX, velocityY);

            // Store the initial position and velocity using setData
            asteroid.setData('velocity', {x: velocityX, y: velocityY});
            asteroid.setData('initialPosition', {x: x, y: y});

            // Set the maximum hit count for the asteroid
            asteroid.maxHitCount = 1;
            asteroid.hitCount = 0;

            // Add a slight rotation to the asteroid
            if (Phaser.Math.Between(0, 1)) {
                asteroid.body.setAngularVelocity(Phaser.Math.Between(-180, 180));
            }
        }
    }
}

function asteroidHitAsteroid(asteroid1, asteroid2) {
    // Compare the scales of the two asteroids
    if (asteroid1.scaleX === asteroid2.scaleX) {
        // If scales are the same, both asteroids slow down in velocity.
        
        let dampingFactor = 0.9; // You can adjust this value
        
        // Adjust the velocities of both asteroids
        asteroid1.body.setVelocity(asteroid1.body.velocity.x * dampingFactor, asteroid1.body.velocity.y * dampingFactor);
        asteroid2.body.setVelocity(asteroid2.body.velocity.x * dampingFactor, asteroid2.body.velocity.y * dampingFactor);
    } else {
        // If scales are different, the smaller asteroid explodes.
        let smallerAsteroid, largerAsteroid;
        
        if (asteroid1.scaleX < asteroid2.scaleX) {
            smallerAsteroid = asteroid1;
            largerAsteroid = asteroid2;
        } else {
            smallerAsteroid = asteroid2;
            largerAsteroid = asteroid1;
        }
        
        // Handle the explosion of the smaller asteroid
        smallerAsteroid.setActive(false);
        smallerAsteroid.setVisible(false);
        
        let explosion = this.add.sprite(smallerAsteroid.x, smallerAsteroid.y, 'explosion1');
        explosion.setScale(smallerAsteroid.scaleX, smallerAsteroid.scaleY);
        explosion.play('explode');
    }
}

function playerShipHitAsteroid(player, asteroid) {
    // Check if player is invincible
    if (player.getData('isInvincible')) {
        return;
    }

    // Make the player invincible
    player.setData('isInvincible', true);
    
    // Setup blinking effect
    let blinkCount = 0;
    let blinkEvent = this.time.addEvent({
        delay: 300, // 5 blinks within 3 seconds, so 3000ms/10 = 300ms for each on/off
        callback: function () {
            player.setVisible(!player.visible);
            blinkCount++;
            if (blinkCount >= 10) { // 5 on/off blinks
                blinkEvent.remove(); // Stop the blinking
                player.setVisible(true); // Ensure player is visible at the end
            }
        },
        callbackScope: this,
        repeat: 9 // since it runs once by default, we repeat 9 more times for a total of 10 toggles
    });

    // Set a timer to remove invincibility after 3 seconds
    this.time.addEvent({
        delay: 3000, // 3 seconds
        callback: function () {
            player.setData('isInvincible', false);
        },
        callbackScope: this
    });

    // Handle the asteroid explosion and player losing a heart
    asteroid.setActive(false);
    asteroid.setVisible(false);
    let explosion = this.add.sprite(asteroid.x, asteroid.y, 'explosion1');
    explosion.setScale(asteroid.scaleX, asteroid.scaleY);
    explosion.play('explode');

    // Update the player's health
    this.playerHealth -= 1;
    this.hearts.getChildren()[this.playerHealth].setVisible(false); // Hide one heart
    
    // Check if player is out of hearts
    if (this.playerHealth === 0) {
        window.alert("GAME OVER! " + "SCORE = " + playerScore);
        playerScore = 0; // Reset the playerScore
        this.scene.restart();
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

    // Increase the player score
    playerScore += 1;
    
    // Update the scoreElement text
    scoreElement.innerText = playerScore;

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