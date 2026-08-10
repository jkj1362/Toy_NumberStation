const assert = require('node:assert/strict');
const vm = require('node:vm');
const { loadRuntime } = require('./runtime-smoke.test.js');

const context = loadRuntime(false);

const result = JSON.parse(vm.runInContext(`
  (() => {
    WALLS.length = 0;
    DOORS.length = 0;
    WINDOWS.length = 0;
    enemies = enemies.slice(0, 4);
    player.x = -10000;
    player.y = -10000;

    const source = { x: 800, y: 500 };
    const starts = [
      { x: 180, y: 420 },
      { x: 180, y: 470 },
      { x: 180, y: 520 },
      { x: 180, y: 570 },
    ];
    const incident = createEnemyIncident('gunshot', source.x, source.y, {
      id: 'test-crowd-gunshot',
      shotId: 'test-crowd-shot',
      sourceType: 'player',
    });

    enemies.forEach((enemy, index) => {
      enemy.x = starts[index].x;
      enemy.y = starts[index].y;
      enemy.patrolRoute = [];
      enterEnemyAlert(enemy, source.x, source.y, false, 'gunshot', incident);
      enemy.alertTimer = 10000;
    });

    const targets = enemies.map(enemy => ({
      x: enemy.lastKnownX,
      y: enemy.lastKnownY,
      slot: enemy.alertTargetSlot,
    }));
    const lateMovement = enemies.map(() => 0);
    let previous = enemies.map(enemy => ({ x: enemy.x, y: enemy.y }));

    for (let frame = 0; frame < 320; frame++) {
      updateEnemies();
      if (frame >= 280) {
        enemies.forEach((enemy, index) => {
          lateMovement[index] += Math.hypot(
            enemy.x - previous[index].x,
            enemy.y - previous[index].y
          );
        });
      }
      previous = enemies.map(enemy => ({ x: enemy.x, y: enemy.y }));
    }

    return JSON.stringify({
      arrivalRadius: enemyArrivalRadius(),
      targets,
      distances: enemies.map((enemy, index) => Math.hypot(
        enemy.x - targets[index].x,
        enemy.y - targets[index].y
      )),
      lateMovement,
    });
  })()
`, context));

if (process.env.DEBUG_ENEMY_CROWDING) console.log(result);

assert.equal(
  new Set(result.targets.map(target => `${target.x.toFixed(3)},${target.y.toFixed(3)}`)).size,
  result.targets.length,
  'guards investigating one gunshot should receive distinct physical destinations'
);
assert.equal(
  new Set(result.targets.map(target => target.slot)).size,
  result.targets.length,
  'alert slots should be reserved once per guard'
);
assert.ok(
  result.distances.every(distance => distance <= result.arrivalRadius + 0.1),
  `every guard should reach its assigned gunshot destination; distances=${result.distances.join(', ')}`
);
assert.ok(
  result.lateMovement.every(distance => distance < 0.05),
  `settled guards should not vibrate in place; late movement=${result.lateMovement.join(', ')}`
);

const facingResult = JSON.parse(vm.runInContext(`
  (() => {
    enemies = enemies.slice(0, 2);
    player.x = -10000;
    player.y = -10000;
    enemies[0].x = 500;
    enemies[0].y = 500;
    enemies[1].x = 510;
    enemies[1].y = 500;
    enemies.forEach(enemy => {
      enemy.state = 'patrol';
      enemy.patrolRoute = [];
      enemy.reactionTimer = 0;
      enemy.pendingReaction = null;
    });
    enemies[0].angle = Math.PI / 2;
    enemies[0].targetAngle = Math.PI / 2;
    enemies[1].angle = -Math.PI / 2;
    enemies[1].targetAngle = -Math.PI / 2;
    updateEnemies();

    const a = enemies[0];
    const b = enemies[1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.hypot(dx, dy);
    const towardAX = dx / distance;
    const towardAY = dy / distance;
    return JSON.stringify({
      distance,
      minimumDistance: enemyRadius() * 2 + scaleEnemyUnit(6),
      aFacingToward: Math.sin(a.angle) * towardAX + -Math.cos(a.angle) * towardAY,
      bFacingToward: Math.sin(b.angle) * -towardAX + -Math.cos(b.angle) * -towardAY,
    });
  })()
`, context));

assert.ok(
  facingResult.distance >= facingResult.minimumDistance - 0.1,
  'guards that meet should retain visible personal space'
);
assert.ok(
  facingResult.aFacingToward < -0.9 && facingResult.bFacingToward < -0.9,
  'guards inside the close-range avoidance zone should face away instead of nose-to-nose'
);

console.log('Enemy crowding regression checks passed.');
