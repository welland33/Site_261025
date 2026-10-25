// 첫 화면 글자 등장, 받는 사람 바꾸기, 구매 버튼, 선물 문의 보내기
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. 첫 화면 큰 글자를 한 글자씩 감싸서 아래에서 올라오게 한다
  const hero = document.querySelector('.hero');
  const title = document.querySelector('.hero__title');
  if (title) {
    title.setAttribute('aria-label', title.textContent.replace(/\s+/g, ' ').trim());
    let i = 0;
    title.querySelectorAll('.hero__line').forEach((line) => {
      const text = line.textContent;
      line.textContent = '';
      line.setAttribute('aria-hidden', 'true');
      for (const c of text) {
        const span = document.createElement('span');
        span.className = 'ch';
        span.style.setProperty('--i', i++);
        span.textContent = c === ' ' ? ' ' : c;
        line.appendChild(span);
      }
    });
  }
  const start = () => requestAnimationFrame(() => hero && hero.classList.add('is-in'));
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
  setTimeout(start, 1200); // 글꼴이 늦어도 글자는 보이게

  // 2. "To." 뒤의 받는 사람을 천천히 바꾼다
  const word = document.querySelector('.tag__word');
  const people = ['엄마에게', '오랜 친구에게', '사랑하는 사람에게', '고마운 동료에게'];
  if (word && !reduce) {
    let n = 0;
    setInterval(() => {
      if (document.hidden) return;
      word.classList.add('is-out');
      setTimeout(() => {
        n = (n + 1) % people.length;
        word.textContent = people[n];
        word.classList.remove('is-out');
        word.classList.add('is-pre');
        void word.offsetWidth;
        word.classList.remove('is-pre');
      }, 700);
    }, 3200);
  }

  // 3. 구매 버튼 — 스토어 주소가 있으면 스토어로, 없으면 선물 문의로 안내한다
  const storeUrl = (document.querySelector('meta[name="store-url"]') || {}).content || '';
  const note = document.getElementById('store-note');
  const nameInput = document.getElementById('f-name');
  document.querySelectorAll('.js-store').forEach((a) => {
    if (storeUrl) {
      a.href = storeUrl;
      a.target = '_blank';
      a.rel = 'noopener';
      return;
    }
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (note) note.hidden = false;
      document.getElementById('inquiry').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      setTimeout(() => nameInput && nameInput.focus({ preventScroll: true }), reduce ? 0 : 700);
    });
  });

  // 4. 선물 문의 보내기
  const form = document.getElementById('inquiry-form');
  const status = document.getElementById('form-status');
  if (!form) return;
  const say = (msg, isError) => {
    status.textContent = msg;
    status.classList.toggle('is-error', !!isError);
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const contact = form.contact.value.trim();
    const consent = document.getElementById('f-consent').checked;
    if (!name || !contact) { say('이름과 연락처를 적어 주세요.', true); (name ? form.contact : form.name).focus(); return; }
    if (!consent) { say('개인정보 수집·이용에 동의해 주세요.', true); document.getElementById('f-consent').focus(); return; }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    say('보내는 중이에요…');
    try {
      const r = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          contact,
          quantity_budget: form.quantity_budget.value.trim(),
          consent,
          website: form.website.value,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || '보내지 못했어요. 잠시 뒤 다시 시도해 주세요.');
      form.reset();
      say('문의가 접수됐어요. 확인 후 연락드릴게요.');
    } catch (err) {
      say(err.message || '보내지 못했어요. 잠시 뒤 다시 시도해 주세요.', true);
    } finally {
      button.disabled = false;
    }
  });
})();
