// poseData.js
export class PoseData {
  static landmarkNames = {
    0: 'nose',
    2: 'leftEye',
    5: 'rightEye',
    11: 'leftShoulder',
    12: 'rightShoulder',
    13: 'leftElbow',
    14: 'rightElbow',
    15: 'leftWrist',
    16: 'rightWrist',
    23: 'leftHip',
    24: 'rightHip',
  };

  constructor(landmarks, width, height) {
    this.width = width;
    this.height = height;
    this.landmarks = landmarks.map((l) => this.#extract(l));
    this.named = {};
    for (const [index, name] of Object.entries(PoseData.landmarkNames)) {
      this.named[name] = this.landmarks[Number(index)];
    }
  }

  #extract(landmark) {
    return {
      x: landmark.x * this.width,
      y: landmark.y * this.height,
      z: landmark.z,
    };
  }

  get(key) {
    if (typeof key === 'number') return this.landmarks[key];
    return this.named[key];
  }

  getDistance(part1, part2) {
    const p1 = this.get(part1);
    const p2 = this.get(part2);
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getMidpoint(part1, part2) {
    const p1 = this.get(part1);
    const p2 = this.get(part2);
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  }

  getAngle(part1, center, part2) {
    const a = this.get(part1);
    const b = this.get(center);
    const c = this.get(part2);
    const ab = Math.hypot(b.x - a.x, b.y - a.y);
    const bc = Math.hypot(c.x - b.x, c.y - b.y);
    const ac = Math.hypot(c.x - a.x, c.y - a.y);
    return Math.acos((ab * ab + bc * bc - ac * ac) / (2 * ab * bc));
  }
}

// poseRenderer.js
import { DrawingUtils } from 'https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0';

export class PoseRenderer {
  constructor(canvasCtx) {
    this.ctx = canvasCtx;
    this.utils = new DrawingUtils(canvasCtx);
  }

  drawPoint(p, color = 'red', radius = 5) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  drawLandmark(p, color = '#00FF00') {
    this.utils.drawLandmarks([p], {
      radius: 5,
      color,
      fillColor: color,
    });
  }

  drawShoulders(pose) {
    this.drawLandmark(pose.get('leftShoulder'));
    this.drawLandmark(pose.get('rightShoulder'));
  }

  drawNoseTorch(pose) {
    const nose = pose.get('nose');
    let torchImg = document.getElementById('torch-img');
    if (!torchImg) {
      torchImg = document.createElement('img');
      torchImg.id = 'torch-img';
      torchImg.src = '../image/Torch.gif';
      torchImg.style.position = 'absolute';
      torchImg.style.zIndex = '1000';
      document.body.appendChild(torchImg);
    }
    const size = 120;
    torchImg.style.width = `${size}px`;
    torchImg.style.height = `${size}px`;
    torchImg.style.left = `${nose.x - size / 2}px`;
    torchImg.style.top = `${nose.y - size / 2}px`;
  }
}
