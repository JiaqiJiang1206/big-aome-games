// socketManager.js
// import { io } from 'socket.io-client';
export class SocketManager {
  constructor(serverURL, onReady, nickname = '匿名玩家') {
    this.socket = io(serverURL);
    this.id = null;
    this.role = null;
    this.color = null;
    this.nickname = nickname;
    this.clientSummary = [];
    this.serverState = {};
    this.onRoleAssignedCallback = onReady;

    this.socket.on('connect', () => {
      this.id = this.socket.id;
      console.log('🟢 Connected with ID:', this.id);

      // 连接后启动摄像头
      if (typeof enableCam === 'function') {
        enableCam();
      }
    });

    // 明确的角色分配事件
    this.socket.on('roleAssigned', (data) => {
      console.log('📝 收到角色分配:', data);
      this.id = data.id;
      this.role = data.role;
      this.color = data.color;

      if (this.onRoleAssignedCallback) {
        this.onRoleAssignedCallback(data);
      }
    });

    // 接收服务端分配的所有客户端信息
    this.socket.on('clientSummary', (summary) => {
      console.log('📊 收到客户端摘要:', summary);
      this.clientSummary = summary;

      // 作为备用，如果没有收到roleAssigned事件，也通过summary找到自己的角色
      if (!this.role && this.id) {
        const me = summary.find((c) => c.id === this.id);
        if (me) {
          console.log('📝 通过摘要找到自己的角色:', me);
          this.role = me.role;
          this.color = me.color;
          if (this.onRoleAssignedCallback) {
            this.onRoleAssignedCallback({
              id: this.id,
              role: this.role,
              color: this.color,
            });
          }
        }
      }

      // 如果是hitter角色，处理assistants数据
      if (this.role === 'hitter') {
        const assistants = summary.filter(
          (client) => client.role === 'assistant'
        );
        console.log('👥 Hitter发现助手数量:', assistants.length);
        if (assistants.length > 0) {
          // 将收到的客户端数据转发为assistantsUpdate事件
          this.socket.emit('assistantsUpdate', assistants);
        }
      }
    });

    this.socket.on('serverState', (state) => {
      this.serverState = state;
      // 你可以触发一个回调或事件系统来响应更新
    });
  }

  // 主动同步自己的状态（弹药数、shoulder距离等）
  syncState({ bulletCount, shoulderDistance }) {
    this.socket.emit('syncState', {
      bulletCount,
      shoulderDistance,
    });
  }

  // 请求更新病毒血量
  updateVirusHP(newHP) {
    this.socket.emit('updateVirusHP', newHP);
  }

  // 请求服务器播放一个发射事件（会更新远端的子弹数）
  fireBullet(assistantId) {
    this.socket.emit('fireBullet', assistantId);
  }

  // 获取本地 ID
  getMyId() {
    return this.id;
  }

  // 获取所有客户端的状态
  getClientSummary() {
    return this.clientSummary;
  }

  // 获取当前病毒状态
  getVirusHP() {
    return this.serverState.virusHP;
  }

  // 获取指定塔的子弹数（辅助函数）
  getBulletCount(assistantId) {
    const target = this.clientSummary.find((c) => c.id === assistantId);
    return target ? target.bulletCount : 0;
  }

  // 获取当前所有助手数据（用于创建塔）
  getAssistants() {
    return this.clientSummary.filter((client) => client.role === 'assistant');
  }
}
