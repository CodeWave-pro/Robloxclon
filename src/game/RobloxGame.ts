import * as THREE from 'three';

export interface GameState {
  playerPosition: THREE.Vector3;
  playerRotation: number;
  placedBlocks: PlacedBlock[];
  selectedBlock: number;
  health: number;
  coins: number;
}

export interface PlacedBlock {
  position: THREE.Vector3;
  color: string;
  mesh: THREE.Mesh;
}

export class RobloxGame {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private player!: THREE.Group;
  private keys: { [key: string]: boolean } = {};
  private mouseDown = false;
  private rightMouseDown = false;
  private cameraAngleX = 0;
  private cameraAngleY = 0.5;
  private cameraDistance = 12;
  private playerVelocity = new THREE.Vector3();
  private isJumping = false;
  private gravity = -25;
  private jumpForce = 10;
  private playerY = 0;
  private placedBlocks: PlacedBlock[] = [];
  private selectedColorIndex = 0;
  private groundPlane: THREE.Mesh | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private ghostBlock: THREE.Mesh | null = null;
  private animationTime = 0;
  private trees: THREE.Group[] = [];
  private npcs: { group: THREE.Group; direction: THREE.Vector3; speed: number; changeTimer: number }[] = [];
  private particles: { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number }[] = [];
  private dayTime = 0;
  private sunLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private skyColor = new THREE.Color(0x87CEEB);
  private onStateUpdate: ((state: Partial<GameState>) => void) | null = null;
  private health = 100;
  private coins = 50;
  private collectibles: THREE.Mesh[] = [];
  private container!: HTMLElement;
  private isPointerLocked = false;
  private blockColors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#e67e22', '#ecf0f1', '#34495e', '#f1c40f'
  ];
  private isRunning = false;
  private lastTime = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = this.skyColor;
    this.scene.fog = new THREE.Fog(0x87CEEB, 80, 200);

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 500);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.sunLight.position.set(50, 80, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 200;
    this.sunLight.shadow.camera.left = -60;
    this.sunLight.shadow.camera.right = 60;
    this.sunLight.shadow.camera.top = 60;
    this.sunLight.shadow.camera.bottom = -60;
    this.scene.add(this.sunLight);

    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x44aa44, 0.3);
    this.scene.add(hemiLight);

    // Create world
    this.createGround();
    this.createPlayer();
    this.createEnvironment();
    this.createNPCs();
    this.createCollectibles();
    this.createGhostBlock();

    // Events
    this.setupEvents();

    // Start loop
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animate();
  }

  private createGround() {
    // Main ground
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.receiveShadow = true;
    this.scene.add(this.groundPlane);

    // Grid pattern
    const gridHelper = new THREE.GridHelper(200, 100, 0x3d8b40, 0x3d8b40);
    gridHelper.position.y = 0.01;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    (gridHelper.material as THREE.Material).transparent = true;
    this.scene.add(gridHelper);

    // Roads
    this.createRoad(0, 0, 200, 6, 0);
    this.createRoad(0, 0, 6, 200, Math.PI / 2);
  }

  private createRoad(x: number, z: number, width: number, length: number, rotation: number) {
    const roadGeo = new THREE.PlaneGeometry(width, length);
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = rotation;
    road.position.set(x, 0.02, z);
    road.receiveShadow = true;
    this.scene.add(road);
  }

  private createPlayer() {
    this.player = new THREE.Group();
    
    // Body (torso)
    const bodyGeo = new THREE.BoxGeometry(1.2, 1.4, 0.8);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2196F3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 2.2;
    body.castShadow = true;
    this.player.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xFFDBAC });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 3.4;
    head.castShadow = true;
    this.player.add(head);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.15, 0.15, 0.1);
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.2, 3.5, 0.5);
    this.player.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.2, 3.5, 0.5);
    this.player.add(rightEye);

    // Smile
    const smileGeo = new THREE.BoxGeometry(0.4, 0.08, 0.1);
    const smileMat = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const smile = new THREE.Mesh(smileGeo, smileMat);
    smile.position.set(0, 3.25, 0.5);
    this.player.add(smile);

    // Left arm
    const armGeo = new THREE.BoxGeometry(0.5, 1.3, 0.5);
    const armMat = new THREE.MeshLambertMaterial({ color: 0xFFDBAC });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.85, 2.2, 0);
    leftArm.castShadow = true;
    leftArm.name = 'leftArm';
    this.player.add(leftArm);

    // Right arm
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.85, 2.2, 0);
    rightArm.castShadow = true;
    rightArm.name = 'rightArm';
    this.player.add(rightArm);

    // Left leg
    const legGeo = new THREE.BoxGeometry(0.5, 1.2, 0.5);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x1a1a2e });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.3, 0.9, 0);
    leftLeg.castShadow = true;
    leftLeg.name = 'leftLeg';
    this.player.add(leftLeg);

    // Right leg
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.3, 0.9, 0);
    rightLeg.castShadow = true;
    rightLeg.name = 'rightLeg';
    this.player.add(rightLeg);

    // Name tag
    this.player.position.set(0, 0, 10);
    this.scene.add(this.player);
  }

  private createEnvironment() {
    // Trees
    const treePositions = [
      [-15, -15], [-20, 10], [15, -20], [25, 15], [-30, -25],
      [30, -10], [-10, 30], [20, 30], [-25, 20], [35, -30],
      [-35, 5], [10, -35], [-5, -40], [40, 25], [-40, -15]
    ];

    treePositions.forEach(([x, z]) => {
      this.createTree(x, z);
    });

    // Buildings
    this.createBuilding(-30, -30, 8, 12, 8, 0xE74C3C);
    this.createBuilding(30, -25, 10, 8, 10, 0x3498DB);
    this.createBuilding(-25, 30, 6, 15, 6, 0x9B59B6);
    this.createBuilding(35, 30, 12, 6, 8, 0xF39C12);

    // Spawn platform
    const spawnGeo = new THREE.CylinderGeometry(4, 4, 0.3, 32);
    const spawnMat = new THREE.MeshLambertMaterial({ color: 0x00BCD4 });
    const spawn = new THREE.Mesh(spawnGeo, spawnMat);
    spawn.position.set(0, 0.15, 10);
    spawn.receiveShadow = true;
    this.scene.add(spawn);

    // Ramp
    const rampGeo = new THREE.BoxGeometry(4, 0.3, 8);
    const rampMat = new THREE.MeshLambertMaterial({ color: 0xFF9800 });
    const ramp = new THREE.Mesh(rampGeo, rampMat);
    ramp.position.set(8, 1, 5);
    ramp.rotation.x = -0.2;
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    this.scene.add(ramp);

    // Water area
    const waterGeo = new THREE.PlaneGeometry(20, 20);
    const waterMat = new THREE.MeshLambertMaterial({ 
      color: 0x2196F3, 
      transparent: true, 
      opacity: 0.6 
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(-40, 0.05, 40);
    this.scene.add(water);
  }

  private createTree(x: number, z: number) {
    const tree = new THREE.Group();
    
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    tree.add(trunk);

    // Leaves (multiple spheres for fuller look)
    const leavesMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    
    const leaves1Geo = new THREE.SphereGeometry(2, 8, 8);
    const leaves1 = new THREE.Mesh(leaves1Geo, leavesMat);
    leaves1.position.y = 4.5;
    leaves1.castShadow = true;
    tree.add(leaves1);

    const leaves2Geo = new THREE.SphereGeometry(1.5, 8, 8);
    const leaves2 = new THREE.Mesh(leaves2Geo, leavesMat);
    leaves2.position.set(0.8, 5.5, 0.5);
    leaves2.castShadow = true;
    tree.add(leaves2);

    const leaves3Geo = new THREE.SphereGeometry(1.3, 8, 8);
    const leaves3 = new THREE.Mesh(leaves3Geo, leavesMat);
    leaves3.position.set(-0.5, 5.8, -0.3);
    leaves3.castShadow = true;
    tree.add(leaves3);

    tree.position.set(x, 0, z);
    this.scene.add(tree);
    this.trees.push(tree);
  }

  private createBuilding(x: number, z: number, w: number, h: number, d: number, color: number) {
    const building = new THREE.Group();
    
    // Main structure
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    building.add(body);

    // Windows
    const windowMat = new THREE.MeshLambertMaterial({ color: 0xFFFF99, emissive: 0x444400 });
    const windowGeo = new THREE.BoxGeometry(1, 1.2, 0.1);
    
    for (let wy = 2; wy < h - 1; wy += 3) {
      for (let wx = -w/2 + 1.5; wx < w/2 - 1; wx += 2.5) {
        const win = new THREE.Mesh(windowGeo, windowMat);
        win.position.set(wx, wy, d / 2 + 0.05);
        building.add(win);
        
        const win2 = new THREE.Mesh(windowGeo, windowMat);
        win2.position.set(wx, wy, -d / 2 - 0.05);
        building.add(win2);
      }
    }

    // Roof
    const roofGeo = new THREE.BoxGeometry(w + 0.5, 0.5, d + 0.5);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = h + 0.25;
    roof.castShadow = true;
    building.add(roof);

    building.position.set(x, 0, z);
    this.scene.add(building);
  }

  private createNPCs() {
    const npcColors = [0xFF5722, 0x9C27B0, 0x00BCD4, 0xFF9800, 0xCDDC39];
    
    for (let i = 0; i < 5; i++) {
      const npc = new THREE.Group();
      
      // Body
      const bodyGeo = new THREE.BoxGeometry(1, 1.2, 0.7);
      const bodyMat = new THREE.MeshLambertMaterial({ color: npcColors[i] });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 2;
      body.castShadow = true;
      npc.add(body);

      // Head
      const headGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
      const headMat = new THREE.MeshLambertMaterial({ color: 0xFFDBAC });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 3.1;
      head.castShadow = true;
      npc.add(head);

      // Legs
      const legGeo = new THREE.BoxGeometry(0.4, 1, 0.4);
      const legMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
      const leftLeg = new THREE.Mesh(legGeo, legMat);
      leftLeg.position.set(-0.25, 0.8, 0);
      npc.add(leftLeg);
      const rightLeg = new THREE.Mesh(legGeo, legMat);
      rightLeg.position.set(0.25, 0.8, 0);
      npc.add(rightLeg);

      const angle = (i / 5) * Math.PI * 2;
      const radius = 15 + Math.random() * 10;
      npc.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      
      this.scene.add(npc);
      this.npcs.push({
        group: npc,
        direction: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
        speed: 1 + Math.random() * 2,
        changeTimer: Math.random() * 3
      });
    }
  }

  private createCollectibles() {
    const coinGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
    const coinMat = new THREE.MeshLambertMaterial({ color: 0xFFD700, emissive: 0x443300 });
    
    for (let i = 0; i < 20; i++) {
      const coin = new THREE.Mesh(coinGeo, coinMat);
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 35;
      coin.position.set(
        Math.cos(angle) * radius,
        1.5,
        Math.sin(angle) * radius
      );
      coin.rotation.x = Math.PI / 2;
      coin.castShadow = true;
      this.scene.add(coin);
      this.collectibles.push(coin);
    }
  }

  private createGhostBlock() {
    const geo = new THREE.BoxGeometry(2, 2, 2);
    const mat = new THREE.MeshBasicMaterial({ 
      color: this.blockColors[this.selectedColorIndex],
      transparent: true,
      opacity: 0.4,
      wireframe: false
    });
    this.ghostBlock = new THREE.Mesh(geo, mat);
    this.ghostBlock.visible = false;
    this.scene.add(this.ghostBlock);
  }

  private setupEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === ' ') {
        e.preventDefault();
        if (!this.isJumping) {
          this.isJumping = true;
          this.playerVelocity.y = this.jumpForce;
        }
      }
      if (e.key === 'Shift') {
        this.isRunning = true;
      }
      // Number keys for block selection
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        this.selectedColorIndex = num - 1;
        this.updateGhostBlockColor();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      if (e.key === 'Shift') {
        this.isRunning = false;
      }
    });

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        if (!this.isPointerLocked) {
          this.renderer.domElement.requestPointerLock();
        } else {
          this.mouseDown = true;
          this.placeBlock();
        }
      }
      if (e.button === 2) {
        this.rightMouseDown = true;
        this.removeBlock();
      }
    });

    this.renderer.domElement.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightMouseDown = false;
    });

    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
    });

    this.renderer.domElement.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.cameraAngleX -= e.movementX * 0.003;
        this.cameraAngleY = Math.max(0.1, Math.min(1.2, this.cameraAngleY - e.movementY * 0.003));
      } else {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      }
    });

    this.renderer.domElement.addEventListener('wheel', (e) => {
      this.cameraDistance = Math.max(5, Math.min(25, this.cameraDistance + e.deltaY * 0.01));
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });
  }

  private updateGhostBlockColor() {
    if (this.ghostBlock) {
      (this.ghostBlock.material as THREE.MeshBasicMaterial).color.set(this.blockColors[this.selectedColorIndex]);
    }
  }

  private placeBlock() {
    if (!this.ghostBlock || !this.ghostBlock.visible) return;
    
    const pos = this.ghostBlock.position.clone();
    const geo = new THREE.BoxGeometry(2, 2, 2);
    const mat = new THREE.MeshLambertMaterial({ color: this.blockColors[this.selectedColorIndex] });
    const block = new THREE.Mesh(geo, mat);
    block.position.copy(pos);
    block.castShadow = true;
    block.receiveShadow = true;
    this.scene.add(block);
    this.placedBlocks.push({ position: pos, color: this.blockColors[this.selectedColorIndex], mesh: block });
    
    // Particle effect
    this.spawnParticles(pos, this.blockColors[this.selectedColorIndex]);
  }

  private removeBlock() {
    if (this.placedBlocks.length === 0) return;
    
    const lastBlock = this.placedBlocks[this.placedBlocks.length - 1];
    this.scene.remove(lastBlock.mesh);
    this.placedBlocks.pop();
  }

  private spawnParticles(position: THREE.Vector3, color: string) {
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const mat = new THREE.MeshBasicMaterial({ color });
      const particle = new THREE.Mesh(geo, mat);
      particle.position.copy(position);
      this.scene.add(particle);
      this.particles.push({
        mesh: particle,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          Math.random() * 5 + 2,
          (Math.random() - 0.5) * 5
        ),
        life: 1.0
      });
    }
  }

  private updatePlayer(dt: number) {
    const speed = this.isRunning ? 14 : 8;
    const moveDir = new THREE.Vector3();

    if (this.keys['w']) moveDir.z -= 1;
    if (this.keys['s']) moveDir.z += 1;
    if (this.keys['a']) moveDir.x -= 1;
    if (this.keys['d']) moveDir.x += 1;

    if (moveDir.length() > 0) {
      moveDir.normalize();
      // Rotate movement direction by camera angle
      const rotatedDir = new THREE.Vector3(
        moveDir.x * Math.cos(this.cameraAngleX) - moveDir.z * Math.sin(this.cameraAngleX),
        0,
        moveDir.x * Math.sin(this.cameraAngleX) + moveDir.z * Math.cos(this.cameraAngleX)
      );
      
      this.player.position.x += rotatedDir.x * speed * dt;
      this.player.position.z += rotatedDir.z * speed * dt;
      
      // Rotate player to face movement direction
      const targetAngle = Math.atan2(rotatedDir.x, rotatedDir.z);
      this.player.rotation.y = targetAngle;

      // Walking animation
      this.animationTime += dt * (this.isRunning ? 12 : 8);
      const leftArm = this.player.getObjectByName('leftArm');
      const rightArm = this.player.getObjectByName('rightArm');
      const leftLeg = this.player.getObjectByName('leftLeg');
      const rightLeg = this.player.getObjectByName('rightLeg');
      
      if (leftArm && rightArm && leftLeg && rightLeg) {
        leftArm.rotation.x = Math.sin(this.animationTime) * 0.8;
        rightArm.rotation.x = -Math.sin(this.animationTime) * 0.8;
        leftLeg.rotation.x = -Math.sin(this.animationTime) * 0.6;
        rightLeg.rotation.x = Math.sin(this.animationTime) * 0.6;
      }
    } else {
      // Reset animation
      const leftArm = this.player.getObjectByName('leftArm');
      const rightArm = this.player.getObjectByName('rightArm');
      const leftLeg = this.player.getObjectByName('leftLeg');
      const rightLeg = this.player.getObjectByName('rightLeg');
      if (leftArm) leftArm.rotation.x *= 0.9;
      if (rightArm) rightArm.rotation.x *= 0.9;
      if (leftLeg) leftLeg.rotation.x *= 0.9;
      if (rightLeg) rightLeg.rotation.x *= 0.9;
    }

    // Gravity & jumping
    this.playerVelocity.y += this.gravity * dt;
    this.playerY += this.playerVelocity.y * dt;

    if (this.playerY <= 0) {
      this.playerY = 0;
      this.playerVelocity.y = 0;
      this.isJumping = false;
    }

    this.player.position.y = this.playerY;

    // Boundary
    this.player.position.x = Math.max(-95, Math.min(95, this.player.position.x));
    this.player.position.z = Math.max(-95, Math.min(95, this.player.position.z));
  }

  private updateCamera() {
    const playerPos = this.player.position.clone();
    playerPos.y += 3;

    const camX = playerPos.x + Math.sin(this.cameraAngleX) * Math.cos(this.cameraAngleY) * this.cameraDistance;
    const camY = playerPos.y + Math.sin(this.cameraAngleY) * this.cameraDistance;
    const camZ = playerPos.z + Math.cos(this.cameraAngleX) * Math.cos(this.cameraAngleY) * this.cameraDistance;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(playerPos);
  }

  private updateNPCs(dt: number) {
    this.npcs.forEach(npc => {
      npc.changeTimer -= dt;
      if (npc.changeTimer <= 0) {
        npc.direction = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
        npc.changeTimer = 2 + Math.random() * 4;
      }

      npc.group.position.x += npc.direction.x * npc.speed * dt;
      npc.group.position.z += npc.direction.z * npc.speed * dt;

      // Keep in bounds
      if (Math.abs(npc.group.position.x) > 40) npc.direction.x *= -1;
      if (Math.abs(npc.group.position.z) > 40) npc.direction.z *= -1;

      // Face direction
      npc.group.rotation.y = Math.atan2(npc.direction.x, npc.direction.z);
    });
  }

  private updateCollectibles(dt: number) {
    const playerPos = this.player.position;
    
    this.collectibles = this.collectibles.filter(coin => {
      coin.rotation.z += dt * 3;
      coin.position.y = 1.5 + Math.sin(Date.now() * 0.003 + coin.position.x) * 0.3;

      const dist = coin.position.distanceTo(playerPos.clone().add(new THREE.Vector3(0, 1, 0)));
      if (dist < 2) {
        this.scene.remove(coin);
        this.coins += 10;
        this.spawnParticles(coin.position.clone(), '#FFD700');
        if (this.onStateUpdate) {
          this.onStateUpdate({ coins: this.coins });
        }
        return false;
      }
      return true;
    });
  }

  private updateParticles(dt: number) {
    this.particles = this.particles.filter(p => {
      p.velocity.y -= 10 * dt;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
      p.life -= dt * 2;
      p.mesh.scale.setScalar(p.life);
      
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        return false;
      }
      return true;
    });
  }

  private updateGhostBlockPosition() {
    if (!this.ghostBlock) return;

    if (this.isPointerLocked) {
      // Place block in front of player
      const dir = new THREE.Vector3(0, 0, -1);
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotation.y);
      
      const pos = this.player.position.clone().add(dir.multiplyScalar(4));
      pos.x = Math.round(pos.x / 2) * 2;
      pos.y = Math.max(1, Math.round(pos.y / 2) * 2);
      pos.z = Math.round(pos.z / 2) * 2;
      
      this.ghostBlock.position.copy(pos);
      this.ghostBlock.visible = true;
    } else {
      this.ghostBlock.visible = false;
    }
  }

  private updateDayNight(dt: number) {
    this.dayTime += dt * 0.02;
    const sunAngle = this.dayTime;
    
    this.sunLight.position.set(
      Math.cos(sunAngle) * 80,
      Math.sin(sunAngle) * 80 + 20,
      50
    );

    const intensity = Math.max(0.3, Math.sin(sunAngle));
    this.sunLight.intensity = intensity;
    this.ambientLight.intensity = 0.3 + intensity * 0.3;
  }

  private animate = () => {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.updatePlayer(dt);
    this.updateCamera();
    this.updateNPCs(dt);
    this.updateCollectibles(dt);
    this.updateParticles(dt);
    this.updateGhostBlockPosition();
    this.updateDayNight(dt);

    this.renderer.render(this.scene, this.camera);
  }

  setSelectedColor(index: number) {
    this.selectedColorIndex = index;
    this.updateGhostBlockColor();
  }

  getBlockColors() {
    return this.blockColors;
  }

  setOnStateUpdate(callback: (state: Partial<GameState>) => void) {
    this.onStateUpdate = callback;
  }

  getPlayerPosition() {
    return this.player.position.clone();
  }

  destroy() {
    this.isRunning = false;
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
