
let frostElementCount = frostElements.length;
let frostInterval;

// 绘制霜元素
function drawFrostElement(frostElement) {
    if(frostElement!=null){
        canvasCtx.globalAlpha = frostElement.opacity; // 设置透明度
        canvasCtx.drawImage(frostElement.image, frostElement.x - frostElement.selfRadius, frostElement.y - frostElement.selfRadius, frostElement.selfRadius * 2, frostElement.selfRadius * 2);
    } 
    // 更新元素位置和半径
    // frostElement.radius -= 0.1;
}

// 绘制所有霜元素
function drawAllFrostElements() {

    frostElements.forEach(drawFrostElement);
}

// 逐渐显示霜元素
function addFrostElement() {

    for(i = 0; i < frostIndex.length; i++){
        if(frostIndex[i] == 0){
            if(getDis(noseX,noseY,frostElements[i].x,frostElements[i].y)<100){
                continue;
            }
            frostElements[i].selfRadius = Math.random() *10 +40;
            frostIndex[i] = 1;
            break;
        }
    }
    // frostElements.push(createFrostElement());

    // 当霜元素达到6000个时，停止添加
    if(frostElementCount > 6000){
        clearInterval(frostInterval);
    }
}

// 设置定时器，每隔一段时间增加一个霜元素

frostInterval = setInterval(addFrostElement, 50);


// 绘制霜元素动画
function draw() {
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    //画出image
    canvasCtx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    drawAllFrostElements();

    requestAnimationFrame(draw);
}



// 开始绘制霜元素动画
draw();