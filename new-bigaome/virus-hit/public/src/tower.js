import { addFloatingImage } from './utils.js';

export class Tower {
  constructor(assistantData, x, y) {
    // 只保留必要的属性
    this.id = assistantData.id;
    this.data = assistantData; // 保存所有服务端数据的引用

    // 塔的位置（由客户端控制）
    this.x = x;
    this.y = y;

    // 冷却状态（仅用于前端动画效果）
    this.cooldown = false;

    console.log(
      `🗼 创建塔 ID:${this.id}, 颜色:${this.data.color}, 分数:${
        this.data.score || 0
      }`
    );
  }

  // 获取旗帜图片名称
  get flagKey() {
    return this.data.color || 'red';
  }

  isNoseNear(nose, radius = 120) {
    const dx = this.x - nose.x;
    const dy = this.y - nose.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < radius;
  }

  fire() {
    // 仅检查是否有子弹且未在冷却，发射逻辑由服务器处理
    if (this.data.bulletCount > 0 && !this.cooldown) {
      // 仅更新本地冷却状态，不修改子弹数量
      this.cooldown = true;
      setTimeout(() => (this.cooldown = false), 1000);
      return true;
    }
    return false;
  }

  // 从服务器更新数据
  update(assistantData) {
    this.data = assistantData;
  }

  // 绘制塔的所有视觉元素
  draw(canvasCtx) {
    const x = this.x;
    const y = this.y;

    // 旗帜图片
    addFloatingImage(
      `flag-${this.id}`,
      `././image/${this.flagKey}Flag.gif`,
      x + 50,
      y - 35,
      150
    );

    // 塔图片
    addFloatingImage(
      `tower-${this.id}`,
      '././image/tower.png',
      x - 40,
      y + 90,
      200
    );

    // 炸弹图片
    addFloatingImage(
      `bomb-${this.id}`,
      '././image/bomb.png',
      x - 80,
      y - 45,
      70
    );

    // 子弹数量文字
    canvasCtx.font = '64px VT323';
    canvasCtx.fillText('x' + (this.data.bulletCount || 0), x - 50, y - 30);

    // 能量条
    addFloatingImage(
      `bar-${this.id}`,
      '././image/changtiao.png',
      x - 34,
      y + 180,
      200,
      36
    );

    // 肩膀图片
    const shoulderDis = this.data.shoulderDistance || 600;
    const spacing = Math.max(30, Math.min(200, (shoulderDis - 200) / 4));

    const circleY = y + 125;
    const circleXLeft = x + 65 - spacing / 2;
    const circleXRight = x + 65 + spacing / 2;

    // 左肩图片
    addFloatingImage(
      `shoulder-left-${this.id}`,
      '././image/shoulder.png',
      circleXLeft,
      circleY,
      115
    );

    // 右肩图片
    addFloatingImage(
      `shoulder-right-${this.id}`,
      '././image/shoulder.png',
      circleXRight,
      circleY,
      115
    );

    // 在塔上方显示分数
    canvasCtx.font = '36px VT323';
    canvasCtx.fillStyle = 'yellow';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText(`${this.data.score || 0} 分`, x, y - 120);

    // 显示昵称
    canvasCtx.font = '24px VT323';
    canvasCtx.fillStyle = 'white';
    canvasCtx.fillText(this.data.nickname || '匿名玩家', x, y - 150);

    canvasCtx.textAlign = 'left'; // 重置对齐方式
    canvasCtx.fillStyle = 'white'; // 重置文字颜色
  }
}
