/* AIGrowSutra — enrollment/contact form logic.
   Client-side validation, POST to /api/leads, inline errors, success panel. */

(function () {
  'use strict';

  const form = document.getElementById('enroll-form');
  if (!form) return;

  const wrap = document.getElementById('form-wrap');
  const status = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');
  const nameInput = document.getElementById('f-name');
  const emailInput = document.getElementById('f-email');
  const programSelect = document.getElementById('f-program');

  /* Prefill the program from ?program=... (links from home/courses pages). */
  const PROGRAM_MAP = {
    'ai-training': 'AI Training Foundations',
    'agent-building': 'AI Agent Building',
    'website-building': 'Full-Stack Website Building',
    'ai-expert': 'AI Expert Track',
    'community': 'Community (free)',
  };
  const requested = new URL(location).searchParams.get('program') || '';
  const mapped = PROGRAM_MAP[requested] || requested;
  if (mapped) {
    const match = Array.from(programSelect.options).find((o) => o.value === mapped);
    programSelect.value = match ? mapped : programSelect.value;
  }

  function setFieldError(input, errorEl, invalid) {
    const field = input.closest('.field');
    if (!field) return;
    field.classList.toggle('invalid', !!invalid);
    if (errorEl) errorEl.style.display = invalid ? 'block' : 'none';
  }

  function validate() {
    let ok = true;
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    const nameBad = name.length < 2;
    setFieldError(nameInput, document.getElementById('e-name'), nameBad);
    if (nameBad) ok = false;

    const emailBad = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    setFieldError(emailInput, document.getElementById('e-email'), emailBad);
    if (emailBad) ok = false;

    return ok;
  }

  [nameInput, emailInput].forEach((el) => {
    el.addEventListener('input', () => setFieldError(el, null, false));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.className = 'form-status';
    status.textContent = '';

    if (!validate()) {
      status.className = 'form-status error';
      status.textContent = 'Please fix the highlighted fields and try again.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Submitting…';

    const payload = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: document.getElementById('f-phone').value.trim(),
      program: programSelect.value,
      message: document.getElementById('f-message').value.trim(),
    };

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 201 && data.ok) {
        wrap.innerHTML = `
          <div class="success-panel">
            <div class="success-ring">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <h2>Application received!</h2>
            <p>Thanks, ${payload.name.split(' ')[0]} — we&rsquo;ve got your application for <b>${payload.program}</b>. Watch <b>${payload.email}</b> for your learning plan within 24 hours.</p>
            <a class="btn btn-primary" href="/prompts">Browse the prompt library meanwhile</a>
          </div>`;
        window.toast('Application submitted — check your inbox soon!', 'success');
      } else if (res.status === 400 && data.errors) {
        if (data.errors.name) setFieldError(nameInput, document.getElementById('e-name'), true);
        if (data.errors.email) setFieldError(emailInput, document.getElementById('e-email'), true);
        status.className = 'form-status error';
        status.textContent = Object.values(data.errors)[0];
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit application';
      } else {
        throw new Error(data.error || 'Something went wrong — please try again.');
      }
    } catch (err) {
      status.className = 'form-status error';
      status.textContent = err.message || 'Network error — please try again.';
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Submit application';
    }
  });
})();
