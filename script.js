'use strict';

(() => {
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const COLLAPSE_QUERY = '(min-width: 961px)'; // keep in sync with the 960px breakpoint in style.css

  /* ---------- Navigation: burger menu, scroll progress, active link ---------- */

  function initNavigation() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.getElementById('site-nav');
    const progress = document.querySelector('.scroll-progress');

    const setMenuOpen = (open) => {
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    };

    toggle.addEventListener('click', () => {
      setMenuOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setMenuOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.classList.contains('is-open')) {
        setMenuOpen(false);
        toggle.focus();
      }
    });

    window.matchMedia(COLLAPSE_QUERY).addEventListener('change', (event) => {
      if (event.matches) setMenuOpen(false);
    });

    const spyLinks = [...menu.querySelectorAll('a:not(.nav-links__cta)')];
    const spySections = spyLinks.map((link) => document.querySelector(link.getAttribute('href')));
    const SPY_LINE = 0.35; // a section is "current" once its top passes 35% of the viewport

    let framePending = false;

    const update = () => {
      framePending = false;

      const scrollable = root.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
      progress.style.setProperty('--scroll', ratio.toFixed(4));

      const line = window.innerHeight * SPY_LINE;
      let current = -1;
      spySections.forEach((section, index) => {
        if (section && section.getBoundingClientRect().top <= line) current = index;
      });

      spyLinks.forEach((link, index) => {
        link.classList.toggle('active', index === current);
        if (index === current) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    };

    const requestUpdate = () => {
      if (framePending) return;
      framePending = true;
      requestAnimationFrame(update);
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    update();
  }

  /* ---------- Demo run (simulated, no backend) ---------- */

  const ATTEMPTS = [
    { id: '#29', name: 'prompt-leak-probe', verdict: 'blocked' },
    { id: '#30', name: 'system-prompt-probe', verdict: 'blocked' },
    { id: '#31', name: 'role-override', verdict: 'blocked' },
    { id: '#32', name: 'context-leak', verdict: 'blocked' },
    { id: '#33', name: 'tool-arg-abuse', verdict: 'partial' },
    { id: '#34', name: 'indirect-exfil', verdict: 'blocked' },
    { id: '#41', name: 'role-override v2', verdict: 'LEAK' },
  ];
  const VERDICT_CLASS = { blocked: 'v-ok', partial: 'v-part', LEAK: 'v-leak' };

  const ATTEMPT_DELAY_MS = 560;
  const FINISH_DELAY_MS = 350;
  const PROGRESS_BEFORE_FINISH = 92; // percent; the last 8% is filled when the report appears
  const SCORE_ANIMATION_MS = 1300;

  function animateScore(ring) {
    const target = Number(ring.dataset.score);

    if (prefersReducedMotion) {
      ring.style.setProperty('--p', target);
      ring.textContent = target;
      return;
    }

    let start = null;
    const step = (now) => {
      if (start === null) start = now;
      const t = Math.min((now - start) / SCORE_ANIMATION_MS, 1);
      const value = Math.round(target * (1 - (1 - t) ** 3)); // ease-out cubic
      ring.style.setProperty('--p', value);
      ring.textContent = value;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function initDemo() {
    const runButton = document.getElementById('run-btn');
    const log = document.getElementById('log');
    const bar = document.getElementById('bar-fill');
    const status = document.getElementById('run-status');
    const report = document.getElementById('report');
    const ring = report.querySelector('.score-ring');

    const setStatus = (text, state) => {
      status.textContent = text;
      status.className = `status ${state}`;
    };

    const appendLogLine = ({ id, name, verdict }) => {
      const line = document.createElement('div');
      line.className = 'ln';

      const num = document.createElement('span');
      num.className = 'n';
      num.textContent = id;

      const text = document.createElement('span');
      text.className = 's';
      text.append(`${name} `);

      const result = document.createElement('span');
      result.className = VERDICT_CLASS[verdict];
      result.textContent = verdict;
      text.append(result);

      line.append(num, text);
      log.append(line);
      log.scrollTop = log.scrollHeight;
    };

    const reset = () => {
      log.replaceChildren();
      report.classList.remove('show');
      bar.style.width = '0%';
    };

    const finish = () => {
      setStatus('● прогон завершён', 'done');
      bar.style.width = '100%';
      report.classList.add('show');
      animateScore(ring);
      runButton.disabled = false;
      runButton.textContent = 'Запустить снова';
    };

    const run = () => {
      reset();
      runButton.disabled = true;
      runButton.textContent = 'Выполняется…';
      setStatus('● running', 'running');

      if (prefersReducedMotion) {
        ATTEMPTS.forEach(appendLogLine);
        finish();
        return;
      }

      let shown = 0;
      const tick = () => {
        if (shown === ATTEMPTS.length) {
          setTimeout(finish, FINISH_DELAY_MS);
          return;
        }
        appendLogLine(ATTEMPTS[shown]);
        shown += 1;
        bar.style.width = `${Math.round((shown / ATTEMPTS.length) * PROGRESS_BEFORE_FINISH)}%`;
        setTimeout(tick, ATTEMPT_DELAY_MS);
      };
      tick();
    };

    runButton.addEventListener('click', run);
  }

  /* ---------- Sign-up form (front-end only) ---------- */

  function initSignupForm() {
    const form = document.getElementById('cta-form');
    const email = document.getElementById('email');
    const note = document.getElementById('form-note');

    const showNote = (message, state) => {
      note.textContent = message;
      note.className = `form-note ${state}`;
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!email.checkValidity()) {
        showNote('Введите корректный email, чтобы мы могли ответить.', 'err');
        email.focus();
        return;
      }

      showNote('Готово — заявка принята. Это демо-лендинг, письма пока не отправляются.', 'ok');
      form.reset();
    });
  }

  /* ---------- Motion (skipped entirely for prefers-reduced-motion) ---------- */

  const REVEAL_STAGGER_MS = 100;
  const REVEAL_STAGGER_GROUP = 3; // delay restarts every N siblings, i.e. once per grid row

  function initScrollReveal() {
    const items = [...document.querySelectorAll('[data-reveal]')];

    if (!('IntersectionObserver' in window)) {
      items.forEach((item) => item.removeAttribute('data-reveal'));
      return;
    }

    items.forEach((item) => {
      const index = [...item.parentElement.children].indexOf(item);
      item.style.setProperty('--reveal-delay', `${(index % REVEAL_STAGGER_GROUP) * REVEAL_STAGGER_MS}ms`);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const item = entry.target;
          observer.unobserve(item);
          item.classList.add('is-visible');

          // Hand the element back to its regular styles once the reveal is over.
          item.addEventListener('transitionend', function release(event) {
            if (event.propertyName !== 'opacity') return;
            item.removeEventListener('transitionend', release);
            item.removeAttribute('data-reveal');
            item.style.removeProperty('--reveal-delay');
          });
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );

    items.forEach((item) => observer.observe(item));
  }

  const TILT_MAX_DEG = 4; // total tilt is ±TILT_MAX_DEG on each axis

  function initCardEffects() {
    if (!hasFinePointer) return;

    document.querySelectorAll('.feat, .step').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const tiltX = (y / rect.height - 0.5) * -2 * TILT_MAX_DEG;
        const tiltY = (x / rect.width - 0.5) * 2 * TILT_MAX_DEG;

        card.style.setProperty('--mx', `${x}px`);
        card.style.setProperty('--my', `${y}px`);
        card.style.transform = `perspective(700px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateY(-4px)`;
      });

      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
      });
    });
  }

  const RAIN_GLYPHS = [...'01{}[]<>/\\=+-*#$%&;:ABCDEFabcdef'];
  const RAIN_FONT_PX = 16;
  const RAIN_FRAME_MS = 60;
  const RAIN_ALERT_CHANCE = 0.03; // share of glyphs drawn in red (attack) instead of green

  function initCodeRain() {
    const canvas = document.querySelector('.hero-rain');
    const ctx = canvas && canvas.getContext('2d');
    if (!ctx) return;

    let columns = [];
    let visible = true;
    let lastFrame = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { clientWidth: width, clientHeight: height } = canvas;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Array.from({ length: Math.ceil(width / RAIN_FONT_PX) }, () => (Math.random() * height) / RAIN_FONT_PX);
    };

    const draw = (now) => {
      requestAnimationFrame(draw);
      if (!visible || now - lastFrame < RAIN_FRAME_MS) return;
      lastFrame = now;

      const { clientWidth: width, clientHeight: height } = canvas;
      ctx.fillStyle = 'rgba(6, 9, 10, 0.14)';
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${RAIN_FONT_PX}px "JetBrains Mono", monospace`;

      columns.forEach((row, column) => {
        const glyph = RAIN_GLYPHS[Math.floor(Math.random() * RAIN_GLYPHS.length)];
        ctx.fillStyle = Math.random() < RAIN_ALERT_CHANCE ? '#ff4242' : '#2ef06a';
        ctx.fillText(glyph, column * RAIN_FONT_PX, row * RAIN_FONT_PX);
        columns[column] = row * RAIN_FONT_PX > height && Math.random() > 0.96 ? 0 : row + 1;
      });
    };

    resize();
    window.addEventListener('resize', resize);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    }).observe(canvas);
    requestAnimationFrame(draw);
  }

  /* ---------- Init ---------- */

  root.classList.add('js');
  initNavigation();
  initDemo();
  initSignupForm();

  if (!prefersReducedMotion) {
    root.classList.add('motion');
    initScrollReveal();
    initCardEffects();
    initCodeRain();
  }
})();
