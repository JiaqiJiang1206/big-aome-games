// utils.js

// 存储所有浮动图片的引用
const floatingImages = new Map();

/**
 * 在页面指定位置插入一个图片
 * @param {string} id - 图片元素的唯一标识符
 * @param {string} src - 图片路径（相对路径或 URL）
 * @param {number} x - 图片左上角的 x 坐标（以 px 为单位）
 * @param {number} y - 图片左上角的 y 坐标
 * @param {number} width - 图片宽度
 * @param {number} height - 图片高度（如未提供，则默认等于宽度）
 */
export function addFloatingImage(id, src, x, y, width = 100, height) {
  height = height || width; // 如果未提供高度，则使用宽度

  let img = floatingImages.get(id);

  if (!img) {
    img = document.createElement('img');
    img.id = id;
    img.src = src;
    img.style.position = 'absolute';
    img.style.pointerEvents = 'none'; // 避免阻挡交互
    img.style.zIndex = '999'; // 层级高于 canvas
    document.body.appendChild(img);
    floatingImages.set(id, img);
  }

  img.style.width = `${width}px`;
  img.style.height = `${height}px`;
  img.style.left = `${x - width / 2}px`; // 居中对齐
  img.style.top = `${y - height / 2}px`;
}

/**
 * 移除指定的浮动图片
 * @param {string} id - 图片元素的唯一标识符
 */
export function removeFloatingImage(id) {
  const img = floatingImages.get(id);
  if (img) {
    img.remove();
    floatingImages.delete(id);
  }
}

/**
 * 显示分数增加的动画效果
 * @param {number} x - 动画显示的 x 坐标
 * @param {number} y - 动画显示的 y 坐标
 * @param {number} amount - 增加的分数
 */
export function showScoreAnimation(x, y, amount = 10) {
  const scoreText = document.createElement('div');
  scoreText.textContent = `+${amount}`;
  scoreText.style.position = 'absolute';
  scoreText.style.left = `${x}px`;
  scoreText.style.top = `${y}px`;
  scoreText.style.color = 'yellow';
  scoreText.style.fontSize = '32px';
  scoreText.style.fontFamily = 'VT323, monospace';
  scoreText.style.pointerEvents = 'none';
  scoreText.style.zIndex = '1000';
  scoreText.style.textShadow = '0 0 5px #ff0';
  document.body.appendChild(scoreText);

  // 动画效果 - 向上飘动并消失
  let opacity = 1;
  let posY = y;

  const animate = () => {
    opacity -= 0.02;
    posY -= 1;
    scoreText.style.opacity = opacity;
    scoreText.style.top = `${posY}px`;

    if (opacity > 0) {
      requestAnimationFrame(animate);
    } else {
      document.body.removeChild(scoreText);
    }
  };

  requestAnimationFrame(animate);
}
