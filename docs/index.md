---
hide:
  - navigation
  - toc
home: true
---

<div class="hero-section">
  <h1>欢迎来到我的知识库</h1>
  <p id="typing-effect"></p>
  <div class="hero-buttons">
    <a href="机械/未来方向/" class="hero-btn hero-btn--primary">开始探索 →</a>
    <a href="About/关于本站/" class="hero-btn">关于本站</a>
  </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function () {
  const el = document.getElementById('typing-effect');
  const texts = [
    '记录机械设计 · PLC · 工程技术的成长旅程',
    '知识来自实践，分享源于热爱',
  ];
  let t = 0, c = 0, del = false;
  function run() {
    const cur = texts[t];
    if (!del && c < cur.length) {
      el.innerHTML = cur.substring(0, ++c) + '<span class="cursor"></span>';
      setTimeout(run, 70);
    } else if (del && c > 0) {
      el.innerHTML = cur.substring(0, --c) + '<span class="cursor"></span>';
      setTimeout(run, 35);
    } else if (!del) {
      setTimeout(() => { del = true; run(); }, 2200);
    } else {
      del = false; t = (t + 1) % texts.length;
      setTimeout(run, 500);
    }
  }
  run();
});
</script>