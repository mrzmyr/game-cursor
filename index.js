const handsfree = new Handsfree({ debug: false, hideCursor: true })
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');

let width = window.innerWidth;
let height = window.innerHeight;

canvas.width = width * devicePixelRatio;
canvas.height = height * devicePixelRatio;

canvas.style.width = `${width}px`;
canvas.style.height = `${height}px`;

let audioContext = new AudioContext();

let time = null;
let delta;
let fps;

let t = 0;

let dots = [[], [], [], [], [], []]
let moving = false;

let startX = canvas.width/2;
let startY = canvas.height/2;
let step = 10;

let player;
let figures;
let currentLevel = 1;
let points = 0;

function rndInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function bigText(text) {
  ctx.font = `${(Math.sin(t) + 1) * 100}px Helvetica`;
  ctx.fillStyle = 'grey';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2 + Math.sin(t) * 300, canvas.height / 2 + 25);
}

function playSound(hz, length) {
  let osc = audioContext.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = hz;
  osc.connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + length);
}

function rect(x, y, width, height, color) {
  ctx.beginPath();

  height = height || width;

  ctx.lineWidth = 1;
  ctx.strokeStyle = color || "rgba(0,0,0,1)";

  ctx.rect(
    x - width / 2,
    y - height / 2, 
    width, 
    height
  );
  ctx.stroke();
}

function fadeOut() {
  ctx.fillStyle = `rgba(0,0,0, 0.01)`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function clear () {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

canvas.addEventListener('mousedown', function (e) {
  moving = true;
}, false)

canvas.addEventListener('mouseup', function (e) {
  moving = false;
}, false)

canvas.addEventListener('mousemove', function (e) {
  if(!moving) return;
}, false)

class Particle {
  constructor(options) {
    for(let o in options) {
      this[o] = options[o];
    }

    this.color = 'white';
  }

  moveTo(x, y) {
    if(
      x > this.size / 2 &&
      x < canvas.width - this.size / 2 &&
      y > this.size / 2 &&
      y < canvas.height - this.size / 2
    ) {
      this.x = x;
      this.y = y;
    }
  }

  isOverlay(particle) {
    if(particle == this) return;

    let r1x1 = particle.x - particle.size / 2;
    let r1x2 = particle.x + particle.size / 2;
    let r1y1 = particle.y - particle.size / 2;
    let r1y2 = particle.y + particle.size / 2;

    let r2x1 = this.x - this.size / 2;
    let r2x2 = this.x + this.size / 2;
    let r2y1 = this.y - this.size / 2;
    let r2y2 = this.y + this.size / 2;

    return r1x1 < r2x2 && r1x2 > r2x1 && r1y1 < r2y2 && r1y2 > r2y1;
  }

  draw() {
    rect(this.x, this.y, this.size, this.size, this.color);
    ctx.fillStyle = this.color;
    ctx.fill()
  }
}

class Player extends Particle {
  constructor(options) {
    super(options)
    this.dead = false;

    window.addEventListener('keydown', this._onKeyDown.bind(this))
    window.addEventListener('keyup', this._onKeyUp.bind(this))
    this._activeKeys = {};

    handsfree.use({
      name: 'myPlugin',
      onFrame: function(poses) {
        poses.forEach(function (pose) {
          // Do things with pose here: @see https://handsfree.js.org/#/docs/plugins
          this.x = pose.cursor.x * 2
          this.y = pose.cursor.y * 2
        }.bind(this))
      }.bind(this)
    })
  }

  _onKeyDown(e) {
    this._activeKeys[e.key] = true;
  }

  _onKeyUp(e) {
    this._activeKeys[e.key] = false;
  }

  eat(food) {
    this.size += food.size;
    playSound(800, 0.05)
  }

  draw() {
    super.draw()

    let x = this.x;
    let y = this.y;

    if(this._activeKeys['ArrowDown']) {
      y += this.step;
    }

    if(this._activeKeys['ArrowUp']) {
      y -= this.step;
    }

    if(this._activeKeys['ArrowRight']) {
      x += this.step;
    }

    if(this._activeKeys['ArrowLeft']) {
      x -= this.step;
    }

    this.moveTo(x, y)
  }

  die() {
    this.dead = true;

    playSound(400, 0.2)
    setTimeout(() => {
      playSound(300, 0.2)
    }, 210)
    setTimeout(() => {
      playSound(200, 0.2)
    }, 420)
  }
}

class Enemy extends Particle {
  constructor(options) {
    super(options)
    this.size = 10;
    this.color = 'red'

    setInterval(this.walk.bind(this), this.speed);
  }

  walk() {
    this.moveTo(
      this.x - rndInt(-1 * this.size, this.size), 
      this.y - rndInt(-1 * this.size, this.size)
    )
  }
}

class Food extends Particle {
  constructor(options) {
    super(options)
    this.size = 20;
    this.color = 'blue'
  }
}

function startLevel() {
  player = new Player({
    size: 10,
    x: canvas.width / 2, 
    y: canvas.height / 2,
    step: 5
  });

  figures = [player];

  for (let i = 0; i < 5 * currentLevel; i++) {
    figures.push(new Enemy({ speed: currentLevel * 100, x: rndInt(0, canvas.width), y: rndInt(0, canvas.height) }))
  }

  for (let i = 1; i <= currentLevel; i++) {
    figures.push(new Food({ x: rndInt(0, canvas.width), y: rndInt(0, canvas.height) }))
  }

  if(currentLevel === 1) clear()

  bigText(`Level ${currentLevel}`)
}

startLevel(currentLevel);

function game() {
  
  let numberEnemies = 0;
  let numberFood = 0;

  figures.forEach((f, i) => {
    if(f instanceof Food) {
      numberFood++;

      if (f.isOverlay(player)) {
        player.eat(f)
        points += 100;
        figures.splice(i, 1)
      }
    }
    if(f instanceof Enemy) {
      numberEnemies++;

      if (f.isOverlay(player)) {
        player.die()
        figures.splice(figures.indexOf(player), 1)
      }
    }

    f.draw()
  })

  ctx.font = "30px Helvetica";
  ctx.fillStyle = 'white';
  ctx.textAlign = 'left';
  ctx.fillText(`Points: ${points}`, 10, 50);

  if(player.dead) {
    currentLevel = 1;
    points = 1;
    startLevel()
    return;
  }

  if(numberFood === 0) {
    currentLevel++;
    startLevel()
  }
}

function draw() {
  // clear();
  fadeOut();
  t++;
  game();
}

(function render(timestamp) {
  draw();

  let now = +new Date();
  delta = (now - (time || now));
  fps = 1/delta*1000;

  time = now;

  requestAnimationFrame(render);
})()