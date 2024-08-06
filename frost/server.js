const express = require("express");
const app = express();

var PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log("My socket server is running");
})
// const server = app.listen(3000);

const io = require('socket.io')(server);

app.use(express.static('public'));

io.sockets.on('connection',
    // We are given a websocket object in our function
    function (socket) {
      console.log("We have a new client: " + socket.id);
    })