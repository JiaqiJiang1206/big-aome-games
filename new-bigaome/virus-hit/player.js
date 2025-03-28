export class Player {
  constructor(id, role = 'assistant') {
    this.id = id; // socket id 或客户端编号
    this.role = role; // 'hitter' or 'assistant'
    this.poseData = null; // 当前姿态信息（PoseData 实例）
    this.shoulderDistance = 0;

    this.canProduceBullet = false;
    this.prevCanProduceBullet = false; // 用于边缘触发（从false到true）
    this.canFire = false;
  }

  updatePose(poseData) {
    this.poseData = poseData;
    this.shoulderDistance = poseData.getShoulderDistance();

    // 边缘触发用的前一帧状态
    this.prevCanProduceBullet = this.canProduceBullet;

    if (this.role === 'assistant') {
      this.canProduceBullet = this.shoulderDistance < 350;
    }

    if (this.role === 'hitter') {
      this.canFire = true; // 后续可以接入判断鼻子是否靠近目标
    }
  }

  /**
   * 仅执行子弹数+1的操作，不修改状态
   * 状态判断应由主循环中的边缘触发控制
   */
  produceBullet() {
    console.log(`Player ${this.id} produced a bullet.`);
  }

  /**
   * 发射子弹：返回是否成功
   */
  fireBullet() {
    if (this.canFire) {
      console.log(`Player ${this.id} fired a bullet.`);
      return true;
    }
    return false;
  }
}
