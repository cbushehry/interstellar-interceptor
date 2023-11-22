let playerScore = 0;
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

     let moon = this.add.image(1400, 200, 'moon');
     moon.setScale(0.1234);
     moon.setDepth(-2); // Set depth so it appears behind other objects but in front of the far background
 

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
    this.playerShield.setScale(1.34);
    this.player.health = 3;
    
    this.hearts = this.add.group({
        key: 'heart',
        repeat: this.player.health - 1,
        setXY: { x: 60, y: 20, stepX: 20 }
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
    
        updateHearts.call(this.scene);
    
        if (this.health == 0) {
            window.alert("Game Over!");
            this.scene.scene.restart();
        }
    };

    this.boostIcons = this.add.group({
        key: 'boost',
        repeat: 2,
        setXY: { x: 60, y: this.hearts.getChildren()[0].y + 20, stepX: 20 }
    });

    this.shieldIcon = this.add.image(
        this.boostIcons.getChildren()[0].x - 30,
        this.boostIcons.getChildren()[0].y - 9, 
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
        delay: 3340,
        callback: spawnAsteroids,
        callbackScope: this,
        loop: true
    });

    this.asteroidClusterTimer = this.time.addEvent({
        delay: 12400,
        callback: spawnAsteroidClusters,
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

    this.scoreText = this.add.text(this.scale.width - 16, 16, '0', {
        fontSize: '24px',
        fill: '#FFFF00',
        align: 'right'
    }).setOrigin(1, 0);
    
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

    let PLAYER_ACCEL = 10;

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
    if (!this.shieldIcon.active) {
        // If the shield icon is not active, don't activate the shield
        return;
    }

    this.playerShield.setVisible(true);
    this.player.isShieldActive = true;
    this.shieldIcon.setActive(false).setVisible(false);

    this.time.delayedCall(10000, () => {
        this.playerShield.setVisible(false);
        this.player.isShieldActive = false;
    }, [], this);
}


function shootLaser() {
    let LASER_SPEED = 1100;
    let currentTime = this.time.now;
    if (currentTime - this.lastShotTime < 200) {
        return;
    }

    this.lastShotTime = currentTime;
    let laser = lasers.get(this.player.x, this.player.y, 'laser1');
    if (laser) {
        laser.setActive(true);
        laser.setVisible(true);
        laser.rotation = this.player.rotation;
        laser.setDepth(-1);
        laser.setScale(1);
        this.physics.velocityFromRotation(this.player.rotation, LASER_SPEED, laser.body.velocity);

        this.time.delayedCall(10000, () => {
            laser.setActive(false).setVisible(false);
        }, [], this);
    }
}

function spawnAsteroids() {
    let asteroidSprite = Phaser.Math.RND.pick(['asteroid3', 'asteroid4']);
    let asteroidScale = Phaser.Math.RND.pick([2, 3]);

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

    let asteroid = asteroids.get(x, y, asteroidSprite);
    if (asteroid) {
        asteroid.setActive(true).setVisible(true).setScale(asteroidScale);

        let asteroidSpeed = 80; 
        let angle = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
        let velocityX = Math.cos(angle) * asteroidSpeed;
        let velocityY = Math.sin(angle) * asteroidSpeed;

        asteroid.body.setVelocity(velocityX, velocityY);
        asteroid.setData('velocity', {x: velocityX, y: velocityY});
        asteroid.setData('initialPosition', {x: x, y: y});
        asteroid.body.setImmovable(true);
        asteroid.hitCount = asteroidScale;
    }
}

function spawnAsteroidClusters() {
    const numberOfAsteroids = Phaser.Math.Between(16, 32);
    const asteroidSprites = ['asteroid1', 'asteroid2'];
    const clusterSpeed = 40;
    const clusterRadius = 100;
    const startX = this.sys.game.config.width + 50 + clusterRadius;

    for (let i = 0; i < numberOfAsteroids; i++) {
        let angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        let radius = Phaser.Math.FloatBetween(0, clusterRadius);
        let x = startX + radius * Math.cos(angle);
        let y = this.sys.game.config.height / 2 + radius * Math.sin(angle);

        let asteroidSprite = Phaser.Math.RND.pick(asteroidSprites);
        let asteroid = asteroids.get(x, y, asteroidSprite);
        if (asteroid) {
            asteroid.setActive(true).setVisible(true).setScale(1);
            asteroid.body.setVelocity(-clusterSpeed, 0);
            asteroid.body.setImmovable(true);
            asteroid.rotation = Phaser.Math.FloatBetween(0, Math.PI * 2);
            asteroid.hitCount = 1;
        }
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
    laser.setActive(false).setVisible(false);
    asteroid.hitCount -= 1;

    if (asteroid.hitCount <= 0) {
        playerScore += asteroid.scaleX;
        this.scoreText.setText(playerScore);

        explodeAsteroid.call(this, asteroid);
    } else {
        asteroid.setAlpha(0.5);
        this.time.delayedCall(100, () => {
            asteroid.setAlpha(1);
        }, [], this);
    }
}

function explodeAsteroid(asteroid) {
    let explosion = this.add.sprite(asteroid.x, asteroid.y, 'explosion1').play('explode');
    explosion.setScale(asteroid.scaleX);
    explosion.on('animationcomplete', () => explosion.destroy());
    asteroid.destroy();
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