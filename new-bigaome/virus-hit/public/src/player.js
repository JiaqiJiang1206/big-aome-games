import { addFloatingImage, showScoreAnimation } from './utils.js';

class Player {
  static color = ['red', 'green', 'blue', 'yellow'];
  constructor(id, role = 'assistant') {
    this.id = id;
    this.role = role;

    this.color = Player.color[Math.floor(Math.random() * Player.color.length)];
    this.poseData = null;
  }

  updatePose(poseData) {
    this.poseData = poseData;
  }
}

class Assistant extends Player {
  constructor(id) {
    super(id, 'assistant');
    this.shoulderDistance = 0;
    this.canProduceBullet = false;
    this.prevCanProduceBullet = false;
    this.bulletCount = 0;
    this.playerNumber = null; // 由服务器分配
    this.score = 0; // 添加分数属性
    this.lastScoreTime = 0; // 上次加分时间，用于控制加分频率
    this.nickname = null; // 添加昵称属性
  }

  updatePose(poseData) {
    super.updatePose(poseData);

    this.shoulderDistance = poseData.getDistance(
      'leftShoulder',
      'rightShoulder'
    );
    this.prevCanProduceBullet = this.canProduceBullet;
    this.canProduceBullet = this.shoulderDistance < 350;

    this.drawShoulders();
    this.drawUI();

    // 不再在这里处理分数增加逻辑，而是由服务器处理
    // 也不再在这里增加子弹，子弹生成逻辑也移到服务器
  }

  // 新增方法：绘制玩家信息UI
  drawUI() {
    // 获取canvas上下文
    const canvas = document.getElementById('output_canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // 在左上角绘制玩家编号和分数
    ctx.save();

    // 设置文本样式
    ctx.font = '36px VT323';
    ctx.fillStyle = this.color || 'white';

    // 绘制半透明背景
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(10, 10, 200, 80);

    // 绘制昵称
    ctx.fillStyle = this.color || 'white';
    ctx.fillText(`${this.nickname || '匿名玩家'}`, 20, 45);

    // 绘制玩家编号
    ctx.fillText(`#${this.playerNumber || '?'}`, 180, 45);

    // 绘制分数
    ctx.fillStyle = 'yellow';
    ctx.fillText(`得分: ${this.score}`, 20, 80);

    ctx.restore();
  }

  // 更新服务器状态
  updateFromServer(data) {
    this.bulletCount = data.bulletCount;
    this.shoulderDistance = data.shoulderDistance;
    this.playerNumber = data.playerNumber;
    if (data.score !== undefined) {
      this.score = data.score;
    }
    if (data.nickname) {
      this.nickname = data.nickname;
    }
  }

  drawShoulders() {
    if (!this.poseData) return;

    const left = this.poseData.get('leftShoulder');
    const right = this.poseData.get('rightShoulder');

    if (!left || !right) return;

    const size = 160;

    // 左肩膀：红色圆
    addFloatingImage(
      `shoulder-left-${this.id}`,
      '././image/shoulder.png',
      left.x,
      left.y,
      size
    );

    // 右肩膀：白色圆
    addFloatingImage(
      `shoulder-right-${this.id}`,
      '././image/shoulder.png',
      right.x,
      right.y,
      size
    );
  }

  produceBullet() {
    // 保留此方法但返回 false，这样客户端不会自行增加子弹
    return false;
  }
}

class Hitter extends Player {
  constructor(id) {
    super(id, 'hitter'); // 先调用父类构造函数，再设置其他属性
    this.canFire = true;
  }

  updatePose(poseData) {
    super.updatePose(poseData);
    this.drawNose();
  }

  drawNose() {
    if (!this.poseData) return;

    const nose = this.poseData.get('nose');
    if (!nose) return;

    addFloatingImage(
      `torch-${this.id}`, // 使用玩家 ID 作为唯一标识符
      '././image/torch.gif', // 正确的图片路径
      nose.x,
      nose.y,
      200
    );
  }

  fireBullet() {
    if (this.canFire) {
      return true;
    }
    return false;
  }
}

export class PlayerFactory {
  static createPlayer({ id, role }) {
    switch (role) {
      case 'assistant':
        return new Assistant(id);
      case 'hitter':
        return new Hitter(id);
      default:
        return new Player(id, role);
    }
  }
}
