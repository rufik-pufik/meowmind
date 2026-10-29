'use strict';

const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const $ = (selector, root = document) => root.querySelector(selector);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Active menu section and a single sticky header for the whole page.
const navLinks = $$('.nav a[data-section]');
const menu = $('#top-nav');
const toggle = $('.menu-toggle');
toggle.addEventListener('click', () => {
  const isOpen = menu.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(isOpen));
  toggle.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
});
$$('.nav a').forEach(link => link.addEventListener('click', () => {
  menu.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
}));

const sectionObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.section === id);
      });
    }
  }
}, { rootMargin: '-35% 0px -48% 0px', threshold: 0 });
['about', 'for-whom', 'features', 'benefits', 'faq'].forEach(id => {
  const node = document.getElementById(id);
  if (node) sectionObserver.observe(node);
});

// Reveal items only when reached by scrolling.
const revealObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  }
}, { threshold: 0.15 });
$$('.reveal').forEach(el => revealObserver.observe(el));

// About: switch exact exported Figma card art while preserving real,
// keyboard-accessible 01/02/03 controls and the existing sticky nav.
const aboutSlides = [
  { title: 'О нас', description: 'Помогаем владельцам котов чувствовать уверенность, а питомцам — получать правильный уход', art: 'assets/about-figma-card-01.png' },
  { title: 'Проверенные знания', description: 'Объясняем сложное простыми словами, опираясь на достоверные ветеринарные источники', art: 'assets/about-figma-card-02.png' },
  { title: 'Забота без паники', description: 'Помогаем разобраться в тревожных ситуациях и понять, когда питомцу нужна помощь ветеринара', art: 'assets/about-figma-card-03.png' }
];
let aboutIndex = 0;
const aboutArt = $('#about-art');
const aboutTabs = $$('.about-tab');
// Preload the two other images so switching feels immediate.
aboutSlides.slice(1).forEach(slide => { const image = new Image(); image.src = slide.art; });
function setAboutSlide(next) {
  if (next < 0 || next >= aboutSlides.length || next === aboutIndex) return;
  aboutIndex = next;
  aboutArt.src = aboutSlides[next].art;
  const mobileArt = $('#about-mobile-art');
  if (mobileArt) mobileArt.src = window.matchMedia('(max-width: 600px)').matches ? 'assets/about-mobile-kitten-clean.png' : `assets/about-mobile-0${next + 1}.webp`;
  const mobileTitle = $('#about-mobile-title');
  const mobileDesc = $('#about-mobile-desc');
  if (mobileTitle) mobileTitle.textContent = aboutSlides[next].title;
  if (mobileDesc) mobileDesc.textContent = aboutSlides[next].description;
  $('#about-title').textContent = aboutSlides[next].title;
  $('#about-desc').textContent = aboutSlides[next].description;
  $('#about').dataset.aboutVariant = String(next);
  aboutTabs.forEach((tab, index) => {
    tab.classList.toggle('active', index === next);
    tab.setAttribute('aria-selected', String(index === next));
    tab.tabIndex = index === next ? 0 : -1;
  });
}
aboutTabs.forEach((tab, index) => {
  tab.tabIndex = index === aboutIndex ? 0 : -1;
  tab.addEventListener('click', () => setAboutSlide(index));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (aboutIndex + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
    setAboutSlide(next);
    aboutTabs[next].focus();
  });
});

// Two independent infinite horizontal belts: they can be dragged with mouse/touch.
function makeMarquee(container, speed) {
  const track = $('.carousel-track', container);
  const originals = Array.from(track.children);
  originals.forEach(item => {
    const clone = item.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });
  let offset = container.dataset.marquee === 'audience' ? 128 : 0;
  let last = null;
  let held = false;
  let lastX = 0;
  let paused = false;
  let width = 0;
  let raf;
  const measure = () => {
    const first = originals[0];
    const clone = track.children[originals.length];
    if (!first || !clone) return;
    width = clone.offsetLeft - first.offsetLeft;
  };
  measure();
  const normalize = () => {
    if (width <= 0) return;
    offset = ((offset % width) + width) % width;
    track.style.transform = `translate3d(${-offset}px, 0, 0)`;
  };
  container.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    held = true;
    lastX = e.clientX;
    container.classList.add('dragging');
    container.setPointerCapture(e.pointerId);
  });
  container.addEventListener('pointermove', e => {
    if (!held) return;
    offset -= e.clientX - lastX;
    lastX = e.clientX;
    normalize();
  });
  const release = () => { held = false; container.classList.remove('dragging'); };
  container.addEventListener('pointerup', release);
  container.addEventListener('pointercancel', release);
  // Keyboard access for the manually scrollable Figma photo ribbon.
  if (container.dataset.marquee === 'audience') {
    container.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      offset += event.key === 'ArrowRight' ? 120 : -120;
      normalize();
    });
  }
  container.addEventListener('mouseenter', () => { paused = true; });
  container.addEventListener('mouseleave', () => { paused = false; release(); });
  const render = now => {
    if (last == null) last = now;
    const elapsed = Math.min(now - last, 50);
    last = now;
    if (!held && !paused && !reducedMotion.matches && !document.hidden) {
      offset += elapsed / 1000 * speed;
      normalize();
    }
    raf = requestAnimationFrame(render);
  };
  raf = requestAnimationFrame(render);
  window.addEventListener('resize', () => { measure(); normalize(); });
  return () => cancelAnimationFrame(raf);
}
$$('[data-marquee]').forEach(el => makeMarquee(el, el.dataset.marquee === 'ribbon' ? 70 : 27));

// Benefits: a single vertical lane. Each card slides out through the top
// while the next enters from the bottom. No cards overlap or remain stacked.
// The movement responds to real page scrolling in either direction.
const benefits = document.querySelector('#benefits');
const benefitsSticky = benefits.querySelector('.benefits-sticky');
const benefitCards = Array.from(benefits.querySelectorAll('.flip-card'));
let activeCard = 0;
let benefitsQueued = false;
const clamp01 = v => Math.max(0, Math.min(1, v));
const phase = (progress, start, end) => clamp01((progress - start) / (end - start));

function updateBenefits() {
  benefitsQueued = false;
  // The mobile Figma design shows three separate vertical cards instead of
  // the desktop scroll-driven single-lane animation. All three can flip.
  if (window.matchMedia('(max-width: 600px)').matches) {
    benefitCards.forEach((card) => {
      card.style.setProperty('--lane-offset', '0px');
      card.style.pointerEvents = 'auto';
      card.tabIndex = 0;
      card.setAttribute('aria-hidden', 'false');
    });
    return;
  }
  const rect = benefits.getBoundingClientRect();
  const scrollable = Math.max(1, benefits.offsetHeight - window.innerHeight);
  const progress = clamp01(-rect.top / scrollable);
  const first = phase(progress, 0.14, 0.39);
  const second = phase(progress, 0.52, 0.77);
  const stageHeight = benefitsSticky.clientHeight;
  const cardHeight = benefitCards[0].offsetHeight;
  // A full off-screen distance, so no previous/next card peeks from the edge.
  const travel = Math.max((stageHeight + cardHeight) / 2 + 50, cardHeight * 1.6);
  // Bring the leaving and incoming cards closer together while they cross
  // the frame. The ends still travel completely off screen; mid-transition
  // the cards never overlap. This is reversible with natural scrolling.
  const desiredGap = Math.max(54, Math.min(130, stageHeight * 0.14));
  const closeness = Math.max(0, travel - cardHeight - desiredGap) / 2;
  const easeFirst = Math.sin(Math.PI * first) * closeness;
  const easeSecond = Math.sin(Math.PI * second) * closeness;
  const shifts = [
    -first * travel + easeFirst,
    (1 - first - second) * travel - easeFirst + easeSecond,
    (1 - second) * travel - easeSecond
  ];
  const nextActive = second >= 0.5 ? 2 : first >= 0.5 ? 1 : 0;

  if (nextActive !== activeCard) {
    benefitCards.forEach(card => {
      card.classList.remove('flipped');
      card.setAttribute('aria-pressed', 'false');
    });
    activeCard = nextActive;
  }
  benefitCards.forEach((card, i) => {
    const y = Math.round(shifts[i]);
    card.style.setProperty('--lane-offset', `${y}px`);
    // Only the visibly centred card is clickable; disable mid-transition clicks.
    const centred = Math.abs(y) < 30 && i === activeCard;
    card.style.pointerEvents = centred ? 'auto' : 'none';
    card.tabIndex = centred ? 0 : -1;
    card.setAttribute('aria-hidden', centred ? 'false' : 'true');
  });
}
function queueBenefits() {
  if (benefitsQueued) return;
  benefitsQueued = true;
  window.requestAnimationFrame(updateBenefits);
}
window.addEventListener('scroll', queueBenefits, {passive:true});
window.addEventListener('resize', queueBenefits);
benefitCards.forEach((card, index) => {
  card.addEventListener('click', () => {
    if ((!window.matchMedia('(max-width: 600px)').matches && index !== activeCard) || card.style.pointerEvents === 'none') return;
    const flipped = card.classList.toggle('flipped');
    card.setAttribute('aria-pressed', String(flipped));
    const label = ['Без лишнего перегруза', 'С заботой о владельце', 'Опираясь на факты'][index];
    card.setAttribute('aria-label', `${label}. Нажмите, чтобы ${flipped ? 'вернуть лицевую сторону' : 'перевернуть'}`);
  });
});
updateBenefits();

// Accordion: one expanded FAQ item at a time.
const details = $$('.faq-list details');
details.forEach(item => item.addEventListener('toggle', () => {
  if (item.open) details.forEach(other => { if (other !== item) other.open = false; });
}));

// Accessible demo confirmation. No personal data is stored or submitted.
const form = $('#demo-form');
form.addEventListener('submit', e => {
  e.preventDefault();

  const confirmation = document.createElement('div');
  confirmation.className = 'demo-success';
  confirmation.setAttribute('role', 'status');
  confirmation.setAttribute('aria-live', 'polite');

  const title = document.createElement('strong');
  title.textContent = 'Готово! Демо-заявка оформлена 🐾';
  const explanation = document.createElement('span');
  explanation.textContent = 'Это учебный проект. Ваши контакты не сохраняются и никому не отправляются.';
  confirmation.append(title, explanation);
  form.replaceChildren(confirmation);

  // Report only the anonymous demo completion event to the Tilda parent.
  if (window.parent !== window) {
    window.parent.postMessage({
      type: 'meowmind:analytics',
      goal: 'meow_demo_form_complete'
    }, 'https://nearly-motivating-fox.tilda.ws');
  }
});

// Social links are native <a> links in index.html and work without JavaScript.


// The original coral MeowMind wordmark: the kitten peeks out of O, and a second kitten hops onto n.
// One-shot reveal on entry. Replayed if the section completely exits the viewport and returns.
const wordmarkSection = document.getElementById('wordmark');
if (wordmarkSection) {
  if (reducedMotion.matches) {
    wordmarkSection.classList.add('is-animated');
  } else {
    const wordmarkObserver = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio > .28) {
          wordmarkSection.classList.add('is-animated');
        } else if (e.intersectionRatio === 0) {
          wordmarkSection.classList.remove('is-animated');
        }
      }
    }, {threshold:[0,.3,.55]});
    wordmarkObserver.observe(wordmarkSection);
  }
}

// v21 — one scroll controller for the whole fourth block.
// The photos open into the Figma fan; reactions fall in sequence and settle
// into their original, approved positions. Both motions reverse on scroll-up.
(function initAudienceScrollMotion() {
  const audience = document.querySelector('#for-whom');
  if (!audience) return;

  const reactions = [
    {selector: '.reaction-heart',   delay: 0.00, duration: 0.48, fall: 118, drift: -23, angle: -10, spin: -22},
    {selector: '.reaction-party',   delay: 0.09, duration: 0.48, fall: 132, drift: -20, angle: -10, spin: -25},
    {selector: '.reaction-shock',   delay: 0.17, duration: 0.48, fall: 138, drift:  13, angle:   8, spin:  24},
    {selector: '.reaction-fire',    delay: 0.24, duration: 0.48, fall: 146, drift:  29, angle:  10, spin:  24},
    {selector: '.reaction-flushed', delay: 0.31, duration: 0.48, fall: 121, drift:  24, angle:   6, spin:  18}
  ].map(item => ({...item, el: audience.querySelector(item.selector)}));

  const clamp = n => Math.max(0, Math.min(1, n));
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  let frameQueued = false;

  function update() {
    frameQueued = false;
    const top = audience.getBoundingClientRect().top;
    const vh = window.innerHeight;
    // The animation runs DURING visible scrolling, not invisibly before it.
    // On reverse scrolling each element follows the same path backwards.
    const progress = reducedMotion.matches ? 1 : clamp((vh * .83 - top) / (vh * .66));
    const fan = reducedMotion.matches ? 1 : easeOutCubic(clamp((progress - .03) / .91));
    audience.style.setProperty('--fan-open', fan.toFixed(4));

    for (const item of reactions) {
      if (!item.el) continue;
      const t = reducedMotion.matches ? 1 : clamp((progress - item.delay) / item.duration);
      const eased = easeOutCubic(t);
      const remain = 1 - eased;
      // One small settling motion, without a repeating bounce.
      const settle = (Math.sin(t * Math.PI * 2.2) * 8 * t * (1 - t));
      const y = -item.fall * remain + settle;
      const x = item.drift * remain;
      const angle = item.angle + item.spin * remain;
      item.el.style.setProperty('transform', `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${angle.toFixed(1)}deg)`, 'important');
      item.el.style.setProperty('opacity', Math.min(1, t * 2.4).toFixed(3), 'important');
    }
  }
  function queueUpdate() {
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(update);
  }
  window.addEventListener('scroll', queueUpdate, {passive:true});
  window.addEventListener('resize', queueUpdate);
  reducedMotion.addEventListener('change', queueUpdate);
  update();
})();


// MeowMind analytics: notify the Tilda parent when a visitor opens the request form.
// This sends only an event name, never the visitor's name or phone number.
// The parent Tilda page owns the Yandex Metrica counter and attributes the visit.
(function reportApplyClicksToTilda() {
  const tildaOrigin = 'https://nearly-motivating-fox.tilda.ws';
  if (window.parent === window) return;

  document.addEventListener('click', event => {
    const link = event.target instanceof Element
      ? event.target.closest('a[href="#apply"]')
      : null;
    if (!link) return;
    window.parent.postMessage({
      type: 'meowmind:analytics',
      goal: 'meow_apply_click'
    }, tildaOrigin);
  });
})();
