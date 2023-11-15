let playerScore = 0;
const PLAYER_ACCEL = 10;
const LASER_SPEED = 400;
const KEY_CONFIG = {
    ACCELERATE: 'W',
    DECELERATE: 'S',
    STRAFE_LEFT: 'A',
    STRAFE_RIGHT: 'D',
    SHIELD: 'SPACE',
    BOOST: 'SHIFT'
};

// function preload() {} is on another file but still linked through index.html

function create() {
    background1 = this.add.tileSprite(0, 0, window.innerWidth, window.innerHeight, 'background1').setOrigin(0, 0).setDepth(-3);
    background2 = this.add.tileSprite(0, 0, window.innerWidth, window.innerHeight, 'background2').setOrigin(0, 0).setDepth(-3);

    createAnimations.call(this);

    controls = {
        ACCELERATE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.ACCELERATE]),
        DECELERATE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.DECELERATE]),
        STRAFE_LEFT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.STRAFE_LEFT]),
        STRAFE_RIGHT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.STRAFE_RIGHT]),
        SHIELD: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.SHIELD]),
        BOOST: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.BOOST])
    };

    //Initalize playerShip asset
    this.player = this.physics.add.sprite(this.scale.width / 2, this.scale.height / 2, 'playerShip1');
    this.maxSpeed = 100;
    this.boostedSpeed = this.maxSpeed * 2;
    this.isBoostActive = false;
    this.boostEndTime = 0;
    this.deceleratingFromBoost = false;
    this.player.play('flight');
    this.input.on('pointerdown', shootLaser, this);
    this.isShooting = false;
    this.lastShotTime = 0;
    this.playerShield = this.add.sprite(this.player.x, this.player.y, 'shield');
    this.playerShield.setVisible(false);
    this.playerShield.setScale(1.25);
    this.player.health = 3;
    
    this.hearts = this.add.group({
        key: 'heart',
        repeat: this.player.health - 1,
        setXY: { x: 20, y: 20, stepX: 20 }
    });

    // playerShip gains health          this.player.gainHealth(1);
    this.player.gainHealth = function(amount) {
        this.health += amount;
        updateHearts.call(this.scene);  // Update heart display
    };

    // playerShip takes damage          this.player.takeDamage(1);
    this.player.takeDamage = function(amount) {
        this.health -= amount;
        if (this.health < 0) {
            this.health = 0;
        }
    
        updateHearts.call(this.scene);  // Update heart display
    
        if (this.health == 0) {
            // Game over logic
            window.alert("Game Over!");
    
            // Restart the game
            this.scene.scene.restart();
        }
    };

    this.boostIcons = this.add.group({
        key: 'boost',
        repeat: 2,
        setXY: { x: 20, y: this.hearts.getChildren()[0].y + 20, stepX: 20 }
    });

    this.shieldIcon = this.add.image(
        this.boostIcons.getChildren()[0].x + 20,
        this.boostIcons.getChildren()[0].y + 30, 
        'shieldIcon'
    );

    this.input.on('pointerdown', function () {
        this.isShooting = true;
    }, this);

    this.input.on('pointerup', function () {
        this.isShooting = false;
    }, this);

    lasers = this.physics.add.group({
        classType: Phaser.GameObjects.Sprite,
        maxSize: 10000,
        runChildUpdate: true
    });

    asteroids = this.physics.add.group({
        classType: Phaser.Physics.Arcade.Image,
        maxSize: 512, 
    });

    this.asteroidTimer = this.time.addEvent({
        delay: 5000,
        callback: spawnAsteroids,
        callbackScope: this,
        loop: true
    });

     this.timerText = this.add.text(this.sys.game.config.width / 2, 10, '0:00', {
        fontSize: '24px',
        fill: '#FFF',
        align: 'center'
    });

    this.timer = 0;
    this.updateTimerEvent = this.time.addEvent({
        delay: 1000,
        callback: updateTimer,
        callbackScope: this,
        loop: true
    });
    
    this.physics.add.collider(this.player, asteroids, playerAsteroidCollision, null, this);
    this.physics.add.collider(lasers, asteroids, laserAsteroidCollision, null, this);
}

function createAnimations() {
    this.anims.create({
        key: 'flight',
        frames: [
            { key: 'playerShip1' },
            { key: 'playerShip2' }
        ],
        frameRate: 4,
        repeat: -1
    });
    this.anims.create({
        key: 'boostedFlight',
        frames: [
            { key: 'playerShip1' },
            { key: 'playerShip2' }
        ],
        frameRate: 8,
        repeat: -1
    });
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
}

function update() {
    var pointer = this.input.activePointer;
    var angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y);
    this.player.rotation = Phaser.Math.Angle.RotateTo(this.player.rotation, angle, 0.02);

    if (controls.ACCELERATE.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x + Math.cos(this.player.rotation) * PLAYER_ACCEL * 0.1);
        this.player.setVelocityY(this.player.body.velocity.y + Math.sin(this.player.rotation) * PLAYER_ACCEL * 0.1);
    } else if (controls.DECELERATE.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x * 0.97);
        this.player.setVelocityY(this.player.body.velocity.y * 0.97);
    } else {
        this.player.setVelocityX(this.player.body.velocity.x * 0.994);
        this.player.setVelocityY(this.player.body.velocity.y * 0.994);
    }

    if (controls.STRAFE_LEFT.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x + Math.sin(this.player.rotation) * PLAYER_ACCEL * 0.123456789);
        this.player.setVelocityY(this.player.body.velocity.y - Math.cos(this.player.rotation) * PLAYER_ACCEL * 0.123456789);
    } else if (controls.STRAFE_RIGHT.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x - Math.sin(this.player.rotation) * PLAYER_ACCEL * 0.123456789);
        this.player.setVelocityY(this.player.body.velocity.y + Math.cos(this.player.rotation) * PLAYER_ACCEL * 0.123456789);
    }

    let speed = Math.sqrt(this.player.body.velocity.x ** 2 + this.player.body.velocity.y ** 2);
    if (speed > this.maxSpeed) {
        this.player.body.velocity.normalize().scale(this.maxSpeed);
    }

    if (Phaser.Input.Keyboard.JustDown(controls.BOOST) && !this.isBoostActive) {
        let hasBoost = this.boostIcons.getChildren().some(icon => icon.active);
        if (!hasBoost) {
            return;
        }

        this.isBoostActive = true;
        this.maxSpeed = this.boostedSpeed;
        this.player.play('boostedFlight');
        this.boostEndTime = this.time.now + 10000;

        let boostIcons = this.boostIcons.getChildren();
        for (let i = boostIcons.length - 1; i >= 0; i--) {
            if (boostIcons[i].active) {
                boostIcons[i].setActive(false).setVisible(false);
                break;
            }
        }
    }

    if (this.isBoostActive && this.time.now > this.boostEndTime) {
        this.isBoostActive = false;
        this.deceleratingFromBoost = true;
        this.player.play('flight');
    }

    if (this.deceleratingFromBoost) {
        let decelerationFactor = 0.997;
        this.maxSpeed *= decelerationFactor;
        if (this.maxSpeed <= 100) {
            this.maxSpeed = 100;
            this.deceleratingFromBoost = false;
        }
    }

    if (this.playerShield.visible) {
        this.playerShield.x = this.player.x;
        this.playerShield.y = this.player.y;
    }

    if (Phaser.Input.Keyboard.JustDown(controls.SHIELD) && !this.playerShield.visible) {
        activateShield.call(this);
    }

    if (this.isShooting) {
        shootLaser.call(this);
    }
}

function updateHearts() {
    this.hearts.children.each((heart, index) => {
        heart.setVisible(index < this.player.health);
    });
}

function activateShield() {
    this.playerShield.setVisible(true);
    this.player.isShieldActive = true;  // Flag to indicate shield is active
    this.shieldIcon.setActive(false).setVisible(false);

    this.time.delayedCall(10000, () => {
        this.playerShield.setVisible(false);
        this.player.isShieldActive = false;  // Turn off shield after duration
        this.shieldIcon.setActive(true).setVisible(true);
    }, [], this);
}

function shootLaser() {
    let currentTime = this.time.now;
    if (currentTime - this.lastShotTime < 400) {
        return;
    }

    this.lastShotTime = currentTime;
    let laser = lasers.get(this.player.x, this.player.y, 'laser4');
    if (laser) {
        laser.setActive(true);
        laser.setVisible(true);
        laser.setDepth(-1); // Setting laser depth to below the player
        laser.setScale(1);
        this.physics.velocityFromRotation(this.player.rotation, LASER_SPEED, laser.body.velocity);

        // Despawn laser after 10 seconds
        this.time.delayedCall(10000, () => {
            laser.setActive(false).setVisible(false);
        }, [], this);
    }
}

function spawnAsteroids() {
    let asteroidSprite = Phaser.Math.RND.pick(['asteroid3', 'asteroid4']);
    let asteroidScale = Phaser.Math.RND.pick([2, 3]);
    let asteroidHitCount = asteroidScale;

    let perimeterWidth = this.sys.game.config.width + 100;
    let perimeterHeight = this.sys.game.config.height + 100;

    let side = Phaser.Math.Between(0, 3);
    let x, y;

    switch (side) {
        case 0: // Top
            x = Phaser.Math.Between(0, perimeterWidth);
            y = -50;
            break;
        case 1: // Bottom
            x = Phaser.Math.Between(0, perimeterWidth);
            y = this.sys.game.config.height + 50;
            break;
        case 2: // Left
            x = -50;
            y = Phaser.Math.Between(0, perimeterHeight);
            break;
        case 3: // Right
            x = this.sys.game.config.width + 50;
            y = Phaser.Math.Between(0, perimeterHeight);
            break;
    }

    // Spawn and set up the asteroid
    let asteroid = asteroids.get(x, y, asteroidSprite);
    if (asteroid) {
        asteroid.setActive(true).setVisible(true).setScale(asteroidScale);

        let asteroidSpeed = 50; 
        let angle = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
        let velocityX = Math.cos(angle) * asteroidSpeed;
        let velocityY = Math.sin(angle) * asteroidSpeed;

        asteroid.body.setVelocity(velocityX, velocityY);
        asteroid.setData('velocity', {x: velocityX, y: velocityY});
        asteroid.setData('initialPosition', {x: x, y: y});
        asteroidHitCount = asteroidScale;
    }
}

function playerAsteroidCollision(player, asteroid) {
    if (player.isShieldActive) {
        explodeAsteroid.call(this, asteroid);
        return;
    }

    if (player.isInvincible) return;

    player.takeDamage(1);
    player.isInvincible = true;

    // Blinking effect
    let blinkCount = 0;
    let blinkInterval = setInterval(() => {
        player.setVisible(!player.visible);
        blinkCount++;

        if (blinkCount >= 6) {
            clearInterval(blinkInterval);
            player.setVisible(true);
            player.isInvincible = false;
        }
    }, 500);

    explodeAsteroid.call(this, asteroid);
}

function laserAsteroidCollision(laser, asteroid) {
    // Remove the laser
    laser.setActive(false).setVisible(false);

    // Decrease asteroid hit count
    asteroid.hitCount -= 1;

    // Reduce asteroid's speed by 20% without altering the direction
    let velocity = asteroid.body.velocity;
    asteroid.body.setVelocity(velocity.x * 0.8, velocity.y * 0.8);

    // Check if asteroid is destroyed
    if (asteroid.hitCount <= 0) {
        // Update player score based on asteroid scale
        playerScore += asteroidScale; // Assuming scaleX represents the size of the asteroid
        explodeAsteroid.call(this, asteroid);
    }
}

function explodeAsteroid(asteroid) {
    // Play the explosion animation at the asteroid's position
    let explosion = this.add.sprite(asteroid.x, asteroid.y, 'explosion1').play('explode');
    explosion.on('animationcomplete', () => explosion.destroy());  // Destroy the explosion sprite after animation completes
    asteroid.destroy();  // Remove the asteroid
}

function updateTimer() {
    this.timer += 1;
    const minutes = Math.floor(this.timer / 60);
    const seconds = this.timer % 60;
    this.timerText.setText(minutes + ':' + (seconds < 10 ? '0' + seconds : seconds));
}

let gameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, 
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});

const game = new Phaser.Game(gameConfig);