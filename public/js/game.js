import * as THREE from "three";

const CARD_IMG = {
  red: "assets/cards/red.png",
  blue: "assets/cards/blue.png",
  b: "assets/cards/b.png",
  white: "assets/cards/white.png",
  bu: "assets/cards/bu.png",
  wo: "assets/cards/wo.png",
  cchong: "assets/cards/cchong.png",
  cvue: "assets/cards/cvue.png",
  rno: "assets/cards/rno.png"
};

const CARD_W = 1.15;
const CARD_H = 1.8;
const TABLE_Y = 0.92;
const COLS = 6;
const COL_GAP = 1.45;
const ROW_GAP = 2.1;

export class GameScene {
  constructor(renderer) {
    this.renderer = renderer;
    this.canvas = renderer.domElement;
    this.clock = new THREE.Clock();
    this.cards = new Map();
    this.loader = new THREE.TextureLoader();
    this.texCache = new Map();
    this.highlighted = new Set();
    this._init();
  }

  _init() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x06160d, 0.04);
    this.scene.background = new THREE.Color(0x05110a);

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
    this.camera.position.set(0, 9.5, 11);
    this.camera.lookAt(0, 1, -0.5);

    this._buildLights();
    this._buildGround();
    this._buildForest();
    this._buildTable();
    this._buildFireflies();
    this.backTex = this._makeCardBack();

    this._resize = () => this._onResize();
    window.addEventListener("resize", this._resize);
  }

  _buildLights() {
    this.scene.add(new THREE.AmbientLight(0x24414d, 0.75));

    const moon = new THREE.DirectionalLight(0x9fc6ff, 1.0);
    moon.position.set(-9, 16, 4);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.camera.near = 1;
    moon.shadow.camera.far = 60;
    moon.shadow.camera.left = -18;
    moon.shadow.camera.right = 18;
    moon.shadow.camera.top = 18;
    moon.shadow.camera.bottom = -18;
    this.scene.add(moon);

    const lamp = new THREE.PointLight(0xffd98a, 2.2, 26, 2);
    lamp.position.set(0, 7, 2);
    this.scene.add(lamp);
  }

  _buildGround() {
    const geo = new THREE.PlaneGeometry(120, 120, 40, 40);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, Math.sin(x * 0.4) * 0.2 + Math.cos(y * 0.5) * 0.2);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0x122a1b, roughness: 1 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  _makeTree(x, z, scale) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.2, 1.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1 })
    );
    trunk.position.y = 0.7;
    trunk.castShadow = true;
    tree.add(trunk);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1d472c, roughness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.95 - i * 0.22, 1.1, 7), foliageMat);
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
    for (let i = 0; i < 30; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 11 + Math.random() * 16;
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad - 2;
      this.scene.add(this._makeTree(x, z, 0.9 + Math.random() * 1.5));
    }
  }

  _buildTable() {
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(6.4, 6.4, 0.5, 48),
      new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.7 })
    );
    top.position.y = TABLE_Y - 0.25;
    top.receiveShadow = true;
    top.castShadow = true;
    this.scene.add(top);

    const cloth = new THREE.Mesh(
      new THREE.CylinderGeometry(5.9, 5.9, 0.06, 48),
      new THREE.MeshStandardMaterial({ color: 0x1f6b44, roughness: 0.95 })
    );
    cloth.position.y = TABLE_Y + 0.02;
    cloth.receiveShadow = true;
    this.scene.add(cloth);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x3a2616, roughness: 0.8 });
    const legR = 4.6;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, TABLE_Y, 10), legMat);
      leg.position.set(Math.cos(a) * legR, TABLE_Y / 2 - 0.2, Math.sin(a) * legR);
      leg.castShadow = true;
      this.scene.add(leg);
    }
  }

  _buildFireflies() {
    const count = 120;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this.fireData = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 30;
      const y = Math.random() * 6 + 1;
      const z = (Math.random() - 0.5) * 26 - 2;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      this.fireData.push({ baseY: y, speed: 0.3 + Math.random() * 0.8, phase: Math.random() * 6.28 });
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.fireflyPoints = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xffe39b,
        size: 0.12,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.scene.add(this.fireflyPoints);
  }

  _makeCardBack() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 400;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, c.height);
    g.addColorStop(0, "#0e2c1c");
    g.addColorStop(1, "#06160d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#e8c06a";
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, c.width - 24, c.height - 24);
    ctx.fillStyle = "#e8c06a";
    ctx.font = "bold 120px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("D", c.width / 2, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _faceTexture(type) {
    if (this.texCache.has(type)) return this.texCache.get(type);
    const tex = this.loader.load(CARD_IMG[type]);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.texCache.set(type, tex);
    return tex;
  }

  _slotPosition(index) {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const rowCount = Math.ceil((index + 1) / COLS);
    const x = (col - (COLS - 1) / 2) * COL_GAP;
    const z = (row - 1) * ROW_GAP - 0.5;
    return new THREE.Vector3(x, TABLE_Y + 0.08, z);
  }

  addCard(card, index) {
    const group = new THREE.Group();

    const front = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_W, CARD_H),
      new THREE.MeshStandardMaterial({ map: this._faceTexture(card.type), roughness: 0.55 })
    );
    front.position.z = 0.012;

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_W, CARD_H),
      new THREE.MeshStandardMaterial({ map: this.backTex, roughness: 0.55 })
    );
    back.position.z = -0.012;
    back.rotation.y = Math.PI;

    const core = new THREE.Mesh(
      new THREE.BoxGeometry(CARD_W, CARD_H, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.8 })
    );

    group.add(core, front, back);
    group.castShadow = true;

    const target = this._slotPosition(index);
    group.position.set(target.x, target.y + 5.5, target.z + 3.5);
    group.rotation.x = Math.PI / 2;
    group.rotation.z = (Math.random() - 0.5) * 0.6;

    this.scene.add(group);

    this.cards.set(card.uid, {
      uid: card.uid,
      type: card.type,
      group,
      anim: {
        from: group.position.clone(),
        to: target,
        rotFrom: Math.PI / 2,
        rotTo: -Math.PI / 2,
        zRotTo: (Math.random() - 0.5) * 0.18,
        zRotFrom: group.rotation.z,
        start: performance.now(),
        dur: 720,
        active: true
      },
      removing: false,
      pulse: 0
    });
  }

  highlight(uids) {
    this.highlighted = new Set(uids);
  }

  clearHighlight() {
    this.highlighted = new Set();
  }

  removeCards(uids) {
    for (const uid of uids) {
      const c = this.cards.get(uid);
      if (c) {
        c.removing = true;
        c.removeStart = performance.now();
        c.removeFrom = c.group.position.clone();
      }
    }
    this.highlighted = new Set();
  }

  _easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  _update() {
    const t = this.clock.getElapsedTime();
    const now = performance.now();

    this.camera.position.x = Math.sin(t * 0.12) * 0.8;
    this.camera.lookAt(0, 1, -0.5);

    for (const [uid, c] of this.cards) {
      const a = c.anim;
      if (a.active) {
        const p = Math.min((now - a.start) / a.dur, 1);
        const e = this._easeOut(p);
        c.group.position.lerpVectors(a.from, a.to, e);
        c.group.position.y += Math.sin(p * Math.PI) * 1.2;
        c.group.rotation.x = a.rotFrom + (a.rotTo - a.rotFrom) * e;
        c.group.rotation.z = a.zRotFrom + (a.zRotTo - a.zRotFrom) * e;
        if (p >= 1) a.active = false;
      }

      if (c.removing) {
        const p = Math.min((now - c.removeStart) / 420, 1);
        c.group.position.y = c.removeFrom.y + p * 4;
        c.group.rotation.z += 0.25;
        c.group.scale.setScalar(1 - p);
        if (p >= 1) {
          this.scene.remove(c.group);
          this.cards.delete(uid);
        }
        continue;
      }

      if (this.highlighted.has(uid)) {
        c.pulse += 0.12;
        const s = 1 + Math.sin(c.pulse) * 0.06 + 0.04;
        c.group.scale.setScalar(s);
        c.group.position.y = c.anim.to.y + 0.25 + Math.sin(c.pulse) * 0.08;
      } else if (!c.anim.active) {
        c.group.scale.setScalar(1);
        c.group.position.y = c.anim.to.y;
      }
    }

    if (this.fireflyPoints) {
      const pos = this.fireflyPoints.geometry.attributes.position;
      for (let i = 0; i < this.fireData.length; i++) {
        const d = this.fireData[i];
        pos.setY(i, d.baseY + Math.sin(t * d.speed + d.phase) * 0.5);
      }
      pos.needsUpdate = true;
    }
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

  stop() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;
    window.removeEventListener("resize", this._resize);
  }
}
