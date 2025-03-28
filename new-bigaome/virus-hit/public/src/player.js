export class Player {
  constructor(id, color, role = 'assistant') {
    this.id = id; // socket id 或客户端编号
    this.color = color || 'white';
    this.role = role; // 'hitter' or 'assistant'
    this.poseData = null; // 当前姿态信息（PoseData 实例）
  }

  updatePose(poseData) {
    this.poseData = poseData;
  }
}
