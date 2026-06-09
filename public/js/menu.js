import * as THREE from "three";

const CARD_FACES = [
  "assets/cards/red.png",
  "assets/cards/blue.png",
  "assets/cards/b.png",
  "assets/cards/white.png",
  "assets/cards/bu.png",
  "assets/cards/wo.png"
];

export class MenuScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.fireflies = [];
    this._init();
  }

  _init() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x06160d, 0.045);
    this.scene.background = new THREE.Color(0x05110a);

    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 200);
    this.camera.position.set(0, 3.2, 9);
    this.camera.lookAt(0, 2.2, 0);

    this._buildLights();
    this._buildGround();
    this._buildForest();
    this._buildFireflies();
    this._buildCard();

    window.addEventListener("resize", () => this._onResize());
  }

  _buildLights() {
    const ambient = new THREE.AmbientLight(0x21384a, 0.7);
    this.scene.add(ambient);

    const moon = new THREE.DirectionalLight(0x9fc6ff, 1.1);
    moon.position.set(-8, 14, -6);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.camera.near = 1;
    moon.shadow.camera.far = 60;
    moon.shadow.camera.left = -20;
    moon.shadow.camera.right = 20;
    moon.shadow.camera.top = 20;
    moon.shadow.camera.bottom = -20;
    this.scene.add(moon);

    this.cardLight = new THREE.PointLight(0xffd98a, 2.4, 22, 2);
    this.cardLight.position.set(0, 3.4, 2.6);
    this.scene.add(this.cardLight);
  }

  _buildGround() {
    const geo = new THREE.PlaneGeometry(120, 120, 60, 60);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const d = Math.sqrt(x * x + y * y);
      const z = Math.sin(x * 0.4) * 0.25 + Math.cos(y * 0.5) * 0.25 - d * 0.02;
      pos.setZ(i, z);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x132c1c,
      roughness: 1,
      metalness: 0
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  _makeTree(x, z, scale) {
    const tree = new THREE.Group();

    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 1.4, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.7;
    trunk.castShadow = true;
    tree.add(trunk);

    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1f4a2e, roughness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const r = 0.95 - i * 0.22;
      const conGeo = new THREE.ConeGeometry(r, 1.1, 7);
      const cone = new THREE.Mesh(conGeo, foliageMat);
      cone.position.y = 1.3 + i * 0.6;
      cone.castShadow = true;
      tree.add(cone);
    }

    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    tree.rotation.y = Math.random() * Math.PI;
    return tree;
  }

  _buildForest() {
    const count = 26;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 7 + Math.random() * 16;
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad - 4;
      const scale = 0.8 + Math.random() * 1.4;
      this.scene.add(this._makeTree(x, z, scale));
    }
  }

  _buildFireflies() {
    const count = 140;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this.fireData = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 30;
      const y = Math.random() * 6 + 0.5;
      const z = (Math.random() - 0.5) * 26 - 2;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      this.fireData.push({ baseY: y, speed: 0.3 + Math.random() * 0.8, phase: Math.random() * Math.PI * 2 });
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffe39b,
      size: 0.12,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.fireflyPoints = new THREE.Points(geo, mat);
    this.scene.add(this.fireflyPoints);
  }

  _buildCard() {
    const loader = new THREE.TextureLoader();
    const front = loader.load(CARD_FACES[Math.floor(Math.random() * CARD_FACES.length)]);
    front.colorSpace = THREE.SRGBColorSpace;

    const backTex = this._makeCardBack();

    const ww = 2.0;
    const hh = 3.2;
    const group = new THREE.Group();

    const frontMat = new THREE.MeshStandardMaterial({ map: front, roughness: 0.5, metalness: 0.1 });
    const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.5, metalness: 0.2 });
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.8 });

    const frontPlane = new THREE.Mesh(new THREE.PlaneGeometry(ww, hh), frontMat);
    frontPlane.position.z = 0.03;
    frontPlane.castShadow = true;

    const backPlane = new THREE.Mesh(new THREE.PlaneGeometry(ww, hh), backMat);
    backPlane.position.z = -0.03;
    backPlane.rotation.y = Math.PI;

    const core = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, 0.05), edgeMat);

    group.add(core, frontPlane, backPlane);
    group.position.set(0, 3.2, 1.5);
    this.card = group;
    this.scene.add(group);
  }

  _makeCardBack() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 410;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, c.height);
    g.addColorStop(0, "#0e2c1c");
    g.addColorStop(1, "#06160d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#e8c06a";
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, c.width - 24, c.height - 24);
    ctx.strokeStyle = "rgba(232,192,106,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, c.width - 48, c.height - 48);
    ctx.fillStyle = "#e8c06a";
    ctx.font = "bold 120px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("D", c.width / 2, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  start() {
    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      this._update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  _update() {
    const t = this.clock.getElapsedTime();

    this.camera.position.x = Math.sin(t * 0.15) * 1.6;
    this.camera.position.y = 3.2 + Math.sin(t * 0.3) * 0.15;
    this.camera.lookAt(0, 2.6, 0);

    if (this.card) {
      this.card.rotation.y = t * 0.6;
      this.card.position.y = 3.2 + Math.sin(t * 1.2) * 0.12;
    }

    if (this.fireflyPoints) {
      const pos = this.fireflyPoints.geometry.attributes.position;
      for (let i = 0; i < this.fireData.length; i++) {
        const d = this.fireData[i];
        pos.setY(i, d.baseY + Math.sin(t * d.speed + d.phase) * 0.6);
      }
      pos.needsUpdate = true;
      this.fireflyPoints.material.opacity = 0.6 + Math.sin(t * 2) * 0.3;
    }
  }
}
