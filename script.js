async function loadNFTCollection() {
  try {
    const res = await fetch('/nfts.json');
    if (!res.ok) return;
    const nfts = await res.json();
    if (!Array.isArray(nfts) || nfts.length === 0) return;

    // Shuffle NFTs randomly for dynamic rendering on every page load
    const shuffled = [...nfts].sort(() => Math.random() - 0.5);

    // Initialize small animated background ArcPixls filling the screen
    initFloatingBackground(shuffled);

    // Populate Hero Showcase (6 items)
    const heroLineup = document.querySelector('.pal-lineup');
    if (heroLineup) {
      const heroNfts = shuffled.slice(0, 6);
      heroLineup.innerHTML = heroNfts.map(nft => `
        <figure class="nft-card" title="${nft.name} - ${nft.rarity}">
          <img src="${nft.image}" alt="${nft.name}" loading="lazy" referrerPolicy="no-referrer" />
        </figure>
      `).join('');
    }

    // Populate Main Collection Gallery
    const gallery = document.querySelector('.nft-gallery');
    if (gallery) {
      gallery.innerHTML = shuffled.map(nft => `
        <article class="gallery-card" data-rarity="${nft.rarity}">
          <img src="${nft.image}" alt="${nft.name}" loading="lazy" referrerPolicy="no-referrer" />
          <p>${nft.rarity}</p>
          <b>#${nft.id}</b>
          <small class="card-title">${nft.name.split('—')[1] || nft.name}</small>
        </article>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading NFT collection:', err);
  }
}

function initFloatingBackground(nfts) {
  const container = document.getElementById('bg-floating-container');
  if (!container || !nfts.length) return;

  container.innerHTML = '';
  const count = 56; // Fill viewport with 56 floating animated mini ArcPixls
  const columns = 8;
  const rows = 7;

  for (let i = 0; i < count; i++) {
    const nft = nfts[i % nfts.length];
    const img = document.createElement('img');
    img.src = nft.image;
    img.alt = '';
    img.className = `bg-pixel-nft float-anim-${(i % 4) + 1}`;
    
    // Position scattered across viewport
    const col = i % columns;
    const row = Math.floor(i / columns);
    const leftPercent = (col * (100 / columns)) + (Math.random() * 8 - 4);
    const topPercent = (row * (100 / rows)) + (Math.random() * 8 - 4);
    
    const size = Math.floor(Math.random() * 11) + 18; // 18px to 28px (small pixel particles)
    const duration = (Math.random() * 10 + 8).toFixed(1); // 8s to 18s animation
    const delay = (-Math.random() * 14).toFixed(1);
    const opacity = (Math.random() * 0.25 + 0.20).toFixed(2); // 0.20 to 0.45 opacity for clean background layer

    img.style.left = `${Math.max(1, Math.min(92, leftPercent))}%`;
    img.style.top = `${Math.max(1, Math.min(92, topPercent))}%`;
    img.style.width = `${size}px`;
    img.style.height = `${size}px`;
    img.style.animationDuration = `${duration}s`;
    img.style.animationDelay = `${delay}s`;
    img.style.opacity = opacity;

    container.appendChild(img);
  }
}

function runCircularPreloader() {
  const loader = document.getElementById('loader-screen');
  const circleBar = document.getElementById('circle-bar');
  const progressText = document.getElementById('progress-text');
  if (!loader || !circleBar || !progressText) return;

  const circumference = 314.159;
  let progress = 0;
  
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 4) + 2;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      
      const offset = circumference - (circumference * progress) / 100;
      circleBar.style.strokeDashoffset = offset;
      progressText.textContent = '100%';

      setTimeout(() => {
        loader.classList.add('fade-out');
      }, 300);
    } else {
      const offset = circumference - (circumference * progress) / 100;
      circleBar.style.strokeDashoffset = offset;
      progressText.textContent = `${progress}%`;
    }
  }, 25);
}

document.addEventListener('DOMContentLoaded', () => {
  runCircularPreloader();
  loadNFTCollection();
});

const form = document.querySelector('#whitelist-form');
const walletInput = document.querySelector('#wallet');
const message = document.querySelector('#form-message');
const button = form.querySelector('button');
const followConfirm = document.querySelector('#follow-confirm');
const evmAddress = /^0x[a-fA-F0-9]{40}$/;

followConfirm.addEventListener('change', () => {
  const unlocked = followConfirm.checked;
  walletInput.disabled = !unlocked;
  button.disabled = !unlocked;
  message.textContent = unlocked ? 'Wallet submission unlocked.' : 'Follow @ArcPixls on X to unlock wallet submission.';
  message.className = unlocked ? 'form-message success' : 'form-message';
  if (unlocked) walletInput.focus();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const wallet = walletInput.value.trim();

  if (!evmAddress.test(wallet)) {
    message.textContent = 'Enter a valid EVM address (0x followed by 40 characters).';
    message.className = 'form-message error';
    return;
  }

  button.disabled = true;
  button.textContent = 'Submitting...';
  message.textContent = '';

  try {
    const response = await fetch('/api/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet })
    });

    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}. Please check your deployment backend.`);
        }
        data = { error: 'Invalid response from server.' };
      }
    }

    if (!response.ok) {
      throw new Error(data.error || 'Submission failed.');
    }

    message.textContent = 'Success — your wallet is on the whitelist!';
    message.className = 'form-message success';
    triggerCelebration();
    form.reset();
  } catch (error) {
    message.textContent = error.message || 'Could not submit right now. Please try again.';
    message.className = 'form-message error';
  } finally {
    button.disabled = false;
    button.textContent = 'Join whitelist';
  }
});

const animatedSelectors = [
  '.story > .section-tag', '.story > h2', '.story > p:not(.section-tag)',
  '.trait-grid', '.collection-heading', '.gallery-card',
  '.mint > *', '.roadmap > *', '.tokenomics > *', '.faq > *'
].join(', ');

const animatedElements = [...document.querySelectorAll(animatedSelectors)];
animatedElements.forEach((element, index) => {
  element.classList.add('scroll-reveal');
  element.style.setProperty('--reveal-delay', `${(index % 5) * 70}ms`);
});

function reveal(element) {
  element.classList.add('is-visible');
}

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        reveal(entry.target);
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  animatedElements.forEach((element) => observer.observe(element));
} else {
  animatedElements.forEach(reveal);
}

/* Animated Celebration (Balloons, Fuljhadi/Sparklers & Fireworks) */
function triggerCelebration() {
  // 1. Toast Notification Banner
  let toast = document.querySelector('.celebration-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'celebration-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = '🎉 WHITELIST JOINED! 🚀<br><span style="font-size: 10px; color: #a3e635; display: inline-block; margin-top: 6px;">Wallet Successfully Added ✨</span>';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 5000);

  // 2. Canvas Confetti Explosions (via confetti library)
  if (typeof window.confetti === 'function') {
    // Left cannon burst
    window.confetti({
      particleCount: 70,
      angle: 60,
      spread: 65,
      origin: { x: 0, y: 0.75 },
      colors: ['#a3e635', '#ec4899', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ffffff']
    });

    // Right cannon burst
    window.confetti({
      particleCount: 70,
      angle: 120,
      spread: 65,
      origin: { x: 1, y: 0.75 },
      colors: ['#a3e635', '#ec4899', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ffffff']
    });

    // Fireworks star burst in center
    setTimeout(() => {
      window.confetti({
        particleCount: 110,
        spread: 100,
        origin: { x: 0.5, y: 0.45 },
        colors: ['#a3e635', '#ec4899', '#3b82f6', '#f59e0b', '#8b5cf6']
      });
    }, 350);
  }

  // 3. Floating Balloons (Gubbare)
  const colors = ['#ec4899', '#3b82f6', '#a3e635', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#06b6d4'];
  const balloonCount = 20;
  const container = document.createElement('div');
  container.className = 'celebration-container';
  document.body.appendChild(container);

  for (let i = 0; i < balloonCount; i++) {
    setTimeout(() => {
      const balloon = document.createElement('div');
      balloon.className = 'balloon';
      const color = colors[Math.floor(Math.random() * colors.length)];
      balloon.style.backgroundColor = color;
      balloon.style.left = `${Math.random() * 90 + 5}%`;
      const scale = 0.7 + Math.random() * 0.6;
      const duration = 3.5 + Math.random() * 2.5;
      balloon.style.animationDuration = `${duration}s`;
      balloon.style.transform = `scale(${scale})`;
      container.appendChild(balloon);

      setTimeout(() => balloon.remove(), duration * 1000);
    }, i * 160);
  }

  // 4. Sparkler / Fuljhadi Pixel Sparkles firing around form
  const formEl = document.getElementById('whitelist-form');
  if (formEl) {
    const rect = formEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let j = 0; j < 45; j++) {
      const p = document.createElement('div');
      p.className = 'sparkler-particle';
      const color = colors[Math.floor(Math.random() * colors.length)];
      p.style.backgroundColor = color;
      p.style.color = color;
      p.style.left = `${centerX}px`;
      p.style.top = `${centerY}px`;

      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 180;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      p.style.setProperty('--dx', `${dx}px`);
      p.style.setProperty('--dy', `${dy}px`);

      container.appendChild(p);
      setTimeout(() => p.remove(), 1200);
    }
  }

  setTimeout(() => container.remove(), 7000);
}


