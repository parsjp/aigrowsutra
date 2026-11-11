/* AIGrowSutra — shared behaviours: nav, reveal-on-scroll, toast, newsletter. */

(function () {
  'use strict';

  /* ------------------------------------------------ mobile nav */
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.innerHTML = open
        ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
        : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    });
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('open') && !nav.contains(e.target) && !toggle.contains(e.target)) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ------------------------------------------------ active nav link */
  const path = location.pathname.replace(/\/+$/, '') || '/';
  document.querySelectorAll('.site-nav a[data-nav]').forEach((a) => {
    const target = a.getAttribute('href').replace(/\/+$/, '') || '/';
    if (target === path) a.classList.add('active');
  });

  /* ------------------------------------------------ reveal on scroll */
  const revealables = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && revealables.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('revealed'));
  }

  /* ------------------------------------------------ toast helper */
  let toastTimer = null;
  window.toast = function (message, kind) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = 'toast show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.className = 'toast' + (kind ? ' ' + kind : '');
    }, 3800);
  };

  /* ------------------------------------------------ newsletter form */
  const form = document.getElementById('newsletter-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type="email"]');
      const email = (emailInput.value || '').trim();
      const button = form.querySelector('button');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        window.toast('Please enter a valid email address.', 'error');
        emailInput.focus();
        return;
      }
      button.disabled = true;
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Something went wrong.');
        window.toast(data.message || "You're on the list!", 'success');
        emailInput.value = '';
      } catch (err) {
        window.toast(err.message || 'Something went wrong.', 'error');
      } finally {
        button.disabled = false;
      }
    });
  }

  /* ------------------------------------------------ hero stat count-up */
  const statEls = Array.from(document.querySelectorAll('[data-count]'));
  if (statEls.length) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fmt = (el, value) => {
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      const suffix = el.dataset.suffix || '';
      return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    };
    const animate = (el) => {
      const target = parseFloat(el.dataset.count);
      if (!isFinite(target) || reducedMotion) { el.textContent = fmt(el, target); return; }
      const duration = 1300;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(el, target * eased);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = fmt(el, target);
      };
      requestAnimationFrame(tick);
    };
    const liveStats = fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    const giveUp = new Promise((resolve) => setTimeout(resolve, 700));
    Promise.race([liveStats, giveUp]).then((stats) => {
      if (stats && stats.prompts) {
        const el = document.querySelector('[data-stat="prompts"]');
        if (el) el.dataset.count = String(stats.prompts);
      }
      statEls.forEach(animate);
    });
  }

  /* ------------------------------------------------ trending prompts (landing) */
  const trendingGrid = document.getElementById('trending-grid');
  if (trendingGrid) {
    const escapeHtml = (s) =>
      String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const copyText = async (text) => {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(ta);
          return ok;
        } catch (e2) {
          return false;
        }
      }
    };
    const trendingCard = (p) => {
      const el = document.createElement('article');
      el.className = 'prompt-card';
      const badges = [
        '<span class="badge badge-cat">' + escapeHtml(p.category) + '</span>',
        '<span class="badge badge-type">' + escapeHtml(p.type) + '</span>',
      ];
      if (p.for_devs) badges.push('<span class="badge badge-dev">Dev</span>');
      el.innerHTML =
        '<div class="prompt-badges">' + badges.join('') + '</div>' +
        '<h3><a href="/prompts?q=' + encodeURIComponent(p.act || '') + '">' + escapeHtml(p.act) + '</a></h3>' +
        '<div class="prompt-excerpt">' + escapeHtml(p.prompt) + '</div>' +
        '<footer><span class="prompt-contrib" title="Contributor">' + (p.contributor ? 'by ' + escapeHtml(p.contributor) : 'community prompt') + '</span>' +
        '<div class="prompt-actions">' +
        '<button class="icon-btn act-expand" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>Full</button>' +
        '<button class="icon-btn act-copy" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>Copy</button>' +
        '</div></footer>';
      const excerpt = el.querySelector('.prompt-excerpt');
      el.querySelector('.act-expand').addEventListener('click', (ev) => {
        const expanded = el.classList.toggle('expanded');
        excerpt.classList.toggle('expanded', expanded);
        excerpt.style.display = expanded ? 'block' : '';
        ev.currentTarget.lastChild.textContent = expanded ? ' Less' : ' Full';
      });
      el.querySelector('.act-copy').addEventListener('click', async (ev) => {
        const btn = ev.currentTarget;
        if (await copyText(p.prompt)) {
          btn.classList.add('copied');
          btn.lastChild.textContent = ' Copied!';
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.lastChild.textContent = ' Copy';
          }, 1800);
        } else {
          window.toast('Copy failed — expand the prompt and copy manually.', 'error');
        }
      });
      return el;
    };
    const dayPage = (Math.floor(Date.now() / 864e5) % 8) + 1; /* rotates daily */
    fetch('/api/prompts?category=' + encodeURIComponent('AI & Agents') + '&limit=3&page=' + dayPage)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('request failed'))))
      .then((data) => {
        const items = (data && data.items) || [];
        trendingGrid.innerHTML = '';
        if (!items.length) throw new Error('empty');
        items.forEach((p) => trendingGrid.appendChild(trendingCard(p)));
      })
      .catch(() => {
        trendingGrid.innerHTML =
          '<div class="library-empty"><h3>Live prompts are warming up</h3>' +
          '<p>The library is still loading — <a href="/prompts">open the full library here</a>.</p></div>';
      });
  }

  /* ------------------------------------------------ scroll progress + back-to-top */
  const progressBar = document.getElementById('scroll-progress-bar');
  const toTop = document.getElementById('to-top');
  if (progressBar || toTop) {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      if (progressBar) progressBar.style.width = (ratio * 100).toFixed(2) + '%';
      if (toTop) toTop.classList.toggle('show', window.scrollY > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    if (toTop) {
      toTop.addEventListener('click', () => {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      });
    }
  }

  /* ------------------------------------------------ footer year */
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();
