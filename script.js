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
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Submission failed.');
    message.textContent = 'Success — your wallet is on the whitelist list.';
    message.className = 'form-message success';
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

