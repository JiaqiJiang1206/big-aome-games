const express = require("express");
const app = express();
var PORT = process.env.PORT || 3002;
const server = app.listen(PORT, () => {
    console.log("My socket server is running");
})
const io = require('socket.io')(server);
let idList = [];

app.use(express.static('public'));

let clients = 0;
io.sockets.on('connection',
    // We are given a websocket object in our function
    function (socket) {
    clients++;
    let id = socket.id;
    idList.push(id);
    console.log(idList);
    // console.log(id);
    console.log("We have clients: " + clients);
    for(let i = 0; i < clients; i++){
        io.sockets.to(idList[i]).emit('clientNumbers',clients);//告诉每个客户端一共有多少个玩家
    }


    for(let i = 0; i < idList.length; i++){
        io.sockets.to(idList[i]).emit('clientState',i);//告诉客户端它为第几号客户端
    }

    socket.on('disconnect', function() {
        let idDisconnect = socket.id;
        for(let i = 0; i < idList.length; i++){
            if(idList[i] === idDisconnect){
                idList.splice(i, 1);
                console.log(idList);
            }
        }
        clients--;
        console.log("We have clients: " + clients);
        for(let i = 0; i < idList.length; i++){

            io.sockets.to(idList[i]).emit('clientState',i);//1为第一个客户端，0为其他客户端

        }

    });

    socket.on('addBullet', function(clientNumber){
        io.sockets.to(idList[0]).emit('addBullet0',clientNumber);
    })

    socket.on('reduceBullet', function(a){
        io.sockets.to(idList[a]).emit('reduceBullet0',a);
    })

    socket.on('dis', function(a){
        io.sockets.to(idList[0]).emit('dis0',a)
    })

})