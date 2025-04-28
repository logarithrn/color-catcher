// Get canvas and context
const canvas = document.getElementById('gameCanvas');

// Dynamic canvas sizing
function resizeCanvas() {
  const ratio = 600 / 800; // width / height

  let width = window.innerWidth;
  let height = window.innerHeight;

  if (width / height > ratio) {
    width = height * ratio;
  } else {
    height = width / ratio;
  }

  canvas.width = width;
  canvas.height = height;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
const ctx = canvas.getContext('2d');

// Colors to use
const colors = ['red', 'blue', 'green', 'purple', 'orange', 'maroon'];
const backgroundColors = ['#e0f7fa', '#e8f5e9', '#f3e5f5', '#fff3e0'];

// Basket setup
const basket = {
    width: 80,
    height: 10,
    x: canvas.width / 2 - 50,
    y: canvas.height - 40,
    color: getRandomColor(),
    speed: 9
};  

// Game variables
let balls = [createBall()];
let particles = [];
let score = 0;
let catches = 0;
let lives = 3;
let bestScore = localStorage.getItem('bestScore') || 0;
let gameState = 'menu';
let countdown = 3;
let countdownTimer = null;
let flashTimer = 0;
let basketChanges = 0;
let maxBalls = 6;
let isPaused = false;
let levelUpOpacity = 0;
let doublePointsTimer = 0;
let activePowerUp = null;
let currentBackgroundColor = backgroundColors[0];
let nextBackgroundColor = backgroundColors[1];
let backgroundTransition = 0;
let achievementsUnlocked = [];
let currentAchievement = null;
let achievementTimer = 0;
let achievementY = -50;

let saveButton = {
  x: canvas.width / 2 - 75,
  y: canvas.height / 2 + 80,
  width: 150,
  height: 40
};

const sounds = {
  catch: new Audio('assets/sounds/catch.mp3'),
  wrong: new Audio('assets/sounds/wrong.mp3'),
  levelup: new Audio('assets/sounds/levelup.mp3')
};

// Keyboard controls
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (e.key.toLowerCase() === 'p') {
    isPaused = !isPaused;
  }
});
window.addEventListener('keyup', (e) => keys[e.key] = false);

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (gameState === 'menu') {
    resetGame();
    startCountdown();
  } else if (gameState === 'start' || gameState === 'gameover') {
    if (gameState === 'gameover') {
      if (mouseX >= saveButton.x && mouseX <= saveButton.x + saveButton.width &&
          mouseY >= saveButton.y && mouseY <= saveButton.y + saveButton.height) {
        let playerName = prompt('Enter your 3-character name:').toUpperCase().substring(0, 3);
        saveScore(playerName, score);
        return;
      }
    }
    resetGame();
    startCountdown();
  } else if (gameState === 'countdown') {
    clearInterval(countdownTimer);
    gameState = 'playing';
  }
});

function getRandomColor(excludeColor = null) {
  let availableColors = colors.filter(c => c !== excludeColor);
  return availableColors[Math.floor(Math.random() * availableColors.length)];
}

function createBall(isPowerUp = false) {
  if (isPowerUp) {
    const powerTypes = ['slow', 'life', 'double'];
    const chosen = powerTypes[Math.floor(Math.random() * powerTypes.length)];
    let color = 'gold';
    if (chosen === 'slow') color = 'lightblue';
    if (chosen === 'life') color = 'limegreen';
    if (chosen === 'double') color = 'gold';

    return {
      x: Math.random() * (canvas.width - 20),
      y: 0,
      radius: 12,
      color: color,
      speed: 2 + Math.random(),
      isPowerUp: true,
      powerType: chosen
    };
  } else {
    return {
      x: Math.random() * (canvas.width - 20),
      y: 0,
      radius: 12,
      color: getRandomColor(basket.color),
      speed: 2 + Math.random(),
      isPowerUp: false
    };
  }
}

function resetGame() {
  score = 0;
  catches = 0;
  lives = 3;
  ballSpeed = 2;
  balls = [createBall()];
  basket.color = getRandomColor();
  basketChanges = 0;
  resetBalls();
  particles = [];
  currentBackgroundColor = backgroundColors[0];
  nextBackgroundColor = backgroundColors[1];
  backgroundTransition = 0;
}

function startCountdown() {
  gameState = 'countdown';
  countdown = 3;
  countdownTimer = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(countdownTimer);
      gameState = 'playing';
    }
  }, 1000);
}

function resetBalls() {
  balls.forEach(ball => resetBall(ball));
}

function update() {
  if (keys['ArrowLeft'] && basket.x > 0) basket.x -= basket.speed;
  if (keys['ArrowRight'] && basket.x < canvas.width - basket.width) basket.x += basket.speed;

  balls.forEach(ball => {
    ball.y += ball.speed;

    if (ball.y + ball.radius >= basket.y &&
        ball.x + ball.radius >= basket.x &&
        ball.x - ball.radius <= basket.x + basket.width) {
      if (ball.isPowerUp) {
        activatePowerUp(ball.powerType);
        resetBall(ball);
      } else if (ball.color === basket.color) {
        sounds.catch.play();
        score += (doublePointsTimer > 0) ? 2 : 1;
        catches++;
        createParticles(ball);
        resetBall(ball);
        checkAchievements();

        if (catches % 3 === 0) {
          basket.color = getRandomColor();
          basketChanges++;
          currentBackgroundColor = nextBackgroundColor;
          nextBackgroundColor = backgroundColors[Math.floor(Math.random() * backgroundColors.length)];
          backgroundTransition = 0;

          if (basketChanges % 2 === 0 && balls.length < maxBalls) {
            const isPowerUp = balls.length > 1 && Math.random() < 0.1;
            balls.push(createBall(isPowerUp));
            levelUpOpacity = 1;
            sounds.levelup.play();
          }
        }

        if (score % 6 === 0) {
          balls.forEach(b => b.speed += 0.5);
        }
      } else {
        sounds.wrong.play();
        lives--;
        flashTimer = 10;
        if (lives <= 0) {
          if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('bestScore', bestScore);
          }
          gameState = 'gameover';
        }
        resetBall(ball);
      }
    }

    if (ball.y > canvas.height) {
      resetBall(ball);
    }
  });

  if (doublePointsTimer > 0) {
    doublePointsTimer--;
  } else {
    if (activePowerUp === 'double') {
      activePowerUp = null;
    }
  }

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.02;
  });
  particles = particles.filter(p => p.alpha > 0);

  backgroundTransition += 0.002;
  if (backgroundTransition > 1) backgroundTransition = 1;

  if (currentAchievement) {
    if (achievementTimer > 0) {
      achievementTimer--;
      if (achievementY < 40) achievementY += 5;
    } else {
      if (achievementY > -50) achievementY -= 5;
      else currentAchievement = null;
    }
  }  
}

function resetBall(ball) {
  ball.x = Math.random() * (canvas.width - 20);
  ball.y = 0;

  if (balls.length === 1) {
    if (Math.random() < 0.95) {
      ball.color = basket.color;
      ball.isPowerUp = false;
    } else {
      ball.color = getRandomColor(basket.color);
      ball.isPowerUp = false;
    }
  } else {
    const isPowerUp = Math.random() < 0.1;
    if (isPowerUp) {
      const newBall = createBall(true);
      ball.color = newBall.color;
      ball.isPowerUp = true;
      ball.powerType = newBall.powerType;
    } else {
      ball.color = getRandomColor(basket.color);
      ball.isPowerUp = false;
    }
  }

  if (!balls.some(b => !b.isPowerUp && b.color === basket.color)) {
    ball.color = basket.color;
    ball.isPowerUp = false;
  }
}

function createParticles(ball) {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: ball.x,
      y: ball.y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      alpha: 1
    });
  }
}

function activatePowerUp(type) {
  if (type === 'slow') {
    balls.forEach(b => b.speed = Math.max(1, b.speed - 1));
  } else if (type === 'life') {
    lives++;
  } else if (type === 'double') {
    doublePointsTimer = 800;
    activePowerUp = 'double';
  }
}

function checkAchievements() {
    if (!achievementsUnlocked.includes('🎉 First Catch!') && catches >= 1) {
      unlockAchievement('🎉 First Catch!');
    }
    if (!achievementsUnlocked.includes('🥈 10 Points!') && score >= 10) {
      unlockAchievement('🥈 10 Points!');
    }
    if (!achievementsUnlocked.includes('🥇 50 Points!') && score >= 50) {
      unlockAchievement('🥇 50 Points!');
    }
    if (!achievementsUnlocked.includes('🏆 100 Points!') && score >= 100) {
      unlockAchievement('🏆 100 Points!');
    }
}

function unlockAchievement(text) {
    achievementsUnlocked.push(text);
    currentAchievement = text;
    achievementTimer = 200;
    achievementY = -50;
}

function draw() {
  // Background transition
  ctx.fillStyle = blendColors(currentBackgroundColor, nextBackgroundColor, backgroundTransition);
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = basket.color;
  ctx.fillRect(basket.x, basket.y, basket.width, basket.height);

  balls.forEach(ball => {
    if (ball.isPowerUp) {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius + 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();

    if (ball.isPowerUp) {
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        if (ball.powerType === 'slow') ctx.fillText('❄️', ball.x, ball.y + 5);
        if (ball.powerType === 'life') ctx.fillText('❤️', ball.x, ball.y + 5);
        if (ball.powerType === 'double') ctx.fillText('⭐', ball.x, ball.y + 5);
    }
  });

  particles.forEach(p => {
    ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = 'black';
  ctx.font = '24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Score: ' + score, 10, 30);
  ctx.fillText('Lives: ' + lives, 10, 60);
  ctx.fillText('Level: ' + balls.length, 10, 90);
  ctx.fillText('Best: ' + bestScore, 10, 120);

  if (activePowerUp === 'double') {
    ctx.fillStyle = 'gold';
    ctx.font = '24px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('⭐ 2X!', canvas.width - 10, 30);
  }

  if (levelUpOpacity > 0) {
    ctx.fillStyle = `rgba(51, 102, 255, ${levelUpOpacity})`;
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Level Up!', canvas.width / 2, canvas.height / 2 - 100);
    levelUpOpacity -= 0.01;
  }

  if (currentAchievement) {
    drawAchievementPopup();
  }  
}

function blendColors(color1, color2, percentage) {
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);

  const r = (c1 >> 16) * (1 - percentage) + (c2 >> 16) * percentage;
  const g = ((c1 >> 8) & 0xff) * (1 - percentage) + ((c2 >> 8) & 0xff) * percentage;
  const b = (c1 & 0xff) * (1 - percentage) + (c2 & 0xff) * percentage;

  return `rgb(${r}, ${g}, ${b})`;
}

function drawAchievementPopup() {
    ctx.fillStyle = '#ffeb3b'; // Bright yellow banner
    ctx.fillRect(canvas.width/2 - 150, achievementY, 300, 40);
    ctx.fillStyle = 'black';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`🏆 Achievement Unlocked: ${currentAchievement}`, canvas.width/2, achievementY + 27);
}  

function drawStartScreen() {
  ctx.fillStyle = 'lightgrey';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'black';
  ctx.font = '48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Color Catcher', canvas.width/2, canvas.height/2 - 100);

  ctx.font = '24px Arial';
  ctx.fillText('Catch balls matching your basket!', canvas.width/2, canvas.height/2 - 40);
  ctx.fillText('Move: ⬅️ ➡️   Pause: P', canvas.width/2, canvas.height/2);
  ctx.fillText('Click anywhere to Start', canvas.width/2, canvas.height/2 + 50);
}


function drawCountdown() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.font = '60px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(countdown, canvas.width / 2, canvas.height / 2);
}

function drawPauseScreen() {
  ctx.fillStyle = 'black';
  ctx.font = '30px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Paused', canvas.width / 2, canvas.height / 2);
}

function drawGameOverScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.font = '30px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 40);
  ctx.font = '20px Arial';
  ctx.fillText('Final Score: ' + score, canvas.width / 2, canvas.height / 2);
  ctx.fillText('Click to Restart', canvas.width / 2, canvas.height / 2 + 40);

  ctx.fillStyle = '#99ccff';
  ctx.fillRect(saveButton.x, saveButton.y, saveButton.width, saveButton.height);

  ctx.fillStyle = 'black';
  ctx.font = '18px Arial';
  ctx.fillText('Save High Score', canvas.width / 2, saveButton.y + 26);
}

function saveScore(name, score) {
  const text = `${name} - ${score}\n`;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'highscore.txt';
  a.click();
  URL.revokeObjectURL(url);
}

// Mobile Controls Setup
if (/Mobi|Android/i.test(navigator.userAgent)) {
    const mobileControls = document.createElement('div');
    mobileControls.id = 'mobile-controls';
    mobileControls.style.position = 'absolute';
    mobileControls.style.bottom = '30px';
    mobileControls.style.width = '100%';
    mobileControls.style.textAlign = 'center';
  
    const leftButton = document.createElement('button');
    leftButton.id = 'left-button';
    leftButton.style.fontSize = '24px';
    leftButton.innerText = '⬅️';
    mobileControls.appendChild(leftButton);
  
    const rightButton = document.createElement('button');
    rightButton.id = 'right-button';
    rightButton.style.fontSize = '24px';
    rightButton.innerText = '➡️';
    mobileControls.appendChild(rightButton);
  
    document.body.appendChild(mobileControls);

    document.getElementById('left-button').addEventListener('touchstart', (e) => { 
      e.preventDefault();
      keys['ArrowLeft'] = true;
    });
    document.getElementById('left-button').addEventListener('touchend', (e) => { 
      e.preventDefault();
      keys['ArrowLeft'] = false;
    });
    
    document.getElementById('right-button').addEventListener('touchstart', (e) => { 
      e.preventDefault();
      keys['ArrowRight'] = true;
    });
    document.getElementById('right-button').addEventListener('touchend', (e) => { 
      e.preventDefault();
      keys['ArrowRight'] = false;
    });
}
  
function gameLoop() {
  if (gameState === 'menu') {
    drawStartScreen();
  } else if (gameState === 'start') {
    drawStartScreen();
  } else if (gameState === 'countdown') {
    drawCountdown();
  } else if (gameState === 'playing') {
    if (!isPaused) {
      update();
    }
    draw();
    if (isPaused) {
      drawPauseScreen();
    }
  } else if (gameState === 'gameover') {
    drawGameOverScreen();
  }
  requestAnimationFrame(gameLoop);
}

gameLoop();
