const canvas = document.getElementById('breakout');
const ctx = canvas.getContext('2d');
document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);
document.addEventListener("mousemove", mouseMoveHandler);

// document.addEventListener("touchstart", touchHandler);
// document.addEventListener("touchend", function(e) {
//     e.preventDefault();
//     document.removeEventListener("touchmove", function(e) {
//         e.preventDefault();
//     }); 
// });

let game = {    
    requestId: null,
    timeoutId: null,
    leftKey: false,
    rightKey: false,
    on: false,
    music: true,
    sfx: true
}
let paddle = {
    height: 20,
    width: 100,
    get y() { return canvas.height - this.height; }
}
let ball = {
    radius: 10
};
let brick = {
    rows: 1,
    cols: 4,
    // rows: 4,
    // cols: 8,
    get width() { return canvas.width / this.cols; },
    height: 160
    // height: 60
}
let images = {
    background: new Image(),
    ball: new Image(),
    paddle: new Image(),
    bricks: new Image()
}

// function onImageLoad(e) {
function onImageLoad() {

    console.log("onImageLoad() körs")
    resetGame();
    initBricks();
    resetPaddle();
    paint();
    ctx.font = '50px ArcadeClassic';
    ctx.fillStyle = 'lime';
    // ctx.fillText('Tryck Starta', canvas.width / 2 - 120, canvas.height / 2);

};
// images.background.addEventListener('load', onImageLoad);
images.background.onload = function(){
    onImageLoad();
};

images.background.src = './images/bg-space.webp';
images.ball.src = './images/ball.webp';
images.paddle.src = './images/paddle.webp';
images.bricks.src = './images/bottle.png';  //bricks image

const sounds = {
    ballLost: new Audio('./sounds/ball-lost.mp3'),
    breakout: new Audio('./sounds/breakout.mp3'),
    brick: new Audio('./sounds/brick.mp3'),
    gameOver: new Audio('./sounds/game-over.mp3'),
    levelCompleted: new Audio('./sounds/level-completed.mp3'),
    music: new Audio('./sounds/music.mp3'),
    paddle: new Audio('./sounds/paddle.mp3')
}

let brickField = [];

function play() {   
    cancelAnimationFrame(game.requestId);
    clearTimeout(game.timeoutId);
    game.on = true;

    resetGame();
    resetBall();
    resetPaddle();
    initBricks();

    game.sfx && sounds.breakout.play();
    // Start music after starting sound ends.
    setTimeout(() => game.music && sounds.music.play(), 2000);

    animate();
}

function resetGame() {
    game.speed = 7;
    game.score = 0;
    game.level = 1;
    game.lives = 3;
    game.time = { start: performance.now(), elapsed: 0, refreshRate: 16  };
}

function initSounds() {
    sounds.music.loop = true;
    for (const [key] of Object.entries(sounds)) {
        sounds[key].volume = 0.5;
    }
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height - paddle.height - 2 * ball.radius;
    ball.dx = game.speed * (Math.random() * 2 - 1);  // Random trajectory
    ball.dy = -game.speed; // Up
}

function resetPaddle() {
    paddle.x = (canvas.width - paddle.width) / 2;
    paddle.dx = game.speed + 7;
}

function initBricks() {
    console.log("initBricks() körs");
    brickField = [];
    const topMargin = 30;
    // const colors = ['red', 'orange', 'yellow', 'blue', 'green'];

    for(let row = 0; row < brick.rows; row++) {
        for(let col = 0; col < brick.cols; col++) {
            brickField.push({
                x: col * brick.width,
                y: row * brick.height + topMargin,
                height: brick.height,
                width: brick.width,
                // color: colors[row],
                // src: './images/bottle.png',
                isShown: true,
                points: (5 - row) * 2,
                hitsLeft: row === 0 ? 2 : 1
            });
        }
    }    
    console.log("brickField initial (fr initBricks() ):", brickField);
}

function animate(now = 0) { 
    game.time.elapsed = now - game.time.start;
    if (game.time.elapsed > game.time.refreshRate) {
        game.time.start = now;
        paint(); 
        update();
        detectCollision();
        detectBrickCollision();
        if (isLevelCompleted() || isGameOver()) return;
    }    

    game.requestId = requestAnimationFrame(animate);
}

function paint() {
    // console.log("paint() körs, images.bricks.src:", images.bricks.src ); 
    ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(images.ball, ball.x, ball.y, 2 * ball.radius, 2 * ball.radius);
    ctx.drawImage(images.paddle, paddle.x, paddle.y, paddle.width, paddle.height);
    drawBricks();
    drawScore();
    drawLives();
}

function update() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (game.rightKey) {
        paddle.x += paddle.dx;
        if (paddle.x + paddle.width > canvas.width){
            paddle.x = canvas.width - paddle.width;
        }
    }
    if (game.leftKey) {
        paddle.x -= paddle.dx;
        if (paddle.x < 0){
            paddle.x = 0;
        }
    }
};

function drawBricks() {
    console.log("drawBricks() körs");
  
    function createImage(brickX, brickY, brickWidt, brickHeight) {
        ctx.drawImage(images.bricks, brickX, brickY, brickWidt, brickHeight);
        // console.log("createImage() körs"); //TODO fix error runs several times when onload
    };
    brickField.forEach( function(brick) {
        // console.log("brickField.forEach körs"); //TODO fix error runs several times when onload
        // console.log("fr brickField forEach: brick.x:", brick.x, "brick.y:", brick.y, "images.bricks:", images.bricks, "brick.width:", brick.width, "brick.height:", brick.height);
        let brickX = brick.x;
        let brickY = brick.y;
        let brickWidt = brick.width;
        let brickHeight = brick.height;

        if (brick.isShown !== false) {
            createImage(brickX, brickY, brickWidt, brickHeight);
        } 
    } );
    // const isBricksExist = brickField.some( function(br) {
    //     // console.log("br.isShown:", br.isShown);
    //     return br.isShown === true
    // });
    // console.log("isBricksExist false=Level completed:", isBricksExist, "brickField:", brickField);
    // if (isBricksExist == false) {
    //     alert('nästa nivå')
    // }
}

function drawScore() {
    ctx.font = '24px ArcadeClassic';
    ctx. fillStyle = 'white';
    const { level, score } = game;
    ctx.fillText(`Level: ${level}`, 5, 23);
    ctx.fillText(`Score: ${score}`, canvas.width / 2 - 50, 23);
}

function drawLives() {
    if (game.lives > 2) { ctx.drawImage(images.paddle, canvas.width - 150, 9, 40, 13); }
    if (game.lives > 1) { ctx.drawImage(images.paddle, canvas.width - 100, 9, 40, 13); }
    if (game.lives > 0) { ctx.drawImage(images.paddle, canvas.width - 50, 9, 40, 13); }
}

function detectCollision() {
    const hitTop = () => ball.y < 0;
    const hitLeftWall = () => ball.x < 0;
    const hitRightWall = () => ball.x + ball.radius * 2 > canvas.width;
    const hitPaddle = () => 
        ball.y + 2 * ball.radius > canvas.height - paddle.height &&
        ball.y + ball.radius < canvas.height && 
        ball.x + ball.radius > paddle.x &&
        ball.x + ball.radius < paddle.x + paddle.width;

    if (hitLeftWall()) {
        ball.dx = -ball.dx;
        ball.x = 0;
    }        
    if (hitRightWall()) {
        ball.dx = -ball.dx;
        ball.x = canvas.width - 2 * ball.radius;
    }
    if (hitTop()) {
        ball.dy = -ball.dy;
        ball.y = 0;
    }
    if (hitPaddle()) {
        ball.dy = -ball.dy;
        ball.y = canvas.height - paddle.height - 2 * ball.radius;
        game.sfx && sounds.paddle.play();
        // TODO change this logic to angles with sin/cos
        // Change x depending on where on the paddle the ball bounces.
        // Bouncing ball more on one side draws ball a little to that side.
        const drawingConst = 5
        const paddleMiddle = 2;
        const algo = (((ball.x - paddle.x) / paddle.width) * drawingConst);
        ball.dx = ball.dx + algo - paddleMiddle;
    }
}

function detectBrickCollision() {
    // let directionChanged = false;
    const isBallInsideBrick = (brick) => 
        ball.x + 2 * ball.radius > brick.x &&
        ball.x < brick.x + brick.width && 
        ball.y + 2 * ball.radius > brick.y && 
        ball.y < brick.y + brick.height;
  
    brickField.forEach( function(brick) {
        if (brick.hitsLeft && isBallInsideBrick(brick)) {
            
            sounds.brick.currentTime = 0;
            game.sfx && sounds.brick.play();
            brick.hitsLeft--;
            // if (brick.hitsLeft === 1) {
            //     brick.color = 'darkgray';
            // }
            // if (brick.hitsLeft === 0) {
            //     console.log("TRÄFF");
            //     // console.log("brick.color"); //tom
            //     console.log("images.brick:", images.brick); //tom
            // }
            game.score += brick.points;
    
            // if (!directionChanged) {
                console.log("remove brick:", brick);
                
                //Find index of hit brick
                const index = brickField.findIndex(function(obj) {
                    return (obj.x == brick.x) && (obj.y == brick.y)
                });
                // console.log("indexOf hit brick:", index);

                //set hit brick isShown to false
                brickField[index].isShown = false;
            
                // directionChanged = true;
                detectCollisionDirection(brick);
                
            // } else {
            //     console.log("körs denna för flaskor som ej tas bort?");
            // }
        }
    });

}

function detectCollisionDirection(brick) {
    const hitFromLeft = () => ball.x + 2 * ball.radius - ball.dx <= brick.x;
    const hitFromRight = () => ball.x - ball.dx >= brick.x + brick.width;

    if (hitFromLeft() || hitFromRight()) {
      ball.dx = -ball.dx;
    } else { // Hit from above or below
      ball.dy = -ball.dy;
    }
}

function keyDownHandler(e) {
    if (!game.on && e.key === ' ') {
        play();
    }
    if (game.on && (e.key === 'm' || e.key === 'M')) {
        game.music = !game.music;
        game.music ? sounds.music.play() : sounds.music.pause();
    }
    if (game.on && (e.key === 's' || e.key === 'S')) {
        game.sfx = !game.sfx;
    }
    if (e.key === 'ArrowUp') {
        volumeUp();
    }
    if (e.key === 'ArrowDown') {
        volumeDown();
    }
    if (e.key === 'ArrowRight') {
        game.rightKey = true;
    } else if (e.key === 'ArrowLeft') {
        game.leftKey = true;
    }
}

function keyUpHandler(e) {
    if (e.key === 'ArrowRight') {
        game.rightKey = false;
    } else if (e.key === 'ArrowLeft') {
        game.leftKey = false;
    }
}

function mouseMoveHandler(e) {
    const mouseX = e.clientX - canvas.offsetLeft;    
    const isInsideCourt = () => mouseX > 0 && mouseX < canvas.width;

    if(isInsideCourt()) {
        paddle.x = mouseX - paddle.width / 2;
    }
}

//touch events
function touchHandler(e) {
    console.log("touchHandler körs");

    //Only start game if touch StartBtn
    if (e.target.id === "play-button") {
        play();
    };
    // let isMobile = function detectMob() {
    //     return ( ( window.innerWidth <= 800 ) && ( window.innerHeight <= 600 ) );
    // };
    // console.log("isMobile:", isMobile);


    document.addEventListener("touchmove", function(e) {
        // e.preventDefault(); //creating error: [Intervention] Unable to preventDefault inside passive event listener due to target being treated as passive. See <URL>
        const touchMoveX = e.touches[0].clientX;
        paddle.x = touchMoveX - paddle.width / 2;
    });
};


function isLevelCompleted() {
    const levelComplete = brickField.every(function(b) {
        b.hitsLeft === 0
        // console.log("b.hitsLeft:", b.hitsLeft);
        // console.log("b:", b.isShown);
        // b.isShown == false
    });
    console.log("levelComplete:", levelComplete, "brickField:", brickField); //TODO atm needs 1 extra hit before turning true
    

    if (levelComplete) {
        initNextLevel();
        resetBall();
        resetPaddle();
        initBricks();
        game.timeoutId = setTimeout(() => {
            animate();
            sounds.music.play();
        }, 3000);

        return true;
    }
    return false;
}

function initNextLevel() {
    game.level++;
    game.speed++;
    sounds.music.pause();
    game.sfx && sounds.levelCompleted.play();
    ctx.font = '50px ArcadeClassic';
    ctx.fillStyle = 'yellow';
    ctx.fillText(`LEVEL ${game.level}!`, canvas.width / 2 - 80, canvas.height / 2);
}

function isGameOver() {
    const isBallLost = () => ball.y - ball.radius > canvas.height;

    if (isBallLost()) {
        game.lives -= 1;
        game.sfx && sounds.ballLost.play();
        if (game.lives === 0) {
            gameOver();
            return true;
        }
        resetBall();
        resetPaddle();
    }
    return false;
}

function gameOver() {
    game.on = false;
    sounds.music.pause();
    sounds.currentTime = 0;
    game.sfx && sounds.gameOver.play();
    ctx.font = '50px ArcadeClassic';
    ctx.fillStyle = 'red';
    ctx.fillText('GAME OVER', canvas.width / 2 - 100, canvas.height / 2);
}

function volumeDown() {
    if (sounds.music.volume >= 0.1) {
        for (const [key] of Object.entries(sounds)) {
            sounds[key].volume -= 0.1;
        }
    }
}


function volumeUp() {
    if (sounds.music.volume <= 0.9) {
        for (const [key] of Object.entries(sounds)) {
            sounds[key].volume += 0.1;
        }
    }
}

initSounds();