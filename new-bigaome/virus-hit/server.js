const express = require('express');
const app = express();
const PORT = process.env.PORT || 3002;
const server = app.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
const io = require('socket.io')(server, {
  cors: {
    origin: '*', // 或者指定你的前端地址，如 'http://localhost:3000'
    methods: ['GET', 'POST'],
  },
});

// 静态资源
app.use(express.static('public'));

// 保存客户端 ID
let clientIds = [];

// 服务器端状态
let serverState = {
  virusHP: 100, // 病毒血量
};

// 工具函数：广播所有客户端状态
function broadcastClientStates() {
  io.emit('clientNumbers', clientIds); // 发送完整的 ID 数组，而不是长度
  clientIds.forEach((clientId, index) => {
    const role = index === 0 ? 'hitter' : 'assistant';
    io.to(clientId).emit('clientInfo', {
      id: clientId,
      index: index,
      role: role,
    });
  });
  // 广播服务器状态
  io.emit('serverState', serverState);
}

// 连接事件
io.on('connection', (socket) => {
  const id = socket.id;
  clientIds.push(id);
  console.log(`Client connected: ${id}`);
  broadcastClientStates();

  // 客户端断开连接
  socket.on('disconnect', () => {
    const index = clientIds.indexOf(socket.id);
    if (index !== -1) {
      clientIds.splice(index, 1);
      console.log(`Client disconnected: ${socket.id}`);
      broadcastClientStates();
    }
  });

  // Assistant 发出 addBullet 请求
  socket.on('addBullet', (assistantIndex) => {
    const hitterId = clientIds[0];
    if (hitterId) {
      io.to(hitterId).emit('addBullet0', assistantIndex);
    }
  });

  // Hitter 或系统要求 Assistant 减少子弹
  socket.on('reduceBullet', (index) => {
    if (clientIds[index]) {
      io.to(clientIds[index]).emit('reduceBullet0', index);
    }
  });

  // Assistant 提交摧毁信息
  socket.on('dis', (data) => {
    const hitterId = clientIds[0];
    if (hitterId) {
      io.to(hitterId).emit('dis0', data);
    }
  });

  // 处理病毒血量更新
  socket.on('updateVirusHP', (newHP) => {
    serverState.virusHP = newHP;
    io.emit('serverState', serverState);
  });

  // 可扩展：客户端请求角色切换
  // socket.on("requestRoleSwitch", () => { ... });
});
