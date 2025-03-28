import { DrawingUtils } from 'https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0';
const images = {};

function preloadImages() {
  const imgList = {
    tower: '../image/tower.png',
    bomb: '../image/bomb.png',
    torch: '../image/Torch.gif',
    changtiao: '../image/changtiao.png',
    redFlag: '../image/redFlag.gif',
    blueFlag: '../image/94,203,246Flag.gif',
    yellowFlag: '../image/yellowFlag.gif',
    greenFlag: '../image/greenFlag.gif',
    virus: '../image/walk.gif',
    shoulder: '../image/shoulder.png',
  };

  for (const [key, src] of Object.entries(imgList)) {
    const img = new Image();
    img.src = src;
    images[key] = img;
  }
}
preloadImages();

export class PoseData {
  constructor(landmarks, width, height) {
    this.width = width;
    this.height = height;

    this.leftShoulder = this.extract(landmarks[11]);
    this.rightShoulder = this.extract(landmarks[12]);
    this.nose = this.extract(landmarks[0]);

    // 可扩展：肘、手腕、角度、朝向等
  }

  extract(landmark) {
    return {
      x: landmark.x * this.width,
      y: landmark.y * this.height,
      z: landmark.z,
    };
  }

  getShoulderDistance() {
    const dx = this.leftShoulder.x - this.rightShoulder.x;
    const dy = this.leftShoulder.y - this.rightShoulder.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getMidShoulder() {
    return {
      x: (this.leftShoulder.x + this.rightShoulder.x) / 2,
      y: (this.leftShoulder.y + this.rightShoulder.y) / 2,
    };
  }

  drawShoulder(canvasCtx) {
    const drawingUtils = new DrawingUtils(canvasCtx);

    // 调试：打印坐标
    // console.log('Left shoulder:', this.leftShoulder);
    // console.log('Right shoulder:', this.rightShoulder);

    // 使用更简单的绘制方式
    canvasCtx.fillStyle = 'red';
    canvasCtx.beginPath();
    canvasCtx.arc(this.leftShoulder.x, this.leftShoulder.y, 5, 0, 2 * Math.PI);
    canvasCtx.fill();

    canvasCtx.fillStyle = 'blue';
    canvasCtx.beginPath();
    canvasCtx.arc(
      this.rightShoulder.x,
      this.rightShoulder.y,
      5,
      0,
      2 * Math.PI
    );
    canvasCtx.fill();

    // 使用 MediaPipe 推荐的方式绘制关键点
    drawingUtils.drawLandmarks([this.leftShoulder], {
      radius: 5,
      color: '#00FF00',
      fillColor: '#00FF00',
    });

    drawingUtils.drawLandmarks([this.rightShoulder], {
      radius: 5,
      color: '#00FF00',
      fillColor: '#00FF00',
    });
  }

  drawNose(canvasCtx) {
    const drawingUtils = new DrawingUtils(canvasCtx);

    // 创建或更新 torch 图片元素
    let torchImg = document.getElementById('torch-img');
    if (!torchImg) {
      torchImg = document.createElement('img');
      torchImg.id = 'torch-img';
      torchImg.src = '../image/Torch.gif';
      torchImg.style.position = 'absolute';
      document.body.appendChild(torchImg);
    }

    // 更新图片位置
    const torchSize = 120;
    torchImg.style.width = `${torchSize}px`;
    torchImg.style.height = `${torchSize}px`;
    torchImg.style.left = `${this.nose.x - torchSize / 2}px`;
    torchImg.style.top = `${this.nose.y - torchSize / 2}px`;
    torchImg.style.zIndex = '1000'; // 确保图片在 canvas 上层

    // 使用 MediaPipe 推荐的方式绘制关键点
    drawingUtils.drawLandmarks([this.nose], {
      radius: 5,
      color: '#FF00FF',
      fillColor: '#FF00FF',
    });
  }
}
