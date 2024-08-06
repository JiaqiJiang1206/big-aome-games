var PORT = process.env.PORT || 3001;
const cors = require('cors')

const express = require('express'); //引入express框架
const app = express();  //创建网站服务器

const server = app.listen(PORT, () => { //监听端口
    console.log('My socket server is running at 127.0.0.1:3001')
  });

function listen() {
    const host = server.address().address;
    const port = server.address().port;
    console.log('Example app listening at http://' + host + ':' + port);
}

app.use(cors());
app.use(express.static('./public'));

var io = require('socket.io')(server); //创建服务器io对象
var scores = []; //对象数组 存放client的id与对应成绩

//接收数据（收到client的连接）
io.sockets.on('connection',
    function (socket) { //收到client的socket,
        console.log("We have a new client: " + socket.id);
        var score = new User(socket.id, '', 0); 
        //console.log(score);
        scores.push(score);
        console.log(scores);

        socket.on('updateScore', function (score, username) {
            console.log('🌟', score, 'a new score received from: ', socket.id);
            for (var i in scores){
                if(scores[i].id == socket.id){
                    scores[i].username = username;
                    scores[i].score = score;  
                }
            }
            console.log(scores);
            displayScore(scores);
        });
    }
);

function displayScore(){
    scores.sort(sortBy('score',false));
    io.sockets.emit('displayScore', scores);
}

function User(id, username, score){
    this.id = id;
    this.username = username;
    this.score = score;
}

function sortBy(attr,rev){
    //第一个参数是比较的字段名，第二个参数没有传递 默认升序排列true和false
    if(rev ==  undefined){
        rev = 1;
    }else{
        rev = (rev) ? 1 : -1;
    }
    return function(a,b){
        a = a[attr];
        b = b[attr];
        if(a < b){
            return rev * -1;
        }
        if(a > b){
            return rev * 1;
        }
        return 0;
    }
}
