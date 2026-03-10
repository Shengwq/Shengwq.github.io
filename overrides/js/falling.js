/**
 * 飘落粒子动画
 * 参考 foorgange/foorgange.github.io 的实现，修复原版若干 Bug
 * 原理：Canvas 全屏固定层 + requestAnimationFrame 游戏循环
 * 支持：日间/夜间模式自动切换飘落物图片
 */

(function () {
  'use strict';

  // ── 配置项（按需修改） ──────────────────────────────────────
  var CONFIG = {
    count: 25,               // 同屏粒子数量
    lightImage: 'img/flower.webp',    // 亮色模式图片（树叶/花瓣）
    darkImage:  'img/leaf.png',   // 暗色模式图片（流星/星光）
    sizeMin: 0.2,            // 最小缩放比例
    sizeMax: 0.6,            // 最大缩放比例
    speedY: [1.5, 2.2],      // 下落速度范围 [min, max]
    driftX: -1.7,            // 水平漂移量（负数 = 向左）
    rotateSpeed: 0.03,       // 最大旋转速度
    drawSize: 40,            // Canvas 绘制基础尺寸(px) * scale
    opacity: 0.75,           // 粒子透明度（CSS 设置在 canvas 上）
  };
  // ──────────────────────────────────────────────────────────────

  var canvas, ctx, animId;
  var petalImg = null;
  var particles = [];
  var running = false;

  // ── 粒子类 ────────────────────────────────────────────────────
  function Particle() { this.reset(true); }

  Particle.prototype.reset = function (init) {
    this.s  = rand(CONFIG.sizeMin, CONFIG.sizeMax);
    this.r  = rand(0, Math.PI * 2);
    this.vr = rand(0, CONFIG.rotateSpeed);
    this.vy = rand(CONFIG.speedY[0], CONFIG.speedY[1]);
    this.vx = rand(-0.5, 0.5) + CONFIG.driftX;
    if (init) {
      // 初始化时随机散布整个屏幕，避免全部从顶部同时掉落
      this.x = rand(0, window.innerWidth);
      this.y = rand(0, window.innerHeight);
    } else {
      // 复位时从顶部或右侧重新出现
      if (Math.random() > 0.4) {
        this.x = rand(0, window.innerWidth);
        this.y = -CONFIG.drawSize;
      } else {
        this.x = window.innerWidth + CONFIG.drawSize;
        this.y = rand(0, window.innerHeight);
      }
    }
  };

  Particle.prototype.update = function () {
    this.x += this.vx;
    this.y += this.vy;
    this.r += this.vr;
    var size = CONFIG.drawSize * this.s;
    if (this.x > window.innerWidth + size || this.x < -size || this.y > window.innerHeight + size) {
      this.reset(false);
    }
  };

  Particle.prototype.draw = function () {
    if (!petalImg || !petalImg.complete || petalImg.naturalWidth === 0) return;
    var size = CONFIG.drawSize * this.s;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.r);
    ctx.drawImage(petalImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  };

  // ── 工具函数 ──────────────────────────────────────────────────
  function rand(min, max) { return min + Math.random() * (max - min); }

  function getTheme() {
    var scheme = document.body.getAttribute('data-md-color-scheme');
    return scheme === 'slate' ? 'dark' : 'light';
  }

  // ── Canvas 初始化 ─────────────────────────────────────────────
  function initCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'canvas_falling';
    canvas.style.cssText = [
      'position:fixed', 'left:0', 'top:0',
      'width:100vw', 'height:100vh',
      'pointer-events:none',
      'z-index:5',
      'opacity:' + CONFIG.opacity,
    ].join(';');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // ── 粒子初始化 ───────────────────��────────────────────────────
  function initParticles() {
    particles = [];
    for (var i = 0; i < CONFIG.count; i++) {
      particles.push(new Particle());
    }
  }

  // ── 游戏主循环 ────────────────────────────────────────────────
  function gameLoop() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    animId = requestAnimationFrame(gameLoop);
  }

  // ── 图片加载 ──────────────────────────────────────────────────
  function loadImage(callback) {
    var theme = getTheme();
    var src   = theme === 'dark' ? CONFIG.darkImage : CONFIG.lightImage;

    var newImg = new Image();
    newImg.onload = function () {
      petalImg = newImg;
      if (callback) callback();
    };
    newImg.onerror = function () {
      // 夜间模式图片加载失败时降级使用亮色图片
      if (theme === 'dark') {
        newImg.src = CONFIG.lightImage;
      }
    };
    newImg.src = src;
  }

  // ── 启动 / 停止 ───────────────────────────────────────────────
  function start() {
    if (running) return;
    running = true;
    initCanvas();
    initParticles();
    loadImage(function () {
      gameLoop();
    });
  }

  function stop() {
    running = false;
    if (animId) cancelAnimationFrame(animId);
    if (canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ── 主题切换监听 ───────────────────────────────────────────────
  function watchTheme() {
    var lastTheme = getTheme();

    // 监听 Material 主题切换的 radio 按钮
    document.querySelectorAll('input[data-md-color-scheme]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (this.checked) {
          setTimeout(function () {
            var newTheme = getTheme();
            if (newTheme !== lastTheme) {
              lastTheme = newTheme;
              loadImage(); // 换图但不重启粒子，过渡更平滑
            }
          }, 100);
        }
      });
    });

    // MutationObserver 兜底
    new MutationObserver(function () {
      var newTheme = getTheme();
      if (newTheme !== lastTheme) {
        lastTheme = newTheme;
        loadImage();
      }
    }).observe(document.body, {
      attributes: true,
      attributeFilter: ['data-md-color-scheme']
    });
  }

  // ── 入口：等 homepage 类出现后启动 ────────────────────────────
  function tryStart() {
    if (document.body && document.body.classList.contains('homepage')) {
      start();
      watchTheme();
    }
  }

  // 等待 DOM 加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(tryStart, 150); // 稍等 homepage 类被注入
    });
  } else {
    setTimeout(tryStart, 150);
  }

  // 监听 homepage 类被动态添加（因为 main.html 里是用 JS 注入的）
  new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      if (m.attributeName === 'class' && !running) {
        tryStart();
      }
    });
  }).observe(document.body || document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });

  // 离开首页时停止动画（支持 MkDocs 的 SPA 导航）
  document.addEventListener('DOMContentLoaded', function () {
    if (!document.body.classList.contains('homepage') && running) {
      stop();
    }
  });

})();