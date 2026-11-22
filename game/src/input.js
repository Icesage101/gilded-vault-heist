// The Gilded Vault — keyboard and mouse input.
// WASD or arrows to move, Shift to sneak, 1/2/3 for tools, P to pause, M to
// mute, R to restart, Enter to start. A mouse click walks the thief to that
// floor point, or throws the decoy when one is armed. One-shot actions are
// queued and consumed once by the engine, so a held key never double-fires.

export function createInput() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    sneak: false,
    clickPoint: null,
    queue: new Set(),
    consume(action) {
      if (!this.queue.has(action)) return false;
      this.queue.delete(action);
      return true;
    },
    press(action) {
      this.queue.add(action);
    },
  };
}

const KEY_ACTIONS = {
  Digit1: 'smoke',
  Digit2: 'emp',
  Digit3: 'decoy',
  Digit4: 'cutter',
  KeyP: 'pause',
  KeyM: 'mute',
  KeyR: 'restart',
  Enter: 'start',
  Space: 'start',
};

export function bindInput(input, canvas) {
  const keyState = { up: false, down: false, left: false, right: false, sneak: false };

  function sync() {
    input.up = keyState.up;
    input.down = keyState.down;
    input.left = keyState.left;
    input.right = keyState.right;
    input.sneak = keyState.sneak;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        keyState.up = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        keyState.down = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        keyState.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        keyState.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        keyState.sneak = true;
        break;
      default: {
        const action = KEY_ACTIONS[event.code];
        if (action) input.press(action);
      }
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    sync();
  });

  window.addEventListener('keyup', (event) => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        keyState.up = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        keyState.down = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        keyState.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        keyState.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        keyState.sneak = false;
        break;
      default:
        break;
    }
    sync();
  });

  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.clickPoint = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
    input.press('click');
  });
}
