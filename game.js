const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const player = { x: 400, y: 300, size: 20, speed: 4 };
const keys = {};

window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

function update() {
  if (keys['ArrowLeft'])  player.x -= player.speed;
  if (keys['ArrowRight']) player.x += player.speed;
  if (keys['ArrowUp'])    player.y -= player.speed;
  if (keys['ArrowDown'])  player.y += player.speed;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#4af';
  ctx.fillRect(player.x, player.y, player.size, player.size);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();