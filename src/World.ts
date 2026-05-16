import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RelativityShader } from './RelativityShader';

export class World {
  public scene: THREE.Scene;
  private cars: { position: THREE.Vector3, speed: number, direction: THREE.Vector3 }[] = [];
  
  private loader = new GLTFLoader();
  private buildingModel: THREE.Group | null = null;
  private buggyModel: THREE.Group | null = null;
  private buggyInstancedMeshes: THREE.InstancedMesh[] = [];

  public videoElement: HTMLVideoElement | null = null;
  public videoMesh: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loadModels().then(() => {
      this.buildCity();
    });
  }

  private async loadModels() {
    return Promise.all([
      new Promise<void>((resolve) => {
        this.loader.load(import.meta.env.BASE_URL + 'models/building.glb', (gltf) => {
          this.buildingModel = gltf.scene;
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const size = box.getSize(new THREE.Vector3());
          const scale = 1.0 / size.y;
          this.buildingModel.scale.setScalar(scale);
          resolve();
        });
      }),
      new Promise<void>((resolve) => {
        this.loader.load(import.meta.env.BASE_URL + 'models/CesiumMilkTruck.glb', (gltf) => {
          this.buggyModel = gltf.scene;
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const size = box.getSize(new THREE.Vector3());
          const scale = 4.0 / size.z;
          this.buggyModel.scale.setScalar(scale);
          resolve();
        });
      })
    ]);
  }

  private loadTexture(url: string, repeatU: number, repeatV: number): THREE.Texture {
    const loader = new THREE.TextureLoader();
    const texture = loader.load(url);
    if (repeatU > 1 || repeatV > 1) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatU, repeatV);
    }
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private extractMeshes(group: THREE.Group): { geometry: THREE.BufferGeometry, material: THREE.Material }[] {
    const meshes: { geometry: THREE.BufferGeometry, material: THREE.Material }[] = [];
    group.updateMatrixWorld(true);
    group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            const geom = child.geometry.clone();
            geom.applyMatrix4(child.matrixWorld);
            const mat = child.material.clone();
            mat.onBeforeCompile = (shader: any) => RelativityShader.inject(shader);
            meshes.push({ geometry: geom, material: mat });
        }
    });
    return meshes;
  }

  private buildCity() {
    const roadTex = this.loadTexture(import.meta.env.BASE_URL + 'textures/road.png', 1, 500);
    const grassTex = this.loadTexture(import.meta.env.BASE_URL + 'textures/grass.png', 500, 500);
    
    // Billboard Textures
    const geminiTex = this.loadTexture(import.meta.env.BASE_URL + 'textures/gemini.png', 1, 1);
    const chatgptTex = this.loadTexture(import.meta.env.BASE_URL + 'textures/chatgpt.png', 1, 1);
    const claudeTex = this.loadTexture(import.meta.env.BASE_URL + 'textures/claude.png', 1, 1);

    const groundGeo = new THREE.PlaneGeometry(10000, 10000, 200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ map: grassTex });
    groundMat.onBeforeCompile = (shader: any) => RelativityShader.inject(shader);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.frustumCulled = false;
    this.scene.add(ground);

    const roadGeo = new THREE.PlaneGeometry(20, 10000, 2, 200);
    const roadMat = new THREE.MeshStandardMaterial({ map: roadTex });
    roadMat.onBeforeCompile = (shader: any) => RelativityShader.inject(shader);
    
    const street1 = new THREE.Mesh(roadGeo, roadMat);
    street1.rotation.x = -Math.PI / 2;
    street1.position.y = 0.1;
    street1.frustumCulled = false;
    this.scene.add(street1);

    const street2 = new THREE.Mesh(roadGeo, roadMat);
    street2.rotation.x = -Math.PI / 2;
    street2.rotation.z = Math.PI / 2;
    street2.position.y = 0.1;
    street2.frustumCulled = false;
    this.scene.add(street2);

    // Add Huge Animated Video Billboard
    this.videoElement = document.createElement('video');
    this.videoElement.src = import.meta.env.BASE_URL + 'textures/video.mp4';
    this.videoElement.loop = true;
    this.videoElement.muted = true;
    this.videoElement.play().catch(e => console.warn("Video autoplay blocked", e));
    
    const videoTex = new THREE.VideoTexture(this.videoElement);
    videoTex.colorSpace = THREE.SRGBColorSpace;
    // We make it highly subdivided so the geometric distortion (Terrell rotation) is extremely obvious
    const videoGeo = new THREE.PlaneGeometry(400, 225, 100, 100); 
    const videoMat = new THREE.MeshBasicMaterial({ map: videoTex, side: THREE.DoubleSide });
    videoMat.onBeforeCompile = (shader: any) => RelativityShader.inject(shader);
    
    this.videoMesh = new THREE.Mesh(videoGeo, videoMat);
    this.videoMesh.position.set(0, 150, -1200); // End of the street
    this.videoMesh.frustumCulled = false;
    this.scene.add(this.videoMesh);

    const buildingTransforms: THREE.Matrix4[] = [];
    const geminiTransforms: THREE.Matrix4[] = [];
    const chatgptTransforms: THREE.Matrix4[] = [];
    const claudeTransforms: THREE.Matrix4[] = [];

    for (let i = 0; i < 500; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;

      if (Math.abs(x) < 25 || Math.abs(z) < 25) continue; 
      // Don't place buildings directly in front of the giant video billboard
      if (Math.abs(x) < 200 && z < -1000) continue; 

      if (this.buildingModel) {
        const width = 10 + Math.random() * 20;
        const depth = 10 + Math.random() * 20;
        const height = 20 + Math.random() * 100;
        const rotY = Math.floor(Math.random() * 4) * (Math.PI / 2);

        const m = new THREE.Matrix4();
        const position = new THREE.Vector3(x, 0, z);
        const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), rotY);
        const scale = new THREE.Vector3(width, height, depth);
        m.compose(position, quaternion, scale);
        buildingTransforms.push(m);
        
        if (Math.random() > 0.7) {
            const bMat = new THREE.Matrix4();
            const bScale = new THREE.Vector3(20, 20, 1);
            const offsetDist = (depth / 2) + 0.5;
            
            const faceRot = Math.floor(Math.random() * 4) * (Math.PI / 2);
            const bPos = new THREE.Vector3(x, height / 2, z);
            const offset = new THREE.Vector3(0, 0, offsetDist);
            offset.applyAxisAngle(new THREE.Vector3(0,1,0), rotY + faceRot);
            bPos.add(offset);
            
            const bQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), rotY + faceRot);
            bMat.compose(bPos, bQuat, bScale);
            
            const r = Math.random();
            if (r < 0.33) geminiTransforms.push(bMat);
            else if (r < 0.66) chatgptTransforms.push(bMat);
            else claudeTransforms.push(bMat);
        }
      }
    }

    if (this.buildingModel) {
      const buildingMeshes = this.extractMeshes(this.buildingModel);
      for (const { geometry, material } of buildingMeshes) {
        const instancedMesh = new THREE.InstancedMesh(geometry, material, buildingTransforms.length);
        instancedMesh.frustumCulled = false;
        for (let i = 0; i < buildingTransforms.length; i++) {
          instancedMesh.setMatrixAt(i, buildingTransforms[i]);
        }
        this.scene.add(instancedMesh);
      }
    }
    
    // Add Billboards
    const billboardGeo = new THREE.PlaneGeometry(1, 1, 20, 20);
    const addBillboardType = (tex: THREE.Texture, transforms: THREE.Matrix4[]) => {
        if (transforms.length === 0) return;
        const mat = new THREE.MeshBasicMaterial({ map: tex });
        mat.onBeforeCompile = (shader: any) => RelativityShader.inject(shader);
        const im = new THREE.InstancedMesh(billboardGeo, mat, transforms.length);
        im.frustumCulled = false;
        for (let i = 0; i < transforms.length; i++) {
            im.setMatrixAt(i, transforms[i]);
        }
        this.scene.add(im);
    };
    
    addBillboardType(geminiTex, geminiTransforms);
    addBillboardType(chatgptTex, chatgptTransforms);
    addBillboardType(claudeTex, claudeTransforms);

    if (this.buggyModel) {
      const numBuggies = 50;
      const buggyMeshes = this.extractMeshes(this.buggyModel);
      for (const { geometry, material } of buggyMeshes) {
        const instancedMesh = new THREE.InstancedMesh(geometry, material, numBuggies);
        instancedMesh.frustumCulled = false;
        
        const velocityArray = new Float32Array(numBuggies * 3);
        instancedMesh.geometry.setAttribute('instanceVelocity', new THREE.InstancedBufferAttribute(velocityArray, 3));
        
        this.scene.add(instancedMesh);
        this.buggyInstancedMeshes.push(instancedMesh);
      }

      for (let i = 0; i < numBuggies; i++) {
        const onStreet1 = Math.random() > 0.5;
        let dirVec = new THREE.Vector3();
        let pos = new THREE.Vector3();
        if (onStreet1) {
          const lane = Math.random() > 0.5 ? 5 : -5;
          pos.set(lane, 0, (Math.random() - 0.5) * 2000);
          const dirZ = lane > 0 ? 1 : -1;
          dirVec.set(0, 0, dirZ);
        } else {
          const lane = Math.random() > 0.5 ? 5 : -5;
          pos.set((Math.random() - 0.5) * 2000, 0, lane);
          const dirX = lane > 0 ? -1 : 1;
          dirVec.set(dirX, 0, 0);
        }
        
        this.cars.push({
          position: pos,
          speed: 5 + Math.random() * 10, 
          direction: dirVec
        });
      }
      this.updateCarsMatrix();
    }
  }

  private updateCarsMatrix() {
    for (let i = 0; i < this.cars.length; i++) {
      const car = this.cars[i];
      const m = new THREE.Matrix4();
      
      let rotY = 0;
      if (car.direction.x === 1) rotY = Math.PI / 2;
      else if (car.direction.x === -1) rotY = -Math.PI / 2;
      else if (car.direction.z === 1) rotY = 0;
      else if (car.direction.z === -1) rotY = Math.PI;

      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), rotY);
      m.compose(car.position, q, new THREE.Vector3(1,1,1));
      
      const vX = car.direction.x * car.speed;
      const vY = car.direction.y * car.speed;
      const vZ = car.direction.z * car.speed;
      
      for (const im of this.buggyInstancedMeshes) {
        im.setMatrixAt(i, m);
        const velocityAttr = im.geometry.getAttribute('instanceVelocity') as THREE.InstancedBufferAttribute;
        velocityAttr.setXYZ(i, vX, vY, vZ);
        velocityAttr.needsUpdate = true;
      }
    }
    for (const im of this.buggyInstancedMeshes) {
      im.instanceMatrix.needsUpdate = true;
    }
  }

  public update(delta: number, playerCamera?: THREE.Camera, playerVelocity?: THREE.Vector3, c?: number) {
    if (this.cars.length > 0) {
      for (const car of this.cars) {
        car.position.addScaledVector(car.direction, car.speed * delta);
        if (car.position.z > 1000) car.position.z = -1000;
        if (car.position.z < -1000) car.position.z = 1000;
        if (car.position.x > 1000) car.position.x = -1000;
        if (car.position.x < -1000) car.position.x = 1000;
      }
      this.updateCarsMatrix();
    }

    // Update Video Doppler Playback Rate
    if (this.videoElement && this.videoMesh && playerCamera && playerVelocity && c) {
        const r = new THREE.Vector3().subVectors(this.videoMesh.position, playerCamera.position);
        const r_len = r.length();
        
        const beta = playerVelocity.clone().divideScalar(c);
        const b2 = Math.min(beta.lengthSq(), 0.999999);
        const gamma = 1.0 / Math.sqrt(1.0 - b2);
        
        let r_prime = r.clone();
        if (b2 > 1e-6) {
            const gamma_m1_b2 = (gamma - 1.0) / b2;
            const dot_beta_r = beta.dot(r);
            const term2 = beta.clone().multiplyScalar(gamma_m1_b2 * dot_beta_r);
            const term3 = beta.clone().multiplyScalar(gamma * r_len);
            r_prime.add(term2).add(term3);
        }
        
        const r_prime_dir = r_prime.clone().normalize();
        const doppler = 1.0 / (gamma * (1.0 - beta.dot(r_prime_dir) + 1e-6));
        
        // Browsers restrict playbackRate typically between 0.0625 and 16.0
        const rate = Math.max(0.0625, Math.min(16.0, doppler));
        
        // Prevent setting playback rate identically if not needed (performance)
        if (Math.abs(this.videoElement.playbackRate - rate) > 0.01) {
             this.videoElement.playbackRate = rate;
        }
    }
  }
}
