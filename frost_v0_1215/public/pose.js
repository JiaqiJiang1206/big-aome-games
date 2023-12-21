
let loaded = false;
let showCamera = true; 


function onResults(results) {

  if (showCamera){
    //画出人物
    // canvasCtx.drawImage(
    //   results.image, 0, 0, canvas.width, canvas.height);
    try{
        //画出骨架
      // drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
      //   {color: '#00FF00', lineWidth: 4});

      // console.log(results.poseLandmarks[0].x);

      //在鼻子处画一个圆形
      noseX = results.poseLandmarks[0].x * canvas.width;
      noseY = results.poseLandmarks[0].y* canvas.height;
      // canvasCtx.beginPath();
      // canvasCtx.arc(noseX, noseY, 10, 0, 2 * Math.PI);
      // canvasCtx.fillStyle = 'red'; // 设置圆的填充颜色
      // canvasCtx.fill();
    }catch{
      console.log('error');
    }
    
  }
}

let pose = new Pose({locateFile: (file) => {
    return `node_modules/@mediapipe/pose/${file}`;
    }
});
pose.setOptions({
    modelComplexity: 0,
    smoothLandmarks: true,
    enableSegmentation: true,
    smoothSegmentation: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

pose.onResults(onResults);
function setPoseModelComplexity(complexity) {
    pose.setOptions({modelComplexity: complexity});
}
let camera = new Camera(videoElement, {
    onFrame: async () => {
      await pose.send({image: videoElement});
    }
});

camera.start();

