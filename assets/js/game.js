const PLAYER_SCALE = 1;
const PLAYER_ACCEL = 10;
const LASER_SPEED = 800;
const scoreElement = document.getElementById('score');
let playerScore = 0;

const KEY_CONFIG = {
    ACCELERATE: 'W',
    DECELERATE: 'S',
    STRAFE_LEFT: 'A',
    STRAFE_RIGHT: 'D',
    SHIELD: 'E'
};

function create() {
    this.bg = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'background').setOrigin(0);
    this.bgStars = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'background-stars').setOrigin(0);
    this.earth = this.add.image(this.scale.width / 5, this.scale.height / 4, 'earth');
    this.earth.setScale(7);

    this.tweens.add({
        targets: this.earth,
        scaleX: 2,
        scaleY: 2,
        duration: 300000, // 5 minutes in milliseconds
        ease: 'Linear'
    });

    controls = {
        ACCELERATE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.ACCELERATE]),
        DECELERATE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.DECELERATE]),
        STRAFE_LEFT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.STRAFE_LEFT]),
        STRAFE_RIGHT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.STRAFE_RIGHT]),
        SHIELD: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[KEY_CONFIG.SHIELD])
    };

    this.player = this.physics.add.sprite(this.scale.width / 2, this.scale.height / 2, 'playerShip1');
    this.player.setScale(PLAYER_SCALE);
    this.input.on('pointerdown', shootLaser, this);
    this.lastShotTime = 0;
    this.isShooting = false;
    this.player.setData('isInvincible', false);

    this.player.setData('shieldActive', false);
    this.player.setData('shieldTimer', null);
    this.shieldSprite = this.add.image(this.player.x, this.player.y, 'shield').setVisible(false);

    this.anims.create({
        key: 'fly',
        frames: [
            { key: 'playerShip1' },
            { key: 'playerShip2' }
        ],
        frameRate: 8, 
        repeat: -1
    });

    this.player.anims.play('fly');

    this.input.on('pointerdown', function () {
        this.isShooting = true;
    }, this);

    this.input.on('pointerup', function () {
        this.isShooting = false;
    }, this);

    lasers = this.physics.add.group({
        classType: Phaser.Physics.Arcade.Image, 
        maxSize: 1000, 
    });

    asteroids = this.physics.add.group({
        classType: Phaser.Physics.Arcade.Image,
        maxSize: 512, 
    });

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
        delay: 3000,
        callback: spawnAsteroids,
        callbackScope: this,
        loop: true
    });

    this.time.addEvent({
        delay: 33000,
        callback: spawnAsteroidClusters,
        callbackScope: this,
        loop: true
    });

    this.playerHealth = 3;
    this.hearts = this.add.group({
        key: 'heart',
        repeat: this.playerHealth - 1,
        setXY: { x: 20, y: 20, stepX: 36 }
    });

    let scaleValue = 2; 
    this.hearts.getChildren().forEach(heart => {
        heart.setScale(scaleValue);
    });

    // Assuming you've added the hearts code from the snippet you provided
    let lastHeart = this.hearts.getChildren()[this.hearts.getChildren().length - 1];
    this.shieldIcon = this.add.image(lastHeart.x + 36, 20, 'shield').setScale(1);

    this.timer = 0;
    this.timerText = document.getElementById('timer');
    this.updateTimerEvent = this.time.addEvent({
        delay: 1000,
        callback: updateTimer,
        callbackScope: this,
        loop: true
    });
}

function update() {
    var pointer = this.input.activePointer;
    var angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y);
    this.player.rotation = Phaser.Math.Angle.RotateTo(this.player.rotation, angle, 0.04);

        if (this.isShooting) {
            shootLaser.call(this);
        }

    if (controls.ACCELERATE.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x + Math.cos(this.player.rotation) * PLAYER_ACCEL * 0.1);
        this.player.setVelocityY(this.player.body.velocity.y + Math.sin(this.player.rotation) * PLAYER_ACCEL * 0.1);
    } else if (controls.DECELERATE.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x * 0.99);
        this.player.setVelocityY(this.player.body.velocity.y * 0.99);
    } else {
        this.player.setVelocityX(this.player.body.velocity.x * 0.99);
        this.player.setVelocityY(this.player.body.velocity.y * 0.99);
    }

    if (controls.STRAFE_LEFT.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x + Math.sin(this.player.rotation) * PLAYER_ACCEL * 0.1);
        this.player.setVelocityY(this.player.body.velocity.y - Math.cos(this.player.rotation) * PLAYER_ACCEL * 0.1);
    }
    else if (controls.STRAFE_RIGHT.isDown) {
        this.player.setVelocityX(this.player.body.velocity.x - Math.sin(this.player.rotation) * PLAYER_ACCEL * 0.1);
        this.player.setVelocityY(this.player.body.velocity.y + Math.cos(this.player.rotation) * PLAYER_ACCEL * 0.1);
    }

    let speed = Math.sqrt(this.player.body.velocity.x ** 2 + this.player.body.velocity.y ** 2);
    let maxSpeed = 100;
    if (speed > maxSpeed) {
        this.player.body.velocity.normalize().scale(maxSpeed);
    }

    if (controls.SHIELD.isDown && !this.player.getData('shieldActive')) {
        activateShield.call(this);
    }

    if (this.player.getData('shieldActive')) {
        this.shieldSprite.setPosition(this.player.x, this.player.y);
    }

    lasers.getChildren().forEach(laser => {
        if (laser.x < 0 || laser.x > game.scale.width || laser.y < 0 || laser.y > game.scale.height) {
            laser.setActive(false);
            laser.setVisible(false);
        }
    });

    asteroids.getChildren().forEach(asteroid => {
        if (asteroid.active) {
            const initialPosition = asteroid.getData('initialPosition');

            const distanceTraveled = Phaser.Math.Distance.Between(initialPosition.x, initialPosition.y, asteroid.x, asteroid.y);

            if (distanceTraveled > 4800) {
                asteroid.setActive(false);
                asteroid.setVisible(false);
            }
        }
    });
}

function updateTimer() {
    this.timer += 1;
    const minutes = Math.floor(this.timer / 60);
    const seconds = this.timer % 60;
    this.timerText.textContent = minutes + ':' + (seconds < 10 ? '0' + seconds : seconds);
}

function shootLaser() {
    let currentTime = this.time.now;

    if (currentTime - this.lastShotTime < 500) {
        return;
    }

    this.lastShotTime = currentTime;

    let laser = lasers.get(this.player.x, this.player.y, 'laser4');
    if (laser) {
        laser.setActive(true);
        laser.setVisible(true);
        laser.setScale(1);
        this.physics.velocityFromRotation(this.player.rotation, LASER_SPEED, laser.body.velocity);
    }
}

function activateShield() {
    if (this.player.getData('shieldTimer')) {
        this.player.getData('shieldTimer').remove(false);
    }

    this.shieldSprite.setVisible(true).setPosition(this.player.x, this.player.y);
    this.player.setData('shieldActive', true);
    
    this.shieldIcon.setVisible(false);
    this.time.addEvent({
        delay: 10000,
        callback: function() {
            this.shieldIcon.setVisible(true);
        },
        callbackScope: this,
        loop: false
    });

    this.player.setData('shieldTimer', this.time.addEvent({
        delay: 4000,
        callback: deactivateShield,
        callbackScope: this,
        loop: false
    }));
}

function deactivateShield() {
    this.player.setData('shieldActive', false);
    this.shieldSprite.setVisible(false);
}

function spawnAsteroids() {
    let asteroidSprite = Phaser.Math.RND.pick(['asteroid1', 'asteroid2']);
    let radius = 2000;
    let randomAngle = Phaser.Math.FloatBetween(0, 2 * Math.PI);
    let x = this.player.x + Math.cos(randomAngle) * radius;
    let y = this.player.y + Math.sin(randomAngle) * radius;
    let asteroid = asteroids.get(x, y, asteroidSprite);

    if (asteroid) {
        asteroid.setActive(true);
        asteroid.setVisible(true);
        let scale = Phaser.Math.Between(2, 4);
        asteroid.setScale(scale);
        let speedFactor = Phaser.Math.Linear(0.12, 0.06, (scale - 2) / (4 - 2));
        let velocityX = (this.player.x - x) * speedFactor;
        let velocityY = (this.player.y - y) * speedFactor;
        asteroid.body.setVelocity(velocityX, velocityY);
        asteroid.setData('velocity', {x: velocityX, y: velocityY});
        asteroid.setData('initialPosition', {x: x, y: y});

        asteroid.maxHitCount = scale <= 2 ? 2 : 3;
        asteroid.hitCount = 0;

        if (Phaser.Math.Between(0, 1)) {
            asteroid.body.setAngularVelocity(Phaser.Math.Between(-120, 120));
        }
    }
}

function spawnAsteroidClusters() {
    let clusterSize = Phaser.Math.Between(24, 32);

    let startX = this.game.config.width + 100;
    let startY = -50;

    let velocityX = -Phaser.Math.Between(100, 120);
    let velocityY = Phaser.Math.Between(60, 70);

    let asteroidsInCluster = [];

    for (let i = 0; i < clusterSize; i++) {
        let x = startX + Phaser.Math.Between(-100, 100);
        let y = startY + Phaser.Math.Between(-100, 100);

        let asteroidSprite = Phaser.Math.RND.pick(['asteroid1', 'asteroid2']);
        let asteroid = asteroids.get(x, y, asteroidSprite);

        if (asteroid) {
            asteroid.setActive(true);
            asteroid.setVisible(true);

            asteroid.setScale(1);

            asteroid.body.setVelocity(velocityX, velocityY);

            asteroid.setData('velocity', {x: velocityX, y: velocityY});
            asteroid.setData('initialPosition', {x: x, y: y});

            asteroid.maxHitCount = 1;
            asteroid.hitCount = 0;

            if (Phaser.Math.Between(0, 1)) {
                asteroid.body.setAngularVelocity(Phaser.Math.Between(-180, 180));
            }

            asteroidsInCluster.push(asteroid);
        }
    }

    this.time.delayedCall(30000, function() {
        asteroidsInCluster.forEach(asteroid => {
            if (asteroid.active) {
                asteroid.setActive(false);
                asteroid.setVisible(false);
            }
        });
    });
}

function asteroidHitAsteroid(asteroid1, asteroid2) {
    if (asteroid1.scaleX === asteroid2.scaleX) {
        
        let dampingFactor = 0.963;

        asteroid1.body.setVelocity(asteroid1.body.velocity.x * dampingFactor, asteroid1.body.velocity.y * dampingFactor);
        asteroid2.body.setVelocity(asteroid2.body.velocity.x * dampingFactor, asteroid2.body.velocity.y * dampingFactor);
    } else {
        let smallerAsteroid, largerAsteroid;
        
        if (asteroid1.scaleX < asteroid2.scaleX) {
            smallerAsteroid = asteroid1;
            largerAsteroid = asteroid2;
        } else {
            smallerAsteroid = asteroid2;
            largerAsteroid = asteroid1;
        }

        smallerAsteroid.setActive(false);
        smallerAsteroid.setVisible(false);
        
        let explosion = this.add.sprite(smallerAsteroid.x, smallerAsteroid.y, 'explosion1');
        explosion.setScale(smallerAsteroid.scaleX, smallerAsteroid.scaleY);
        explosion.play('explode');
    }
}

function playerShipHitAsteroid(player, asteroid) {
    if (player.getData('isInvincible')) {
        return;
    }

    if (player.getData('shieldActive')) {
        asteroid.setVelocity(
            asteroid.body.velocity.x * -1.5,
            asteroid.body.velocity.y * -1.5
        );
    } else {

        player.setData('isInvincible', true);
        
        let blinkCount = 0;
        let blinkEvent = this.time.addEvent({
            delay: 300,
            callback: function () {
                player.setVisible(!player.visible);
                blinkCount++;
                if (blinkCount >= 10) { 
                    blinkEvent.remove(); 
                    player.setVisible(true);
                }
            },
            callbackScope: this,
            repeat: 9
        });

        this.time.addEvent({
            delay: 3000,
            callback: function () {
                player.setData('isInvincible', false);
            },
            callbackScope: this
        });

        asteroid.setActive(false);
        asteroid.setVisible(false);
        let explosion = this.add.sprite(asteroid.x, asteroid.y, 'explosion1');
        explosion.setScale(asteroid.scaleX, asteroid.scaleY);
        explosion.play('explode');

        this.playerHealth -= 1;
        this.hearts.getChildren()[this.playerHealth].setVisible(false);

        if (this.playerHealth === 0) {
            window.alert("GAME OVER! " + "SCORE = " + playerScore);
            playerScore = 0;
            resetTimer.call(this);
            this.scene.restart();
        }
    }  
}

function resetTimer() {
    this.timer = 0;
    this.timerText.textContent = "0:00";
}

function onLaserHitAsteroid(laser, asteroid) {
    laser.setActive(false);
    laser.setVisible(false);

    laser.x = -10;
    laser.y = -10;

    asteroid.hitCount = (asteroid.hitCount || 0) + 1;

    if (asteroid.hitCount < asteroid.maxHitCount) {
        let originalVelocity = asteroid.getData('velocity');
        asteroid.body.setVelocity(originalVelocity.x, originalVelocity.y);
        return;
    }

    asteroid.setActive(false);
    asteroid.setVisible(false);
    playerScore += asteroid.maxHitCount;
    scoreElement.innerText = playerScore;
    let explosion = this.add.sprite(asteroid.x, asteroid.y, 'explosion1');
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
            gravity: { y: 0 },
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