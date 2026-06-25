const INPUT_DEADZONE = 0.15;

const INPUT_BINDINGS = {
  moveUp: ['KeyW', 'ArrowUp'],
  moveDown: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  sneak: ['KeyC'],
  interact: ['KeyE'],
  hardAim: [],
  shoot: ['MouseLeft'],
  reset: ['BracketRight'],
};

const input = {
  moveX: 0,
  moveY: 0,
  moveAmount: 0,
  moveIsAnalog: false,
  aimAngle: 0,
  aimActive: false,
  aimAdjusting: false,
  hardAimHeld: false,
  sprintHeld: false,
  sprintPressed: false,
  sneakActive: false,
  interactPressed: false,
  shootPressed: false,
  resetPressed: false,
  lastDevice: 'keyboardMouse',
};

const inputKeys = {};
const inputMouseButtons = {};
const inputPrevious = {
  sprintHeld: false,
  sneakHeld: false,
  interactHeld: false,
  shootHeld: false,
  resetHeld: false,
};

let keyboardSneakActive = false;
let mouseClientX = 0;
let mouseClientY = 0;
let mouseSeen = false;
let mouseMovedSinceUpdate = false;
let lastAimDevice = 'keyboardMouse';

window.addEventListener('keydown', (e) => {
  inputKeys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
  inputKeys[e.code] = false;
});

window.addEventListener('mousemove', (e) => {
  mouseClientX = e.clientX;
  mouseClientY = e.clientY;
  mouseSeen = true;
  mouseMovedSinceUpdate = true;
  lastAimDevice = 'keyboardMouse';
});

window.addEventListener('mousedown', (e) => {
  inputMouseButtons[e.button] = true;
  mouseClientX = e.clientX;
  mouseClientY = e.clientY;
  mouseSeen = true;
  mouseMovedSinceUpdate = true;
  lastAimDevice = 'keyboardMouse';
});

window.addEventListener('mouseup', (e) => {
  inputMouseButtons[e.button] = false;
});

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

function isKeyHeld(action) {
  return INPUT_BINDINGS[action].some(code => inputKeys[code] === true);
}

function isMouseHeld(code) {
  if (code === 'MouseLeft') return inputMouseButtons[0] === true;
  if (code === 'MouseRight') return inputMouseButtons[2] === true;
  return false;
}

function isBindingHeld(action) {
  return INPUT_BINDINGS[action].some(code => code.startsWith('Mouse')
    ? isMouseHeld(code)
    : inputKeys[code] === true);
}

function getGamepad() {
  const gamepads = navigator.getGamepads?.() ?? [];
  return Array.from(gamepads).find(Boolean) ?? null;
}

function readButton(gp, index) {
  const button = gp?.buttons[index];
  if (!button) return false;
  return button.pressed || button.value > 0.5;
}

function readTrigger(gp, index) {
  const button = gp?.buttons[index];
  if (!button) return false;
  return (button.value ?? (button.pressed ? 1 : 0)) > 0.5;
}

function readGamepadMove(gp) {
  if (!gp) return { x: 0, y: 0, amount: 0 };

  const rawX = gp.axes[0] ?? 0;
  const rawY = gp.axes[1] ?? 0;
  const magnitude = Math.min(1, Math.hypot(rawX, rawY));
  if (magnitude <= INPUT_DEADZONE) return { x: 0, y: 0, amount: 0 };

  return {
    x: rawX / magnitude,
    y: rawY / magnitude,
    amount: (magnitude - INPUT_DEADZONE) / (1 - INPUT_DEADZONE),
  };
}

function readGamepadAim(gp) {
  if (!gp) return { active: false, angle: 0 };

  const rawX = gp.axes[2] ?? 0;
  const rawY = gp.axes[3] ?? 0;
  if (Math.hypot(rawX, rawY) <= INPUT_DEADZONE) return { active: false, angle: 0 };

  return {
    active: true,
    angle: Math.atan2(rawX, -rawY),
  };
}

function readKeyboardMove() {
  let x = 0;
  let y = 0;

  if (isKeyHeld('moveLeft')) x -= 1;
  if (isKeyHeld('moveRight')) x += 1;
  if (isKeyHeld('moveUp')) y -= 1;
  if (isKeyHeld('moveDown')) y += 1;

  const magnitude = Math.hypot(x, y);
  if (magnitude === 0) return { x: 0, y: 0, amount: 0 };

  return {
    x: x / magnitude,
    y: y / magnitude,
    amount: 1,
  };
}

function readMouseAim(view) {
  if (!mouseSeen || !view?.canvas) return { active: false, angle: 0 };

  const rect = view.canvas.getBoundingClientRect();
  const viewportX = ((mouseClientX - rect.left) / rect.width) * view.viewportWidth;
  const viewportY = ((mouseClientY - rect.top) / rect.height) * view.viewportHeight;
  const worldX = view.cameraX + viewportX;
  const worldY = view.cameraY + viewportY;

  return {
    active: true,
    angle: Math.atan2(worldX - view.playerX, -(worldY - view.playerY)),
  };
}

function wasPressed(name, held) {
  const pressed = held && !inputPrevious[name];
  inputPrevious[name] = held;
  return pressed;
}

function updateInput(view) {
  const gp = getGamepad();
  const keyboardMove = readKeyboardMove();
  const gamepadMove = readGamepadMove(gp);

  if (gamepadMove.amount > 0) {
    input.moveX = gamepadMove.x;
    input.moveY = gamepadMove.y;
    input.moveAmount = gamepadMove.amount;
    input.moveIsAnalog = true;
    input.lastDevice = 'gamepad';
  } else {
    input.moveX = keyboardMove.x;
    input.moveY = keyboardMove.y;
    input.moveAmount = keyboardMove.amount;
    input.moveIsAnalog = false;
    if (keyboardMove.amount > 0) input.lastDevice = 'keyboardMouse';
  }

  const gamepadAim = readGamepadAim(gp);
  const mouseAim = readMouseAim(view);
  if (gamepadAim.active) lastAimDevice = 'gamepad';

  if (lastAimDevice === 'gamepad') {
    if (gamepadAim.active) {
      input.aimAngle = gamepadAim.angle;
      input.aimActive = true;
      input.aimAdjusting = true;
      input.lastDevice = 'gamepad';
    } else {
      input.aimActive = false;
      input.aimAdjusting = false;
    }
  } else if (mouseAim.active) {
    input.aimAngle = mouseAim.angle;
    input.aimActive = true;
    input.aimAdjusting = mouseMovedSinceUpdate;
  } else {
    input.aimActive = false;
    input.aimAdjusting = false;
  }

  const hardAimHeld = isBindingHeld('hardAim') || inputMouseButtons[2] === true || readTrigger(gp, 6);
  const keyboardSprintHeld = isBindingHeld('sprint');
  const gamepadSprintHeld = readButton(gp, 0);
  const sneakHeld = isBindingHeld('sneak');
  const interactHeld = isBindingHeld('interact') || readButton(gp, 2);
  const shootHeld = isBindingHeld('shoot') || readButton(gp, 7);
  const resetHeld = isBindingHeld('reset') || readButton(gp, 1);

  const sneakPressed = wasPressed('sneakHeld', sneakHeld);
  if (sneakPressed) keyboardSneakActive = !keyboardSneakActive;

  input.hardAimHeld = hardAimHeld;
  input.sprintHeld = keyboardSprintHeld;
  input.sprintPressed = wasPressed('sprintHeld', gamepadSprintHeld);
  input.sneakActive = keyboardSneakActive;
  input.interactPressed = wasPressed('interactHeld', interactHeld);
  input.shootPressed = wasPressed('shootHeld', shootHeld);
  input.resetPressed = wasPressed('resetHeld', resetHeld);

  if ((input.sprintHeld || input.sprintPressed) && input.sneakActive) {
    keyboardSneakActive = false;
    input.sneakActive = false;
  }

  mouseMovedSinceUpdate = false;
}
