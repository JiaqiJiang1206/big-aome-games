import {
  PoseLandmarker,
  FilesetResolver,
} from 'https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0';

import { CONFIG } from './consts.js';
import { PoseData } from './poseData.js';
import { Player } from './player.js';
import { SocketManager } from './socketManager.js';
import { Tower } from './Tower.js';

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
const newFont = new FontFace('VT323', 'url(./vt323.ttf)');

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
  me = new Player(data.id, data.role);
  console.log(`🎮 我是 ${me.role}, ID: ${me.id}`);
}

socketManager = new SocketManager('http://127.0.0.1:3002', onRoleAssigned);

// 接收服务器状态更新
socketManager.socket.on('serverState', (state) => {
  virusHP = state.virusHP;
});

socketManager.socket.on('clientNumbers', (clients) => {
  towers = [];

  const assistants = clients.slice(1); // 所有助手
  const assistantCount = assistants.length;

  assistants.forEach((c, i) => {
    const x = (canvasElement.width / (assistantCount + 1)) * (i + 1); // ✅ 平均分布
    const y = canvasElement.height * 0.8;
    towers.push(
      new Tower(c, x, y, {
        color: color[i % color.length], // 使用你预设的颜色
        flagKey: flagKeys[i % flagKeys.length], // 对应旗帜图片 key
        playerNumber: i + 1,
      })
    ); // Tower 的 id 用 socket.id
  });
});

socketManager.socket.on('addBullet0', (assistantId) => {
  const tower = towers.find((t) => t.id === assistantId);
  console.log('📦 收到 addBullet0 for', assistantId, '找到塔:', tower);
  if (tower) tower.bulletCount++;
});

socketManager.socket.on('reduceBullet0', (assistantId) => {
  const tower = towers.find((t) => t.id === assistantId);
  if (tower) tower.bulletCount = Math.max(0, tower.bulletCount - 1);
});

socketManager.socket.on('dis0', ([assistantId, distance]) => {
  const tower = towers.find((t) => t.id === assistantId);
  if (tower) {
    tower.shoulderDistance = distance;
  }
});

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
            poseData.drawShoulder(canvasCtx);
            socketManager.sendShoulderDistance(me.shoulderDistance);

            // 👉 可视化肩膀距离（调试用）
            // canvasCtx.fillStyle = 'white';
            // canvasCtx.font = '56px VT323';
            // canvasCtx.fillText(
            //   `Distance: ${Math.floor(me.shoulderDistance)}`,
            //   20,
            //   20
            // );

            // 👉 显示子弹数量
            // canvasCtx.fillStyle = 'orange';
            canvasCtx.font = '32px VT323';
            const myTower = towers.find((t) => t.id === me.id);
            // console.log(towers);
            if (myTower) {
              canvasCtx.fillStyle = myTower.color;
              // canvasCtx.fillText(`💣 Bullets: ${myTower.bulletCount}`, 20, 45);

              canvasCtx.font = '86px VT323, monospace';
              canvasCtx.fillText(`Player ${myTower.playerNumber}`, 35, 80);
            }

            // ✅ 判定夹紧 -> 加子弹 -> 通知服务器
            if (me.canProduceBullet && !me.prevCanProduceBullet) {
              me.produceBullet();
              socketManager.sendAddBullet();
            }

            if (me.canProduceBullet) {
              // ✅ 加个视觉反馈（比如画圈或变色）
              canvasCtx.strokeStyle = 'lime';
              canvasCtx.beginPath();
              canvasCtx.arc(
                (me.poseData.leftShoulder.x + me.poseData.rightShoulder.x) / 2,
                (me.poseData.leftShoulder.y + me.poseData.rightShoulder.y) / 2,
                80,
                0,
                2 * Math.PI
              );
              canvasCtx.stroke();
            }
          }

          if (me.role === 'hitter') {
            drawTowers();
            drawHUD();
            updateAndDrawBullets(); // 💥 画子弹
            poseData.drawNose(canvasCtx);
            if (me.role === 'hitter') {
              for (const tower of towers) {
                if (tower.isNoseNear(me.poseData.nose)) {
                  const fired = tower.fire();
                  if (fired) {
                    socketManager.sendReduceBullet(tower.id);
                    virusHP = Math.max(0, virusHP - 1); // 扣血

                    // 添加子弹动画
                    bullets.push({
                      x: tower.x,
                      y: tower.y - 100,
                      targetX: virusPosition.x,
                      targetY: virusPosition.y,
                      step: 0,
                    });
                  }
                }
              }
            }
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

// 功能函数

function drawTowers() {
  for (const tower of towers) {
    const x = tower.x;
    const y = tower.y;

    // 旗帜图片
    let flagImg = document.getElementById(`flag-${tower.id}`);
    if (!flagImg) {
      flagImg = document.createElement('img');
      flagImg.id = `flag-${tower.id}`;
      flagImg.src = `../image/${tower.flagKey}Flag.gif`;
      flagImg.style.position = 'absolute';
      document.body.appendChild(flagImg);
    }
    flagImg.style.width = '100px';
    flagImg.style.height = '150px';
    flagImg.style.left = `${x + 80}px`;
    flagImg.style.top = `${y - 160}px`;
    flagImg.style.zIndex = '1000';

    // 塔图片
    let towerImg = document.getElementById(`tower-${tower.id}`);
    if (!towerImg) {
      towerImg = document.createElement('img');
      towerImg.id = `tower-${tower.id}`;
      towerImg.src = '../image/tower.png';
      towerImg.style.position = 'absolute';
      document.body.appendChild(towerImg);
    }
    towerImg.style.width = '200px';
    towerImg.style.height = '200px';
    towerImg.style.left = `${x - 40}px`;
    towerImg.style.top = `${y - 60}px`;
    towerImg.style.zIndex = '1000';

    // 炸弹图片
    let bombImg = document.getElementById(`bomb-${tower.id}`);
    if (!bombImg) {
      bombImg = document.createElement('img');
      bombImg.id = `bomb-${tower.id}`;
      bombImg.src = '../image/bomb.png';
      bombImg.style.position = 'absolute';
      document.body.appendChild(bombImg);
    }
    bombImg.style.width = '70px';
    bombImg.style.height = '70px';
    bombImg.style.left = `${x - 25}px`;
    bombImg.style.top = `${y - 130}px`;
    bombImg.style.zIndex = '1000';

    // 子弹数量文字

    canvasCtx.font = '56px VT323';
    canvasCtx.fillText('x' + tower.bulletCount, x + 35, y - 80);

    // 能量条
    let barImg = document.getElementById(`bar-${tower.id}`);
    if (!barImg) {
      barImg = document.createElement('img');
      barImg.id = `bar-${tower.id}`;
      barImg.src = '../image/changtiao.png';
      barImg.style.position = 'absolute';
      document.body.appendChild(barImg);
    }
    barImg.style.width = '200px';
    barImg.style.height = '40px';
    barImg.style.left = `${x - 34}px`;
    barImg.style.top = `${y + 100}px`;
    barImg.style.zIndex = '1000';

    // 肩膀图片
    const shoulderDis = tower.shoulderDistance || 600;
    const spacing = Math.max(30, Math.min(200, (shoulderDis - 200) / 4));

    const circleY = y + 125;
    const circleXLeft = x + 65 - spacing / 2;
    const circleXRight = x + 65 + spacing / 2;

    // 左肩图片
    let leftShoulderImg = document.getElementById(`shoulder-left-${tower.id}`);
    if (!leftShoulderImg) {
      leftShoulderImg = document.createElement('img');
      leftShoulderImg.id = `shoulder-left-${tower.id}`;
      leftShoulderImg.src = '../image/shoulder.png';
      leftShoulderImg.style.position = 'absolute';
      document.body.appendChild(leftShoulderImg);
    }
    leftShoulderImg.style.width = '115px';
    leftShoulderImg.style.height = '115px';
    leftShoulderImg.style.left = `${circleXLeft - 57.5}px`;
    leftShoulderImg.style.top = `${circleY - 57.5}px`;
    leftShoulderImg.style.zIndex = '1000';

    // 右肩图片
    let rightShoulderImg = document.getElementById(
      `shoulder-right-${tower.id}`
    );
    if (!rightShoulderImg) {
      rightShoulderImg = document.createElement('img');
      rightShoulderImg.id = `shoulder-right-${tower.id}`;
      rightShoulderImg.src = '../image/shoulder.png';
      rightShoulderImg.style.position = 'absolute';
      document.body.appendChild(rightShoulderImg);
    }
    rightShoulderImg.style.width = '115px';
    rightShoulderImg.style.height = '115px';
    rightShoulderImg.style.left = `${circleXRight - 57.5}px`;
    rightShoulderImg.style.top = `${circleY - 57.5}px`;
    rightShoulderImg.style.zIndex = '1000';
  }
}

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
      virusImg.src = '../image/walk.gif';
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
  const bombImg = images.bomb;

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
