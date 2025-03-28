import { Tower } from './tower.js';

export class TowerManager {
  constructor(canvasWidth, canvasHeight) {
    this.towers = [];
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  // 根据assistants数据更新塔
  updateTowers(assistantsData) {
    console.log('更新塔，接收到数据:', assistantsData);

    if (!assistantsData || assistantsData.length === 0) {
      console.warn('没有接收到助手数据，无法创建塔');
      return;
    }

    // 计算塔的位置 - 均匀分布在屏幕底部
    const towerCount = assistantsData.length;
    const spacing = this.canvasWidth / (towerCount + 1);

    // 更新或创建塔
    const updatedTowers = [];
    assistantsData.forEach((assistantData, index) => {
      const x = spacing * (index + 1);
      const y = this.canvasHeight - 200; // 距离底部200像素

      // 查找现有塔
      let tower = this.towers.find((t) => t.id === assistantData.id);

      if (tower) {
        // 更新现有塔
        tower.update(assistantData);
        tower.x = x;
        tower.y = y;
        console.log(
          `更新塔 #${index + 1}, ID: ${tower.id}, 分数: ${tower.score}`
        );
      } else {
        // 创建新塔
        tower = new Tower(assistantData, x, y);
        console.log(
          `创建塔 #${index + 1}, ID: ${tower.id}, 位置: (${x}, ${y})`
        );
      }

      updatedTowers.push(tower);
    });

    // 替换塔数组
    this.towers = updatedTowers;
    console.log(`成功更新 ${this.towers.length} 个塔`);
  }

  // 绘制所有塔
  drawTowers(canvasCtx) {
    if (this.towers.length === 0) {
      console.warn('没有塔可供绘制');
      return;
    }

    this.towers.forEach((tower, index) => {
      tower.draw(canvasCtx);
    });
  }

  // 检查是否有塔可以发射子弹（鼻子附近）
  checkNoseNearTowers(nosePosition, radius = 120) {
    for (const tower of this.towers) {
      if (tower.isNoseNear(nosePosition, radius) && tower.fire()) {
        return {
          success: true,
          towerPosition: { x: tower.x, y: tower.y },
          towerId: tower.id,
        };
      }
    }
    return { success: false };
  }
}
