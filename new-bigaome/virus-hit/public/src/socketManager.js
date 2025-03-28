export class SocketManager {
  constructor(serverUrl, onRoleAssignedCallback) {
    this.socket = io(serverUrl);

    this.clientId = null;
    this.role = null;
    this.clientCount = 0;

    // 注册回调：收到服务器分配角色后执行
    this.onRoleAssignedCallback = onRoleAssignedCallback;

    this._setupListeners();
  }

  _setupListeners() {
    // 客户端编号和角色信息
    this.socket.on('clientInfo', (data) => {
      this.clientId = data.id;
      this.role = data.role;
      this.clientCount = data.index + 1;

      console.log(
        `📡 [Socket] 我是 ${this.role}, ID: ${this.clientId}, 编号: ${data.index}`
      );

      if (this.onRoleAssignedCallback) {
        this.onRoleAssignedCallback(data);
      }
    });

    // 监听服务器广播子弹变化等事件
    // this.socket.on('addBullet0', (assistantIndex) => {
    //   console.log(`🎯 子弹 +1，来自 Player ${assistantIndex}`);
    //   // 你可以触发回调或更新状态
    // });

    // this.socket.on('reduceBullet0', (assistantIndex) => {
    //   console.log(`💥 子弹 -1，来自 Player ${assistantIndex}`);
    // });

    this.socket.on('dis0', (data) => {
      // Hitter 收到所有助手的肩膀距离信息
      // console.log('🔄 肩膀距离：', data);
    });
  }

  // 向服务器发送：请求加子弹（助手动作触发）
  sendAddBullet() {
    this.socket.emit('addBullet', this.clientId);
  }

  // Hitter 发起扣子弹操作（例如发射命中）
  sendReduceBullet(assistantId) {
    this.socket.emit('reduceBullet', assistantId);
  }

  // 助手发送自己肩膀距离（每帧或节流）
  sendShoulderDistance(distance) {
    this.socket.emit('dis', [this.clientId, distance]);
  }

  // 拿当前角色
  getRole() {
    return this.role;
  }

  // 拿自己的编号
  getClientId() {
    return this.clientId;
  }
}
