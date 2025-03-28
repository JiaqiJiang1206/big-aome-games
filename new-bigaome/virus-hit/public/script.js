import {
  PoseLandmarker,
  FilesetResolver,
} from 'https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0';

import { CONFIG } from './src/consts.js';
import { PoseData } from './src/poseData.js';
import { PlayerFactory } from './src/player.js';
import { SocketManager } from './src/socketManager.js';
import { Tower } from './src/tower.js';

// ========== 全局变量 ==========
let poseLandmarker = undefined;
let runningMode = 'VIDEO';
let webcamRunning = false;

const videoWidth = CONFIG.VIDEO_WIDTH;
const videoHeight = CONFIG.VIDEO_HEIGHT;

const video = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

let socketManager;
let me = null; // 当前玩家
let towers = [];
let bullets = []; // 子弹数组：每个子弹是 {x, y, targetX, targetY, step}
let virusHP = 100; // 病毒血量
const virusPosition = {
  x: canvasElement.width / 2,
  y: canvasElement.height / 5,
}; // 目标点
let color = ['red', '94,203,246', 'yellow', 'green'];
let flagKeys = ['red', '94,203,246', 'yellow', 'green'];

// 加载资源
// main.js 顶部
const newFont = new FontFace('VT323', 'url(./fonts/vt323.ttf)');

newFont.load().then((loadedFont) => {
  document.fonts.add(loadedFont);
  console.log('✅ Custom font loaded');
});

// ========== 设置 video + canvas 尺寸 ==========
function setCanvasAndVideoSize() {
  video.width = videoWidth;
  video.height = videoHeight;
  video.style.width = `${videoWidth}px`;
  video.style.height = `${videoHeight}px`;

  canvasElement.width = videoWidth;
  canvasElement.height = videoHeight;
  canvasElement.style.width = `${videoWidth}px`;
  canvasElement.style.height = `${videoHeight}px`;
}

// ========== 初始化 Pose 模型 ==========
const createPoseLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
  );
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU',
    },
    runningMode: runningMode,
    numPoses: 1,
  });

  // 模型加载完成后直接启动摄像头
  enableCam();
};
createPoseLandmarker();

// ========== 检查浏览器支持 webcam ==========
const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

if (!hasGetUserMedia()) {
  console.warn('getUserMedia() is not supported by your browser');
}

// ========== 开启摄像头 ==========
function enableCam() {
  if (!poseLandmarker) {
    console.warn('模型正在加载中，请稍后再试...');
    return;
  }

  webcamRunning = true;

  const constraints = {
    video: { width: videoWidth, height: videoHeight },
  };

  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    video.addEventListener('loadeddata', () => {
      setCanvasAndVideoSize();
      predictWebcam();
    });
  });
}

// ========== 初始化 Socket ==========
function onRoleAssigned(data) {
  console.log(data);
  me = PlayerFactory.createPlayer(data);
  console.log(me);
}

socketManager = new SocketManager('http://127.0.0.1:3002', onRoleAssigned);
// TODO 调用相应的socketManager方法来更新

// ========== 每帧识别逻辑 ==========
let lastVideoTime = -1;

async function predictWebcam() {
  if (runningMode === 'IMAGE') {
    runningMode = 'VIDEO';
    await poseLandmarker.setOptions({ runningMode: 'VIDEO' });
  }

  const now = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    poseLandmarker.detectForVideo(video, now, (result) => {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      if (result.landmarks && result.landmarks.length > 0) {
        const poseData = new PoseData(
          result.landmarks[0],
          canvasElement.width,
          canvasElement.height
        );

        if (me) {
          me.updatePose(poseData);

          if (me.role === 'assistant') {
            // TODO 补充逻辑
          }

          if (me.role === 'hitter') {
            drawHUD();
            updateAndDrawBullets();
            // TODO 补充逻辑
          }
        }
      }

      canvasCtx.restore();
    });
  }

  if (webcamRunning) {
    requestAnimationFrame(predictWebcam);
  }
}

// TODO 功能函数放到类中或者工具函数文件中，
// 比如 drawTowers 就应该是 Tower 类的一个方法

function drawHUD() {
  if (me?.role === 'hitter') {
    // 文字说明
    canvasCtx.fillStyle = 'white';
    canvasCtx.font = '22px VT323';
    canvasCtx.fillText('炸弹大师💣：使用你的鼻子火炬发射炸弹', 30, 40);
    canvasCtx.fillText('能量工程师💪：助手肩膀夹紧制造弹药', 30, 70);
    canvasCtx.fillText('击败病毒怪物！👾💥', 30, 100);

    // 病毒图片
    let virusImg = document.getElementById('virus');
    if (!virusImg) {
      virusImg = document.createElement('img');
      virusImg.id = 'virus';
      virusImg.src = './image/walk.gif';
      virusImg.style.position = 'absolute';
      document.body.appendChild(virusImg);
    }
    virusImg.style.width = '250px';
    virusImg.style.height = '250px';
    virusImg.style.left = `${canvasElement.width / 2 - 100}px`;
    virusImg.style.top = '20px';
    virusImg.style.zIndex = '1000';

    // HP 文字
    canvasCtx.font = '88px VT323, monospace';
    canvasCtx.fillStyle = 'purple';
    canvasCtx.fillText('HP: ' + virusHP, canvasElement.width / 2 + 120, 120);
  }
}

function updateAndDrawBullets() {
  const speed = 0.02; // 控制子弹移动速度
  const bombImg = 'image/bomb.png';

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.step += speed;

    const newX = b.x + (b.targetX - b.x) * b.step;
    const newY = b.y + (b.targetY - b.y) * b.step;

    if (bombImg) {
      canvasCtx.drawImage(bombImg, newX - 25, newY - 25, 50, 50);
    } else {
      canvasCtx.fillStyle = 'white';
      canvasCtx.beginPath();
      canvasCtx.arc(newX, newY, 8, 0, 2 * Math.PI);
      canvasCtx.fill();
    }

    // 超过 1（到达目标）就删除
    if (b.step >= 1) {
      bullets.splice(i, 1);
      // 更新服务器端状态
      if (me?.role === 'hitter') {
        virusHP = Math.max(0, virusHP - 1);
        socketManager.socket.emit('updateVirusHP', virusHP);
      }
    }
  }
  if (virusHP <= 0) {
    canvasCtx.font = '100px VT323';
    canvasCtx.fillStyle = 'lime';
    canvasCtx.fillText(
      '🎉 Victory! Virus defeated!',
      virusPosition.x - 150,
      virusPosition.y + 300
    );
  }
}
