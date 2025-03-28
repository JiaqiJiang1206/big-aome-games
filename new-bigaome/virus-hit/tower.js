export class Tower {
  constructor(id, x, y, options, bulletCount = 0) {
    this.id = id; // 与 assistant id 对应
    this.x = x;
    this.y = y;
    this.bulletCount = bulletCount;
    this.cooldown = false;
    this.shoulderDistance = 800; // 默认距离

    // 可选视觉属性
    this.color = options.color || 'white'; // 颜色
    this.flagKey = options.flagKey || null; // 对应旗帜图像 key
    this.playerNumber = options.playerNumber || null; // Player 1, 2, ...
  }

  updateBulletCount(count) {
    this.bulletCount = count;
  }

  isNoseNear(nose, radius = 120) {
    const dx = this.x - nose.x;
    const dy = this.y - nose.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < radius;
  }

  fire() {
    if (this.bulletCount > 0 && !this.cooldown) {
      this.bulletCount--;
      this.cooldown = true;
      setTimeout(() => (this.cooldown = false), 1000); // 防止一秒内多次发射
      return true;
    }
    return false;
  }
}
