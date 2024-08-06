let poseNet;
let pose;
let mydiv;

let leftShoulderX;
let leftShoulderY;
let rightShoulderX;
let rightShoulderY;
let rightElbowX;
let rightElbowY;
let leftElbowX;
let leftElbowY;
let rightWristX;
let rightWristY;
let leftWristX;
let leftWristY;
let noseX;
let noseY;

let boomX;//左右肩膀处引线的x坐标
let boomY;//左右肩膀处引线的y坐标

let dis;//clienti（i！=0）左右肩膀之间的距离

let bulletY;//clienti（i！=0）中子弹的y坐标

let clientState = 0;//clienti（i！=0）中是否处于可判定状态的标志位
let client0State = [];//client0中各个炮塔是否处于可判定状态的标志位

let clientNumberString;//收到自己为第几号客户端的中间媒介

let clientNumber;//明确自己为第几号客户端
let clientNumbers;//客户端总数目
let bulletNumber = 0;//clienti（i！=0）中判定成功的子弹数目
let bulletNumber0 = [];//玩家0收到的各个玩家判定成功的子弹数目

let color = ['red', '94,203,246' , 'yellow', 'green', 'orange', 'skyblue'];
let colorAll = ['white'];

let virusHP = 100;

let button;
let gameState = 0; //游戏开始，游戏结束
let tower = [];//玩家0处的炮塔

let scores = 0;
let step;
let amount = 0;
var socket;

let x =[];//移动的子弹的x坐标
let y = [];//移动的子弹的y坐标
let towerReadyX = [];//可以发射子弹的炮塔的x坐标
let towerReadyY = [];//可以发射子弹的炮塔的y坐标

let shoulderDis = [];//记录clienti(i!=0)两个肩膀的距离
let colori = [];//发射的子弹的颜色要对应炮塔的颜色

let flag = [];
let myFont;

function preload() {
    // spritesheet = loadImage('flakes32.png');
    towerImg = loadImage('/image/tower.png');
    changtiao = loadImage('/image/changtiao.png');
    virus = loadImage('/image/walk.gif');
    virus2 = loadImage('/image/walk.gif');
    redFlag = loadImage('/image/redFlag.gif');
    blueFlag = loadImage('/image/blueFlag.gif');
    yellowFlag = loadImage('/image/yellowFlag.gif');
    greenFlag = loadImage('/image/greenFlag.gif');
    shoulder = loadImage('/image/shoulder.png');
    bomb = loadImage('/image/bomb.png');
    myFont = loadFont('vt323.ttf');
    torch = loadImage('/image/Torch.gif');
}

function setup() {
    textFont(myFont);
    flag.push(redFlag, blueFlag, yellowFlag, greenFlag);
    ellipseMode(RADIUS);
    imageMode(CORNER);
    createCanvas(windowWidth, windowHeight);
    socket = io.connect('http://10.12.19.75:3002/');
    // socket = io.connect('http://10.27.122.110:3000/');
    // socket = io.connect('http://10.12.19.75:3000/');
    //准备camera
    video = createCapture(VIDEO);
    video.size(windowWidth, windowHeight);
    video.hide();
    colorAll.push(color);
    poseNet = ml5.poseNet(video, modelLoaded);
    poseNet.on('pose', gotPoses);
    rectMode(CORNERS);// rect() 的前两个参数解读成形状其中一个角落的位置，而第三和第四个参数则被解读成对面角落的位置

    let body=document.getElementById("body");
    mydiv=document.createElement("div");
    body.appendChild(mydiv);//把div作为body的子元素

    bulletY = height/2;

    //明确自己是第几号客户端
    socket.on('clientState', function (clientState){
        clientNumberString = clientState;//收到自己为第几号客户端
        clientNumber = parseInt(clientNumberString);
    })

    //这里应该不需要，在用到的地方用push就可以
    for(let i = 0; i < 100; i++){
        bulletNumber0[i] = 0;
        client0State[i] = 0;
    }

    //接收客户端的数量并初始化炮塔
    socket.on('clientNumbers', function (clientNumbersServer){
        clientNumbers = clientNumbersServer;//接收目前有多少个客户端
        //console.log(clientNumbers);
        for(let i = 1; i < clientNumbers; i++){//初始化客户端
            let clientX = [];
            let clientY = [];
            let bulletColor = [];
            clientX[i] = width/clientNumbers*i + 1;
            // if(clientX[i] > width/2)
            clientY[i] = height/1.35;
            if(i == clientNumber){
                bulletNumber0[i] = 0;
            }
            bulletColor[i] = color[i-1];
            tower[i] = new Tower(i, clientX[i], clientY[i], bulletNumber0[i], bulletColor[i], shoulderDis[i]);
        }
    })

    //加分函数
    socket.on('addBullet0', function(clientNum){
        for(let i = 1; i < clientNumbers; i++){
            if(i == clientNum){
                bulletNumber0[i]++;
                tower[i].number = bulletNumber0[i];
                console.log(tower[i].number);
            }
        }
    })
    //减分函数
    socket.on('reduceBullet0', function(clientNum){
        bulletNumber--;
    })

    //接收来自客户端的肩膀距离
    socket.on('dis0', function(b){
        //console.log(b);
        shoulderDis[b[0]] = b[1];//把第i个客户端的肩膀距离放入数组的i位置
        for(let i = 1; i < shoulderDis.length; i++){
            // console.log('第'+i+'个客户端肩膀距离为'+shoulderDis[i]);
            tower[i].shoulderDis = shoulderDis[i];
        }

    })

}

function gotPoses(poses){
    if(poses.length > 0){
        pose = poses[0].pose;
    }
}

function modelLoaded(){
    console.log('poseNet ready');
}
//按下按键用于调试
function keyPressed(){
    socket.emit('addBullet', clientNumber);//把自己的客户端号送给服务端，以表示一次加弹药
}

function draw() {


    // translate(video.width, 0);//视频左右翻转
    // scale(-1, 1);
    background(0, 0, 0);
    image(video, 0, 0, width, width * video.height / video.width);
    //image(redFlag,0,0,100,100);
    // for(let i = 0; i<clientNumbers; i++){
    //     //console.log('clientNumber0: '+clientNumber0);
    //     let shadowColor = colorAll[i];
    //     if(clientNumber == i){
    //         mydiv.style.boxShadow= "inset 0 0 150px "+shadowColor;
    //     }
    // }

    poseReady();//定位肩膀关键点

    if(clientNumber == 0){
        //在左上角用文字写规则
        textFont('Helvetica');
        fill(84, 54, 54);
        textSize(25);
        text('炸弹大师💣：', width/30, height/10 );
        text('使用你的魔法鼻子火炬，点燃并发射炸弹！', width/30, height/10+30 );
        text('能量工程师💪：', width/30, height/10+60 );
        text('通过扭动肩膀，创造炸弹！', width/30, height/10+90 );
        text('加油，怪物爆破队！🎉👾💥', width/30, height/10+120 );
        // text('sha', width/1.7+50, height/9+2);

        textFont(myFont);

        //画出病毒
        fill('purple');
        // fill(94, 203, 246);
        //ellipse(width/2, height/5, 80);
        image(virus2, width/2-100, height/5-130, 250, 250);
        textSize(90);
        text('HP:' + virusHP, width/1.7+50, height/9+2);//病毒剩余血量

        //画出鼻子上的标引线
        boomX = noseX;
        boomY = noseY;
        // ellipse(boomX, boomY, 50);
        image(torch, boomX-100, boomY-100, 200, 200);

        //画出炮塔的位置
        for(let i = 1; i < clientNumbers; i++){
            tower[i].towerPosition();
            panDing();
        }
        //画出从炮塔到病毒的子弹
        for(let i = 0; i < towerReadyX.length; i++){
            drawEllipse(towerReadyX[i], towerReadyY[i]-100, width/2, height/5, i);
            
        }

        //肩膀触碰子弹以开始游戏

    }else{
        if(pose){
            //显示玩家名称
            for(let i = 1; i < clientNumbers; i++){
                if(i == clientNumber){
                    textSize(100);
                    fill(color[i-1]);
                    text('Player'+i, 100, 100)
                    // console.log(i);
                }
            }
            //画出左右肩膀的位置
            fill('red');
            ellipse(leftShoulderX, leftShoulderY, 50);
            fill('white');
            ellipse(rightShoulderX, rightShoulderY, 50);
            //计算左右肩膀的距离
            dis = dist(leftShoulderX, leftShoulderY, rightShoulderX, rightShoulderY);
            let clientNumberDis = [clientNumber, dis];
            socket.emit('dis',clientNumberDis);
            //距离小于某一个值记为一次判定成功
            if(dis < 350 & clientState == 0){
                for (let i = 1; i < clientNumbers; i++){
                    fill(color[i-1]);
                }
                bulletY-=5;
                //ellipse(width/2, bulletY, 50);
                //if(bulletY < 0){
                    bulletY = height/2;
                    clientState = 1;
                    bulletNumber++;

                    socket.emit('addBullet', clientNumber);//把自己的客户端号送给服务端，以表示一次加弹药
                //}
            }
            if(dis > 500 & clientState == 1){
                clientState = 0;
            }
        }
    }

}

//每个玩家对应的炮塔的类
class Tower{
    constructor(i, x, y, number, color, shoulderDis) {
        this.i = i;//炮塔归属于第几个玩家
        this.x = x;//炮塔的x位置坐标
        this.y = y;//炮塔的y位置坐标
        this.number = number;//炮塔剩余的子弹数目
        this.color = color;//弹药的颜色
        this.shoulderDis = shoulderDis;//肩膀的距离
    }
    // image
    //炮塔的位置
    towerPosition(){

        image(flag[this.i-1], this.x+80, this.y-130, 100, 150);

        image(towerImg, this.x-40, this.y-40, 200, 200);
        fill(this.color);
        textSize(64);
        text('x'+this.number, this.x+30, this.y-50);//写出炮弹个数
        image(bomb, this.x-25, this.y-110, 70, 70);
        //rect(this.x-30, this.y+20, this.x+70, this.y+40);//

        image(changtiao, this.x-34, this.y+130, 200, 40);


        if(this.shoulderDis < 350){
            this.shoulderDis = 350;
        }
        if(this.shoulderDis > 600){
            this.shoulderDis = 600;
        }
        //fill('white');
        // let w = 96-4*this.shoulderDis/25;
        let w = 204 - 17*this.shoulderDis/50;

        image(shoulder, this.x-30+10-30-20-20+18+w, this.y+20+10+30+20+20+5, 100, 100)
        image(shoulder, this.x-30+10-30-20-20+170+18-w, this.y+20+10+30+20+20+5, 100, 100)

    }
    //计算并比较鼻子和炮塔的距离
    towerShoulderDis(){
        this.dis = dist(this.x, this.y, boomX, boomY);
        if(this.dis < 200 & this.number > 0){
            // this.number--;
            return 1;
        }
        else if(this.dis > 300){
            return 2;
        }else{
            return 0;
        }
    }
}


//从一个点以直线方式移动到另一个点
function drawEllipse(x1, y1, x2, y2, i){
    let fenShu = 50;
    step = (x2-x1)/fenShu;//步长

    if(y[i]>height/5+10){
        image(bomb, x[i], y[i], 70, 70)
    }
    if(y[i] > y2){
        x[i]+=step;
        y[i] = (y2-y1)/(x2-x1)*(x[i]-x1)+y1;
    }
}

//使用PoseNet定位身体关键点
function poseReady(){
    if(pose){
        leftShoulderX = pose.leftShoulder.x;
        leftShoulderY = pose.leftShoulder.y;
        rightShoulderX = pose.rightShoulder.x;
        rightShoulderY = pose.rightShoulder.y;
        rightElbowX = pose.rightElbow.x;
        rightElbowY = pose.rightElbow.y;
        leftElbowX = pose.leftElbow.x;
        leftElbowY = pose.leftElbow.y;
        rightWristX = pose.rightWrist.x;
        rightWristY = pose.rightWrist.y;
        leftWristX = pose.leftWrist.x;
        leftWristY = pose.leftWrist.y;
        noseX = pose.nose.x;
        noseY = pose.nose.y;
    }
}

//判定鼻子和炮塔的距离成功后进行的操作
function panDing(){
    for(let i = 1; i < clientNumbers; i++) {
        if (tower[i].towerShoulderDis() == 1 && client0State[i] == 0) {
            virusHP--;
            scores++;
            tower[i].number--;
            bulletNumber0[i]--;
            client0State[i] = 1;
            socket.emit('reduceBullet', i);//把减少弹药的客户端号传给服务器，表示该客户端减少一个弹药
            towerReadyX.push(tower[i].x);//记录要发射子弹的炮塔的x坐标，大于等于0就需要画drawEllipse
            towerReadyY.push(tower[i].y);
            x.push(tower[i].x)
            y.push(tower[i].y)
            colori.push(i);

        } else if (tower[i].towerShoulderDis() == 2 && client0State[i] == 1) {
            client0State[i] = 0;
        }
    }
}