  (function () {
    "use strict";
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- Demo run simulation ----------
    var btn = document.getElementById('run-btn');
    var log = document.getElementById('log');
    var bar = document.getElementById('bar-fill');
    var status = document.getElementById('run-status');
    var report = document.getElementById('report');

    var attempts = [
      ['#29', 'prompt-leak-probe', 'blocked', 'v-ok'],
      ['#30', 'system-prompt-probe', 'blocked', 'v-ok'],
      ['#31', 'role-override', 'blocked', 'v-ok'],
      ['#32', 'context-leak', 'blocked', 'v-ok'],
      ['#33', 'tool-arg-abuse', 'partial', 'v-part'],
      ['#34', 'indirect-exfil', 'blocked', 'v-ok'],
      ['#41', 'role-override v2', 'LEAK', 'v-leak']
    ];

    function resetDemo() {
      log.innerHTML = '';
      report.classList.remove('show');
      bar.style.width = '0%';
    }

    function addLine(a) {
      var ln = document.createElement('div');
      ln.className = 'ln';
      var cls = a[2] === 'blocked' ? 'v-ok' : (a[2] === 'LEAK' ? 'v-leak' : 'v-part');
      ln.innerHTML = '<span class="n">' + a[0] + '</span><span class="s">' + a[1] +
        ' <span class="' + cls + '">' + a[2] + '</span></span>';
      log.appendChild(ln);
      log.scrollTop = log.scrollHeight;
    }

    function finish() {
      status.textContent = '● прогон завершён';
      status.className = 'status done';
      bar.style.width = '100%';
      report.classList.add('show');
      btn.disabled = false;
      btn.textContent = 'Запустить снова';
    }

    function runDemo() {
      resetDemo();
      btn.disabled = true;
      btn.textContent = 'Выполняется…';
      status.textContent = '● running';
      status.className = 'status running';

      if (reduce) {
        attempts.forEach(function (a) { addLine(a); });
        finish();
        return;
      }

      var i = 0;
      var total = attempts.length;
      (function tick() {
        if (i >= total) { setTimeout(finish, 350); return; }
        addLine(attempts[i]);
        i++;
        bar.style.width = Math.round((i / total) * 92) + '%';
        setTimeout(tick, 560);
      })();
    }
    btn.addEventListener('click', runDemo);

    // ---------- CTA form (no backend) ----------
    var form = document.getElementById('cta-form');
    var email = document.getElementById('email');
    var note = document.getElementById('form-note');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = email.value.trim();
      if (!val || val.indexOf('@') < 1 || val.indexOf('.') < 0) {
        note.textContent = 'Введите корректный email, чтобы мы могли ответить.';
        note.className = 'form-note err';
        email.focus();
        return;
      }
      note.textContent = 'Готово — заявка принята. Это демо-лендинг, письма пока не отправляются.';
      note.className = 'form-note ok';
      form.reset();
    });
  })();

(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ---------- Scroll progress + active nav link ----------
  var progress = document.querySelector('.scroll-progress');
  var links = [].slice.call(document.querySelectorAll('.nav-links a'));
  var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var h = root.scrollHeight - window.innerHeight;
      if (progress) progress.style.setProperty('--scroll', h > 0 ? (window.scrollY / h).toFixed(4) : 0);
      var cur = -1, line = window.innerHeight * 0.35;
      sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= line) cur = i; });
      links.forEach(function (a, i) {
        a.classList.toggle('active', i === cur);
        if (i === cur) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  if (reduce) return; // below: purely decorative motion

  root.classList.add('js', 'motion');

  // ---------- Scroll reveal with stagger ----------
  var groups = [
    ['.sec-head', 0, ''], ['.prob-card.attack', 0, 'from-left'], ['.prob-card.defend', 120, 'from-right'],
    ['.step', 140, ''], ['.feat', 90, ''], ['.safety-item', 100, ''],
    ['.demo-wrap, #demo .wrap > *:not(.sec-head)', 0, ''], ['.cta-box', 0, '']
  ];
  var targets = [];
  groups.forEach(function (g) {
    [].slice.call(document.querySelectorAll(g[0])).forEach(function (el, i) {
      if (el.classList.contains('reveal')) return;
      el.classList.add('reveal');
      if (g[2]) el.classList.add(g[2]);
      el.style.setProperty('--d', (i % 3) * g[1] + 'ms');
      targets.push(el);
    });
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add('in'); });
  }

  // ---------- Cursor spotlight + 3D tilt on cards ----------
  if (fine) {
    [].slice.call(document.querySelectorAll('.feat, .step')).forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty('--mx', x + 'px');
        card.style.setProperty('--my', y + 'px');
        var rx = ((y / r.height) - 0.5) * -8, ry = ((x / r.width) - 0.5) * 8;
        card.style.transform = 'perspective(700px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-4px)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }

  // ---------- Score ring count-up when the report appears ----------
  var report = document.getElementById('report');
  var ring = report && report.querySelector('.score-ring');
  if (report && ring && 'MutationObserver' in window) {
    new MutationObserver(function () {
      if (!report.classList.contains('show')) { ring.style.setProperty('--p', 0); ring.textContent = '0'; return; }
      var t0 = null, dur = 1300;
      (function step(t) {
        if (t0 === null) t0 = t;
        var k = Math.min((t - t0) / dur, 1), v = Math.round(72 * (1 - Math.pow(1 - k, 3)));
        ring.style.setProperty('--p', v);
        ring.textContent = v;
        if (k < 1) requestAnimationFrame(step);
      })(performance.now());
    }).observe(report, { attributes: true, attributeFilter: ['class'] });
  }

  // ---------- Hero: code rain on canvas ----------
  var cv = document.querySelector('.hero-rain');
  if (cv && cv.getContext) {
    var ctx = cv.getContext('2d'), cols = [], fs = 16, raf = 0, visible = true;
    var chars = '01{}[]<>/\\=+-*#$%&;:ABCDEFabcdef'.split('');
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = []; for (var i = 0; i < Math.ceil(w / fs); i++) cols.push(Math.random() * h / fs);
    }
    var last = 0;
    function draw(t) {
      raf = requestAnimationFrame(draw);
      if (!visible || t - last < 60) return;
      last = t;
      var w = cv.clientWidth, h = cv.clientHeight;
      ctx.fillStyle = 'rgba(6,9,10,0.14)'; ctx.fillRect(0, 0, w, h);
      ctx.font = fs + 'px "JetBrains Mono", monospace';
      cols.forEach(function (y, i) {
        var ch = chars[(Math.random() * chars.length) | 0];
        ctx.fillStyle = Math.random() > 0.97 ? '#ff4242' : '#2ef06a';
        ctx.fillText(ch, i * fs, y * fs);
        cols[i] = (y * fs > h && Math.random() > 0.96) ? 0 : y + 1;
      });
    }
    size();
    window.addEventListener('resize', size);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(cv);
    }
    raf = requestAnimationFrame(draw);
  }
})();
