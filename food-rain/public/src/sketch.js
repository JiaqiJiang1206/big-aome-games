let snow1 = [];  //存放水果
let snow2 = []; //存放垃圾食品
let gravity;

let zOff = 0;

let Slicedfruits;
let Junkfoods;
let textures1 = []; //放裁剪好的水果素材
let textures2 = []; //放裁剪好的垃圾食品素材
let mouth1;
let mouth2;

// ml5 Face Detection Model
let faceapi;
let detections = [];

// Video
let video;
const faceOptions = { 
  withLandmarks: true, 
  withExpressions: false, 
  withDescriptors: false 
};

let username;
let start = false;
let $scoreLabel1 = document.querySelector('#score-label1');  //score1标签对应我的总分
let $nickname = document.querySelector('.nickname');  //nickname是按钮和输入框部分
let $myscore = document.querySelector('.my-score');  
let $instruction = document.querySelector('.instruction'); 

function preload() { //加载食物图片
  Slicedfruits = loadImage('../assets/Slicedfruits.png');
  //Junkfoods = loadImage('../assets/Cakes.png');
  Junkfoods = loadImage('../assets/doughnuts.png');
  mouth1 = loadImage('../assets/mouthClose.png');
  mouth2 = loadImage('../assets/mouthOpen.png');
  dingding = loadSound('../assets/dingding.mp3');
  dudu = loadSound('../assets/dudu.mp3');
  // console.log(dingding, dudu);
}

var socket; //创建一个 socket 对象
function setup() {
  createCanvas(windowHeight*1.78, windowHeight); //画布大小跟随窗口
  gravity = createVector(0, 0.2); //设定重力

  //裁剪水果素材
  for (let x = 0; x < Slicedfruits.width; x += 32) { //创建食物
    for (let y = 0; y < Slicedfruits.height; y += 32) {
      let img = Slicedfruits.get(x, y, 32, 32); //获取食物图片
      //image(img, x, y);  //取(x, y)处的图片
      //img.width = 150;
      //img.height = 150;
      //console.log(img);
      textures1.push(img); //放在textures里
      console.log(textures1);
    }
  }
  //裁剪垃圾食品素材
  w = Junkfoods.width / 10;
  h = Junkfoods.height / 5;
  for (let x = 0; x < Junkfoods.width; x += w) { //创建食物
    for (let y = 0; y < Junkfoods.height; y += h) {
      let img = Junkfoods.get(x, y, w, h); //获取食物图片
      image(img, x, y);  //取(x, y)处的图片
      textures2.push(img); //放在textures里
    }
  }

  // //裁剪特殊草坪素材
  // w = grasRandom.width / 4;
  // h = grasRandom.height / 8;
  // for (let x = 0; x < grasRandom.width; x += w) { 
  //   for (let y = 0; y < grasRandom.height; y += h) { 
  //     let img = grasRandom.get(x, y, w, h); 
  //     grasTextures.push(img); 
  //   }
  // }

  //生成掉落的水果放到snow1数组
  for (let i = 0; i < 5; i++) { //生成10个水果
    let x = random(width);
    let y = random(height);
    let design1 = random(textures1);
    snow1.push(new Snowflake(x, y, design1));  //最终生成的图片放入snow里
  }
  //生成掉落的垃圾食品放入snow2
  for (let i = 0; i < 5; i++) { //生成10个水果
    let x = random(width);
    let y = random(height);
    let design2 = random(textures2);
    snow2.push(new Snowflake(x, y, design2));  //最终生成的图片放入snow里
  }

  //准备camera
  video = createCapture(VIDEO);
  video.size(windowHeight*1.78, windowHeight);
  video.hide(); //让video显示在canvas上而不是堆叠元素
  faceapi = ml5.faceApi(video, faceOptions, faceReady); //调用api

  //新建一个socket连接到server
  document.querySelector('#update-nickname').addEventListener('click', () => { //按下按钮后连接到server
    start = true;
    socket = io.connect('http://10.12.19.75:3001'); 
    //socket = io.connect('https://webcam-food-rain.herokuapp.com/');
    //username = $("#nickname-input").attr("value");
    username = document.querySelector('#nickname-input').value;
    $nickname.style.display = 'none';
    $instruction.style.display = 'none';
    $myscore.style.display = 'inline';
    $scoreLabel1.innerHTML = username + ':' + '<span id="score1">0</span>';
    console.log('username: ', username);
  })
}


let mouthPos;
let hintLeft;
let hintRight;
let hintLeftStart = null;
let hintRightStart = null;
let hintStart = null;
let hintEnd = null;
let hintPos;
let plus;
function draw() {
  translate(video.width, 0); //flip the video
  scale(-1, 1);
  background(0, 255, 0);
  image(video, 0, 0, width, width * video.height / video.width);
  textSize(100);
  if (detections){
    if (detections.length > 0) {
      // mouthPos: detections[i].parts.mouth;
      mouthPos = drawLandmarks(detections);
      //console.log(mouthPos);
    }
  }
  if(start){
    zOff += 0.1;
    for (let i = 0; i < snow1.length; i += 1){
      flake1 = snow1[i];
      flake2 = snow2[i];
    //for (flake of snow) {
      let xOff1 = flake1.pos.x / width;
      let yOff1 = flake1.pos.y / height;
      let xOff2 = flake2.pos.x / width;
      let yOff2 = flake2.pos.y / height;
      //增加柏林噪声：https://p5js.org/zh-Hans/reference/#/p5/noise
      let wAngle1 = noise(xOff1, yOff1, zOff) * TWO_PI; 
      let wAngle2 = noise(xOff2, yOff2, zOff) * TWO_PI;
      let wind1 = p5.Vector.fromAngle(wAngle1);
      let wind2 = p5.Vector.fromAngle(wAngle2);
  
      //处理吃东西
      if(mouthPos){ //检测到嘴巴
        eat(mouthPos, flake1, i, true); //处理嘴巴是否吃到食物
        eat(mouthPos, flake2, i, false);
        //处理弹出得分提示
        //左侧or右侧 得分or减分
        if((hintLeftStart == null && hintRightStart != null)||
        (hintRightStart>hintLeftStart)){
            hintStart = hintRightStart;
            hintPos = hintRight;
            plus = true;
        }else if((hintRightStart == null && hintLeftStart != null)||
        (hintLeftStart > hintRightStart)){
            hintStart = hintLeftStart;
            hintPos = hintLeft;
            plus = false;
        }
        //text写出提示 显示3s
        if(hintEnd == null){
          hintEnd = second();
        }
        if(hintEnd != null && hintStart != null && (hintEnd - hintStart < 3)){
          //console.log(hintEnd, hintStart, hintEnd - hintStart);
          strokeWeight(4);
          hintPos._y -= 1.3;
          if(plus){
            // console.log('加分');
            text("🤩 |+", hintPos._x, hintPos._y);
          }else{
            // console.log('减分');
            text("😫 |-", hintPos._x, hintPos._y);
          }
          hintEnd = second();
        }
      }
      //飘～～～～～～～～～～～～～～～～～～
      wind1.mult(0.01);
      flake1.applyForce(gravity);
      flake1.applyForce(wind1);
      flake1.update();
      flake1.render(); 
      wind2.mult(0.01);
      flake2.applyForce(gravity);
      flake2.applyForce(wind2);
      flake2.update();
      flake2.render(); 
    }
  }
}

function faceReady() {
  faceapi.detect(gotFaces);
}


// Got faces
function gotFaces(error, result) {
  if (error) {
    console.log(error);
    return;
  }
  detections = result;
  faceapi.detect(gotFaces);
}

//处理检测到的面部关键点
function drawLandmarks(detections) {
  //console.log(detections);
  noFill();
  stroke(161, 95, 251);
  strokeWeight(2);
  for (let i = 0; i < detections.length; i += 1) {
    const mouth = detections[i].parts.mouth;
    //console.log(mouth);//mouth中是20个点的x,y值
    //const nose = detections[i].parts.nose;
    // const leftEye = detections[i].parts.leftEye;
    // const rightEye = detections[i].parts.rightEye;
    // const rightEyeBrow = detections[i].parts.rightEyeBrow;
    // const leftEyeBrow = detections[i].parts.leftEyeBrow;
    //游戏开始前显示嘴唇轮廓
    if (!start){ 
      drawPart(mouth, true);
    }
    //drawPart(nose, false);
    // drawPart(leftEye, true);
    // drawPart(leftEyeBrow, false);
    // drawPart(rightEye, true);
    // drawPart(rightEyeBrow, false);
    return mouth
  }
}

//画出具体的五官
function drawPart(feature, closed) {
  beginShape();
  for (let i = 0; i < feature.length; i += 1) {
    const x = feature[i]._x;
    const y = feature[i]._y;
    vertex(x, y);
    stroke(161, 95, 251);
    strokeWeight(9);
    //point(x, y);
  }
  if (closed === true) {
    endShape(CLOSE);
  } else {
    endShape();
  }
}


let score = 0;
let fruit = 0;
let dessert = 0;
let $score1 = document.querySelector('#score1');  //score1标签对应我的总分
let $score2 = document.querySelector('#score2');  //score1标签对应水果得分
let $score3 = document.querySelector('#score3');  //score1标签对应甜品得分
function eat(mouth, flake, i, plus){
  //print(mouth)
  let top = 999999;
  let bottom = -1;
  let left = 999999;
  let right = -1;

  for (point of mouth){ //找到嘴巴四个方向最大值
    top = min(top, point._y);
    bottom = max(bottom, point._y);
    left = min(left, point._x);
    right = max(right, point._x);
  }
  
  let mouthOpen = false;
  //判断嘴巴张开还是闭合
  if(bottom-top > 0.53*(right-left)){
    mouthOpen = true;
  }

  //嘴巴闭合
  if(!mouthOpen){ 
    //image(img, x, y, [width], [height])
    image(mouth1, left-0.32*3*(right-left), 0.85*top, 3*(right-left), 3*(bottom-top));
    //image(mouth1, left-0.1*3*(right-left), 0.5*top, 3*(right-left), 3*(bottom-top));
  }
  else{ 
    image(mouth2, left-0.32*3*(right-left), 0.85*top, 3*(right-left), 3*(bottom-top));
    //image(mouth2, left-0.1*3*(right-left), 0.5*top, 3*(right-left), 3*(bottom-top));
    //如果嘴巴张开 判断食物是否在嘴巴范围内
    if (flake.pos.y > top & flake.pos.y < bottom) {
      if (flake.pos.x > left & flake.pos.x < right) {
        if(plus && i > -1){
          //更新加分
          score += 1;
          fruit += 1;
          $score2.innerHTML = fruit;
          //处理得分提示
          hintRight = mouth[6]; 
          hintRightStart = second(); 
          //提示音
          dingding.play();
          snow1.splice(i, 1);  //这个img消失
          snow1.push(new Snowflake(random(width), random(height), random(textures1))); //再生成一个新的加入  
        }else if(!plus && i > -1){
          //更新减分
          score -= 1;
          dessert += 1;
          $score3.innerHTML = dessert;
          //处理得分提示
          hintLeft = mouth[12]; 
          hintLeftStart = second();
          //提示音
          dudu.play();
          snow2.splice(i, 1);  //这个img消失
          snow2.push(new Snowflake(random(width), random(height), random(textures2))); //再生成一个新的加入  
        }
        //更新myscore部分的信息
        $score1 = document.querySelector('#score1'); 
        $score1.innerHTML = score;
        //发送分数给server
        socket.emit('updateScore', score, username); 
      }
    }
  }
}


// let scoreList = 0;
// let $scoreList = document.querySelector('#score-list');
socket.on('displayScore', function (scores) {
  //console.log('receive scores: ', scores);
  sortLeaderboard(scores);
})


//let scoreLabel = document.getElementById("score-label");
let topScoreLabel = document.getElementById("top-label");
let scoreList = document.getElementById("score-list");
function sortLeaderboard(scores){
  //scoreLabel.innerHTML = "Score: " + myScore;
  console.log('111111111');
  let listItems = "";
  scores.forEach((bird) => {
    if(bird.username != ''){
      listItems +=
      "<li class='score-item'><span class='name'>" +
      bird.username +
      "</span><span class='points'>" +
      bird.score +
      "pts</span></li>";
    }
  });
  scoreList.innerHTML = listItems;
}
