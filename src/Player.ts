import * as THREE from 'three';

export class Player {
  public camera: THREE.PerspectiveCamera;
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public speedOfLight: number = 30.0;
  
  // Settings
  public acceleration: number = 10.0; // Units per second squared
  
  // State
  private euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private moveForward = false;
  private moveBackward = false;
  private brake = false;
  private lmbDown = false;
  
  private isLocked = false;

  // Touch State
  private leftTouchId: number | null = null;
  private rightTouchId: number | null = null;
  private leftTouchStartY: number = 0;
  private lastRightTouchX: number = 0;
  private lastRightTouchY: number = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    
    // Bind event listeners
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerlockChange);
    document.addEventListener('mousedown', (e) => { if (e.button === 0) this.lmbDown = true; });
    document.addEventListener('mouseup', (e) => { if (e.button === 0) this.lmbDown = false; });
    
    // Lock pointer on E key or click
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE') {
        if (!this.isLocked) {
          document.body.requestPointerLock();
        } else {
          document.exitPointerLock();
        }
      }
      
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.camera.position.y = 2.0;
        this.velocity.y = 0;
      }
    });
    
    document.body.addEventListener('click', () => {
      // Don't pointer lock on mobile devices
      if (!this.isLocked && !('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
        document.body.requestPointerLock();
      }
    });

    // Mobile specific setup
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) {
        const desktopHint = document.getElementById('desktop-hint');
        if (desktopHint) desktopHint.style.display = 'none';
        
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) mobileControls.style.display = 'flex';
        
        this.setupTouchControls();
    }
  }

  private setupTouchControls() {
    document.addEventListener('touchstart', this.onTouchStart, { passive: false });
    document.addEventListener('touchmove', this.onTouchMove, { passive: false });
    document.addEventListener('touchend', this.onTouchEnd);
    document.addEventListener('touchcancel', this.onTouchEnd);

    const btnBrake = document.getElementById('btn-brake');
    const btnFly = document.getElementById('btn-fly');
    const btnGround = document.getElementById('btn-ground');

    if (btnBrake) {
        btnBrake.addEventListener('touchstart', (e) => { e.preventDefault(); this.brake = true; });
        btnBrake.addEventListener('touchend', (e) => { e.preventDefault(); this.brake = false; });
    }
    if (btnFly) {
        btnFly.addEventListener('touchstart', (e) => { e.preventDefault(); this.lmbDown = true; });
        btnFly.addEventListener('touchend', (e) => { e.preventDefault(); this.lmbDown = false; });
    }
    if (btnGround) {
        btnGround.addEventListener('touchstart', (e) => { 
            e.preventDefault(); 
            this.camera.position.y = 2.0; 
            this.velocity.y = 0; 
        });
    }
  }

  private onTouchStart = (e: TouchEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.clientX < window.innerWidth / 2) {
            if (this.leftTouchId === null) {
                this.leftTouchId = touch.identifier;
                this.leftTouchStartY = touch.clientY;
            }
        } else {
            if (this.rightTouchId === null) {
                this.rightTouchId = touch.identifier;
                this.lastRightTouchX = touch.clientX;
                this.lastRightTouchY = touch.clientY;
            }
        }
    }
  }

  private onTouchMove = (e: TouchEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    if (e.cancelable) e.preventDefault(); // Prevent scrolling

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.leftTouchId) {
            const deltaY = touch.clientY - this.leftTouchStartY;
            if (deltaY < -30) {
                this.moveForward = true;
                this.moveBackward = false;
            } else if (deltaY > 30) {
                this.moveForward = false;
                this.moveBackward = true;
            } else {
                this.moveForward = false;
                this.moveBackward = false;
            }
        } else if (touch.identifier === this.rightTouchId) {
            const deltaX = touch.clientX - this.lastRightTouchX;
            const deltaY = touch.clientY - this.lastRightTouchY;
            
            this.euler.y -= deltaX * 0.005;
            this.euler.x -= deltaY * 0.005;
            this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
            this.camera.quaternion.setFromEuler(this.euler);
            
            this.lastRightTouchX = touch.clientX;
            this.lastRightTouchY = touch.clientY;
        }
    }
  }

  private onTouchEnd = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.leftTouchId) {
            this.leftTouchId = null;
            this.moveForward = false;
            this.moveBackward = false;
        } else if (touch.identifier === this.rightTouchId) {
            this.rightTouchId = null;
        }
    }
  }

  private onPointerlockChange = () => {
    this.isLocked = document.pointerLockElement === document.body;
  };

  private onKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW': this.moveForward = true; break;
      case 'KeyS': this.moveBackward = true; break;
      case 'Space': this.brake = true; break;
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW': this.moveForward = false; break;
      case 'KeyS': this.moveBackward = false; break;
      case 'Space': this.brake = false; break;
    }
  };

  private onMouseMove = (event: MouseEvent) => {
    if (!this.isLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    // Increased mouse sensitivity from 0.002 to 0.005
    this.euler.y -= movementX * 0.005;
    this.euler.x -= movementY * 0.005;

    // Constrain pitch
    this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
    this.camera.quaternion.setFromEuler(this.euler);
  };

  public update(delta: number) {
    // 1. Calculate desired thrust vector based on look direction
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);

    if (!this.lmbDown) {
        // Horizontal only by default
        direction.y = 0;
        if (direction.lengthSq() > 0.001) {
            direction.normalize();
        }
    }

    const thrust = new THREE.Vector3(0, 0, 0);
    if (this.moveForward) thrust.add(direction);
    if (this.moveBackward) thrust.sub(direction);
    
    if (thrust.lengthSq() > 0) {
      thrust.normalize();
      thrust.multiplyScalar(this.acceleration * delta);
      this.velocity.add(thrust);
    } 

    if (this.brake) {
        // Rapidly decelerate
        const speed = this.velocity.length();
        const drop = this.acceleration * 2.0 * delta;
        if (speed > 0) {
            const newSpeed = Math.max(0, speed - drop);
            this.velocity.multiplyScalar(newSpeed / speed);
        }
    }

    // Cap speed at 0.999c to prevent division by zero
    const maxSpeed = this.speedOfLight * 0.999;
    if (this.velocity.lengthSq() > maxSpeed * maxSpeed) {
      this.velocity.normalize().multiplyScalar(maxSpeed);
    }

    // 2. Update camera position based on velocity
    this.camera.position.addScaledVector(this.velocity, delta);

    // Don't go under ground
    if (this.camera.position.y < 2.0) {
        this.camera.position.y = 2.0;
        if (this.velocity.y < 0) this.velocity.y = 0;
    }
    
    // 3. Update UI
    this.updateUI();
  }

  private updateUI() {
    const speed = this.velocity.length();
    const c = this.speedOfLight;
    const beta = speed / c;
    const gamma = 1.0 / Math.sqrt(1.0 - beta * beta);

    const uiSpeed = document.getElementById('ui-speed');
    const uiGamma = document.getElementById('ui-gamma');

    if (uiSpeed) uiSpeed.innerText = beta.toFixed(3) + 'c';
    if (uiGamma) uiGamma.innerText = gamma.toFixed(3);
  }
}
