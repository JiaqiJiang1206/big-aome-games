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
let clients = {}; // { socketId: { id, role, bulletCount, shoulderDistance } }

// 服务端统一状态
let serverState = {
  virusHP: 100,
};

// 向所有客户端广播最新状态
function broadcastClientStates() {
  const summary = Object.values(clients).map(
    ({ id, role, bulletCount, shoulderDistance }) => ({
      id,
      role,
      bulletCount,
      shoulderDistance,
    })
  );

  io.emit('clientSummary', summary);
  io.emit('serverState', serverState);
}

// 新客户端连接
io.on('connection', (socket) => {
  const id = socket.id;
  const role = Object.keys(clients).length === 0 ? 'hitter' : 'assistant';

  clients[id] = {
    id,
    role,
    bulletCount: 0,
    shoulderDistance: 0,
  };

  console.log(`🟢 Client connected: ${id} (${role})`);
  broadcastClientStates();

  // 客户端主动同步自身状态
  socket.on('syncState', (data) => {
    if (!clients[id]) return;

    clients[id] = {
      ...clients[id],
      ...data, // e.g. bulletCount, shoulderDistance
    };

    broadcastClientStates();
  });

  // 客户端请求更新病毒血量（e.g. 击中）
  socket.on('updateVirusHP', (newHP) => {
    serverState.virusHP = newHP;
    broadcastClientStates();
  });

  // 发射子弹（用于同步动画或触发音效）
  socket.on('fireBullet', (assistantId) => {
    const target = Object.values(clients).find((c) => c.id === assistantId);
    if (target) {
      target.bulletCount = Math.max(0, target.bulletCount - 1);
      broadcastClientStates();
    }
  });

  // 客户端断开
  socket.on('disconnect', () => {
    delete clients[id];
    console.log(`🔴 Client disconnected: ${id}`);
    broadcastClientStates();
  });
});
