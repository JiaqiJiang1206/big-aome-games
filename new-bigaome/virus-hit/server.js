// server.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3002;
const server = app.listen(PORT, () => {
  console.log(`🚀 Socket server running on port ${PORT}`);
});

const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// 静态资源
app.use(express.static('public'));

// 所有连接的客户端状态
let clients = {}; // { socketId_1: { id, role, bullets, curBullets, name, color },  socketId_1: {}}

// 服务端统一状态
let serverState = {
  virusHP: 100,
};

// 判断是否已存在hitter角色
function hasHitter() {
  return Object.values(clients).some((client) => client.role === 'hitter');
}

// 向所有客户端广播最新状态
function broadcastClientStates() {
  const summary = Object.values(clients).map(
    ({
      id,
      role,
      bulletCount,
      shoulderDistance,
      playerNumber,
      color,
      score,
      nickname, // 确保昵称被包含在广播中
    }) => ({
      id,
      role,
      bulletCount,
      shoulderDistance,
      playerNumber,
      color,
      score,
      nickname,
    })
  );

  io.emit('clientSummary', summary);
  io.emit('serverState', serverState);
}

// 新客户端连接
io.on('connection', (socket) => {
  const id = socket.id;
  const role = hasHitter() ? 'assistant' : 'hitter';

  // 获取昵称（从连接查询参数中）
  const nickname = socket.handshake.query.nickname || '匿名玩家';

  // 设置默认颜色
  const colors = ['red', 'blue', 'green', 'yellow'];
  const color = colors[Object.keys(clients).length % colors.length];

  // 初始化客户端状态
  clients[id] = {
    id,
    role,
    bulletCount: 0,
    shoulderDistance: 0,
    color,
    score: 0,
    lastScoreTime: 0,
    nickname, // 添加昵称字段
  };

  // 分配编号并广播
  assignPlayerNumber();
  console.log(`🟢 Client connected: ${id} (${role})`);

  // 专门给当前连接的客户端单独发送一次角色信息
  socket.emit('roleAssigned', {
    id,
    role,
    color,
    nickname,
  });

  broadcastClientStates();

  // === 事件处理函数 ===

  // 客户端上报肩膀距离（仅接收数据，业务逻辑由服务器处理）
  socket.on('shoulderDistanceUpdate', (data) => {
    if (!clients[id]) return;

    // 更新肩膀距离
    clients[id].shoulderDistance = data.shoulderDistance;

    // 处理肩膀夹紧得分逻辑
    const now = Date.now();
    if (
      clients[id].shoulderDistance < GAME_CONFIG.SHOULDER_THRESHOLD &&
      now - clients[id].lastScoreTime > GAME_CONFIG.SCORE_COOLDOWN_MS
    ) {
      // 更新分数和上次得分时间
      clients[id].score += GAME_CONFIG.SCORE_PER_SQUEEZE;
      clients[id].lastScoreTime = now;

      // 通知客户端显示分数动画
      socket.emit('showScoreAnimation', {
        amount: GAME_CONFIG.SCORE_PER_SQUEEZE,
      });

      // 广播分数更新
      io.emit('scoreUpdate', {
        id: id,
        score: clients[id].score,
      });

      console.log(
        `玩家 ${id} 肩膀夹紧，得分 +${GAME_CONFIG.SCORE_PER_SQUEEZE}，总分: ${clients[id].score}`
      );
    }

    // 处理生产子弹逻辑（当肩膀从分开到靠近时，生成一颗子弹）
    if (data.canProduceBullet && !data.prevCanProduceBullet) {
      clients[id].bulletCount++;
      console.log(
        `玩家 ${id} 生产了一颗子弹，当前子弹数: ${clients[id].bulletCount}`
      );
    }

    broadcastClientStates();
  });

  // 客户端请求发射子弹（无需客户端计算子弹数，由服务器处理）
  socket.on('fireBullet', (data) => {
    const towerId = data.towerId;

    if (clients[towerId] && clients[towerId].bulletCount > 0) {
      // 减少子弹数量
      clients[towerId].bulletCount--;

      // 减少病毒血量
      serverState.virusHP = Math.max(
        0,
        serverState.virusHP - GAME_CONFIG.BULLET_DAMAGE
      );

      console.log(
        `发射子弹：塔ID ${towerId} 子弹数 ${clients[towerId].bulletCount}，病毒HP: ${serverState.virusHP}`
      );

      // 通知所有客户端子弹发射事件
      io.emit('bulletFired', {
        towerId: towerId,
        bulletCount: clients[towerId].bulletCount,
        virusHP: serverState.virusHP,
      });

      broadcastClientStates();
    } else {
      console.log(`发射失败：塔 ${towerId} 没有子弹或不存在`);
    }
  });

  // 客户端请求获取所有assistant
  socket.on('getAssistants', () => {
    const assistants = Object.values(clients).filter(
      (client) => client.role === 'assistant'
    );
    console.log(`发送助手数据给 ${id}, 共 ${assistants.length} 个助手`);
    socket.emit('assistantsUpdate', assistants);
  });

  // 客户端断开
  socket.on('disconnect', () => {
    delete clients[id];
    console.log(`🔴 Client disconnected: ${id}`);
    // 重新分配编号并广播
    assignPlayerNumber();
    broadcastClientStates();
  });
});
