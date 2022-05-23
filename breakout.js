const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const canvasWrapper = document.getElementById('canvasWrapper');

const gameBoardWrapper = document.getElementById('gameBoardWrapper');

// let heightRatio = 1.2;
// canvas.height = canvas.width * heightRatio;


var rect = canvas.parentNode.getBoundingClientRect();

gameBoardWrapper.width = rect.width;
gameBoardWrapper.height = rect.height;
canvas.width = gameBoardWrapper.width;
canvas.height = gameBoardWrapper.height;

// canvas.width = rect.width;
// canvas.height = rect.height;

// alert('Styr till höger eller vänster med piltangenterna, mus eller ditt finger. För att starta, tryck på "mellanslag" eller klicka på start-knappen.')


document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);
document.addEventListener("mousemove", mouseMoveHandler);

document.addEventListener("touchstart", touchHandler);
document.addEventListener("touchend", function(e) {
    e.preventDefault();
    document.removeEventListener("touchmove", function(e) {
        e.preventDefault();
    }); 
});

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
    // rows: 1,
    // cols: 3,
   
    rows: 3,
    cols: 20,
    get width() { return canvas.width / this.cols; },
    get height() {return (canvas.width / this.cols)*2.6}
}
let images = {
    background: new Image(),
    ball: new Image(),
    paddle: new Image(),
    bricks: new Image()
}

function onImageLoad() {
    resetGame();
    initBricks();
    resetPaddle();
    paint();
    ctx.font = '50px ArcadeClassic';
    ctx.fillStyle = 'lime';
    // ctx.fillText('Tryck Starta', canvas.width / 2 - 120, canvas.height / 2);
};
//check if multiple images loaded, onImageLoad() is run after all images are loaded: 
window.onload = function() {
    onImageLoad();
};

images.background.src = './images/bg-space.webp';
images.ball.src = './images/ball.webp';
images.paddle.src = './images/paddle.webp';
// images.paddle.src = 'https://content.adoveodemo.com/2022-05-19T11-54-07.022903_paddle.webp';
images.bricks.src = './images/bottle-cropped.png';  //cropped image


// const sounds = {
//     ballLost: new Audio('./sounds/ball-lost.mp3'),
//     breakout: new Audio('./sounds/breakout.mp3'),
//     brick: new Audio('./sounds/brick.mp3'),
//     gameOver: new Audio('./sounds/game-over.mp3'),
//     levelCompleted: new Audio('./sounds/level-completed.mp3'),
//     music: new Audio('./sounds/music.mp3'),
//     paddle: new Audio('./sounds/paddle.mp3')
// }

let brickField = [];

function play() {   
    cancelAnimationFrame(game.requestId);
    clearTimeout(game.timeoutId);
    game.on = true;

    resetGame();
    resetBall();
    resetPaddle();
    initBricks();

    // game.sfx && sounds.breakout.play();
    // Start music after starting sound ends.
    // setTimeout(() => game.music && sounds.music.play(), 2000);


    animate();
}

function resetGame() {
    game.speed = 7;
    game.score = 0;
    game.level = 1;
    game.lives = 3;
    game.time = { start: performance.now(), elapsed: 0, refreshRate: 16  };
}

// function initSounds() {
//     sounds.music.loop = true;
//     for (const [key] of Object.entries(sounds)) {
//         sounds[key].volume = 0.5;
//     }
// }

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
    brickField = [];
    const topMargin = 30;
    for(let row = 0; row < brick.rows; row++) {
        for(let col = 0; col < brick.cols; col++) {

            brickField.push({
                x: col * brick.width,
                y: row * brick.height + topMargin,
                height: brick.height,
                width: brick.width,
                isShown: true,
                points: (5 - row) * 2, //different scores depending on which row hit
                hitsLeft: row === 0 ? 1 : 1 //row=0 = highest row
            });
        }
    }    
}

function animate(now = 0) { 
    game.time.elapsed = now - game.time.start;
    if (game.time.elapsed > game.time.refreshRate) {
        game.time.start = now;
        paint(); 
        update();
        detectCollision();
        detectBrickCollision();
        if (isLevelCompleted() || isGameOver()) return; //TODO add back when fat arrow isLevelCompleted is fixed
        // if (isGameOver()) return;

    }    

    game.requestId = requestAnimationFrame(animate);
}

function paint() {
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
    brickField.forEach( function(brick) {
        let brickX = brick.x;
        let brickY = brick.y;
        let brickWidt = brick.width;
        let brickHeight = brick.height;

        if (brick.isShown !== false) {
            ctx.drawImage(images.bricks, brickX, brickY, brickWidt, brickHeight);
        } 
    } );
}

function drawScore() {
    ctx.font = '1rem Helvetica';
    ctx. fillStyle = 'white';
    const { level, score } = game;
    ctx.fillText(`NIVÅ: ${level}`, 5, 23);
    ctx.fillText(`POÄNG: ${score}`, canvas.width / 2 - 50, 23);
}

function drawLives() {
    // if (game.lives > 2) { ctx.drawImage(images.paddle, canvas.width - 150, 9, 40, 13); }
    // if (game.lives > 1) { ctx.drawImage(images.paddle, canvas.width - 100, 9, 40, 13); }
    // if (game.lives > 0) { ctx.drawImage(images.paddle, canvas.width - 50, 9, 40, 13); }
    if (game.lives > 2) { ctx.drawImage(images.paddle, canvas.width - 88, 12, 24, 9); }
    if (game.lives > 1) { ctx.drawImage(images.paddle, canvas.width - 58, 12, 24, 9); }
    if (game.lives > 0) { ctx.drawImage(images.paddle, canvas.width - 28, 12, 24, 9); }

}

function detectCollision() {
    // const hitTop = () => ball.y < 0;
    function hitTop() {
        return ball.y < 0;
    };

    // const hitLeftWall = () => ball.x < 0;
    function hitLeftWall() {
        return ball.x < 0;
    }
    // const hitRightWall = () => ball.x + ball.radius * 2 > canvas.width;
    function hitRightWall() {
        return ball.x + ball.radius * 2 > canvas.width;
    }
    
    // const hitPaddle = () => 
    //     ball.y + 2 * ball.radius > canvas.height - paddle.height &&
    //     ball.y + ball.radius < canvas.height && 
    //     ball.x + ball.radius > paddle.x &&
    //     ball.x + ball.radius < paddle.x + paddle.width;
    function hitPaddle() {
        return  ball.y + 2 * ball.radius > canvas.height - paddle.height &&
        ball.y + ball.radius < canvas.height && 
        ball.x + ball.radius > paddle.x &&
        ball.x + ball.radius < paddle.x + paddle.width;
    }

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
        // game.sfx && sounds.paddle.play();

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
    // const isBallInsideBrick = (brick) => 
    //     ball.x + 2 * ball.radius > brick.x &&
    //     ball.x < brick.x + brick.width && 
    //     ball.y + 2 * ball.radius > brick.y && 
    //     ball.y < brick.y + brick.height;

    function isBallInsideBrick(brick) {
        return ball.x + 2 * ball.radius > brick.x &&
        ball.x < brick.x + brick.width && 
        ball.y + 2 * ball.radius > brick.y && 
        ball.y < brick.y + brick.height;
    };
  
    brickField.forEach( function(brick) {
        if (brick.hitsLeft && isBallInsideBrick(brick)) {
            // sounds.brick.currentTime = 0;
            // game.sfx && sounds.brick.play();
            brick.hitsLeft--;

            game.score += brick.points;
    
            // if (!directionChanged) {
                // console.log("remove brick:", brick);
                
                //Find index of hit brick
                const index = brickField.findIndex(function(obj) {
                    return (obj.x == brick.x) && (obj.y == brick.y)
                });
                // console.log("indexOf hit brick:", index);

                //set hit brick isShown to false
                brickField[index].isShown = false;
            
                // directionChanged = true;
                detectCollisionDirection(brick);

                isLevelCompleted(); 
        } 
    });
}

function detectCollisionDirection(brick) {
    // const hitFromLeft = () => ball.x + 2 * ball.radius - ball.dx <= brick.x;
    function hitFromLeft() {
        return ball.x + 2 * ball.radius - ball.dx <= brick.x;
    };

    // const hitFromRight = () => ball.x - ball.dx >= brick.x + brick.width;
    function hitFromRight() {
        return ball.x - ball.dx >= brick.x + brick.width;
    };

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
    // if (game.on && (e.key === 'm' || e.key === 'M')) {
    //     game.music = !game.music;
    //     game.music ? sounds.music.play() : sounds.music.pause();
    // }
    if (game.on && (e.key === 's' || e.key === 'S')) {
        game.sfx = !game.sfx;
    }
    // if (e.key === 'ArrowUp') {
    //     volumeUp();
    // }
    // if (e.key === 'ArrowDown') {
    //     volumeDown();
    // }
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
    // const isInsideCourt = () => mouseX > 0 && mouseX < canvas.width;
    function isInsideCourt() {
        return mouseX > 0 && mouseX < canvas.width;
    }
    if(isInsideCourt()) {
        paddle.x = mouseX - paddle.width / 2;
    }
}

//touch events
function touchHandler(e) {
    //Only start game if touch StartBtn
    if (e.target.id === "play-button") {
        play();
    };

    document.addEventListener("touchmove", function(e) {
        // e.preventDefault(); 
        const touchMoveX = e.touches[0].clientX;
        paddle.x = touchMoveX - paddle.width / 2;
    });
};


function isLevelCompleted() {
    // const levelComplete = brickField.every((b) => b.hitsLeft === 0); //TODO fix to normal function

    // brickField.every( function(b) {
    //     return b.hitsLeft === 0;
    // })

    // if (levelComplete) {
    //     initNextLevel();
    //     resetBall();
    //     resetPaddle();
    //     initBricks();
    //     animate();
    //     return true;
    // }
    // return false;
    // levelComplete();

    // function levelComplete() {
        // return brickField.every( function(b) {
        //     b.hitsLeft === 0
        for(var i=0; i < brickField.length; i++) {
            console.log("i?", brickField[i].hitsLeft);
            if (brickField[i].hitsLeft === 0) {
                console.log("NEXT LEVEL");
            } else {
                console.log("nothing happens");
            }
        //  return brickField[i].hitsLeft === 0;
        // }
    }
    // var isNextLevel = levelComplete();
    // console.log("isNextLevel:", isNextLevel);

    // if (isNextLevel) {
    //     initNextLevel();
    //     resetBall();
    //     resetPaddle();
    //     initBricks();
    //     animate();
    //     return true;
    // }
    // return false;
}

function initNextLevel() {
    game.level++;
    game.speed++;
    // sounds.music.pause();
    // game.sfx && sounds.levelCompleted.play();
    ctx.font = '50px ArcadeClassic';
    ctx.fillStyle = 'yellow';
}

function isGameOver() {
    // const isBallLost = () => ball.y - ball.radius > canvas.height;
    function isBallLost() {
        return ball.y - ball.radius > canvas.height;
    }
    if (isBallLost()) {
        game.lives -= 1;
        // game.sfx && sounds.ballLost.play();
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
    // sounds.music.pause();
    // sounds.currentTime = 0;
    // game.sfx && sounds.gameOver.play();
    ctx.font = '50px ArcadeClassic';
    ctx.fillStyle = 'red';
    ctx.fillText('GAME OVER', canvas.width / 2 - 100, canvas.height / 2);
}

// function volumeDown() {
//     if (sounds.music.volume >= 0.1) {
//         for (const [key] of Object.entries(sounds)) {
//             sounds[key].volume -= 0.1;
//         }
//     }
// }


// function volumeUp() {
//     if (sounds.music.volume <= 0.9) {
//         for (const [key] of Object.entries(sounds)) {
//             sounds[key].volume += 0.1;
//         }
//     }
// }

// initSounds();