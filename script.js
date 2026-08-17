// ==========================================================================
// ArcPixls - 4D Hyper-Dimensional Engine & Interactive Web3 Experience
// ==========================================================================

// --- 1. Audio Haptics (Subtle Web Audio Synthesis) ---
class CyberAudio {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  playBlip(freq = 520, type = 'sine', duration = 0.04, gainVal = 0.03) {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + duration);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }
}
const cyberSound = new CyberAudio();

// --- 2. 4D Spatial Depth Canvas Engine (Hyper-Dimensional Pixel Grid) ---
function init4DSpatialCanvas() {
  const canvas = document.getElementById('spatial-4d-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Mouse vector tracking for 4D perspective tilt
  let mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2, velX: 0, velY: 0 };
  window.addEventListener('mousemove', (e) => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
  });

  // Hyper-dimensional 4D particles: 4 coordinates (x, y, z, w) + size
  const particleCount = Math.min(80, Math.floor(width / 20));
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: (Math.random() - 0.5) * width * 1.4,
      y: (Math.random() - 0.5) * height * 1.4,
      z: Math.random() * 800 + 200,
      w: Math.random() * Math.PI * 2, // 4th dimensional angular phase
      speedW: (Math.random() * 0.015 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
      size: Math.random() * 4 + 2,
      baseAlpha: Math.random() * 0.35 + 0.15,
      hue: Math.random() > 0.3 ? 142 : 160 // Emerald & mint hues
    });
  }

  // Floating 4D Isometric Hyper-Cubes in background
  const cubes = [
    { x: -width * 0.35, y: -height * 0.2, z: 500, rotX: 0, rotY: 0, rotZ: 0, size: 60 },
    { x: width * 0.35, y: -height * 0.1, z: 600, rotX: 0.5, rotY: 0.5, rotZ: 0, size: 80 },
    { x: -width * 0.25, y: height * 0.3, z: 550, rotX: 0.2, rotY: 0.8, rotZ: 0, size: 70 },
    { x: width * 0.3, y: height * 0.35, z: 650, rotX: 0.8, rotY: 0.2, rotZ: 0, size: 65 }
  ];

  let time = 0;
  const fov = 650;

  function render() {
    time += 0.016;

    // Smooth mouse inertia
    mouse.velX += (mouse.targetX - mouse.x) * 0.05;
    mouse.velY += (mouse.targetY - mouse.y) * 0.05;
    mouse.x += mouse.velX * 0.15;
    mouse.y += mouse.velY * 0.15;
    mouse.velX *= 0.82;
    mouse.velY *= 0.82;

    const angleY = ((mouse.x - width / 2) / width) * 0.35;
    const angleX = -((mouse.y - height / 2) / height) * 0.35;

    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    // 1. Render 4D particles with 4D sine rotation & depth connections
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.w += p.speedW;

      // 4D projection matrix math: (x, y, z) modulated by 4th-dim phase (w)
      let px = p.x + Math.sin(p.w + time) * 35;
      let py = p.y + Math.cos(p.w + time * 0.8) * 35;
      let pz = p.z + Math.sin(p.w * 0.5) * 50;

      // Rotate in 3D around center based on mouse angle
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      // Y-axis rotation
      let rx = px * cosY - pz * sinY;
      let rz = px * sinY + pz * cosY;

      // X-axis rotation
      let ry = py * cosX - rz * sinX;
      rz = py * sinX + rz * cosX;

      // Perspective projection
      if (rz + fov > 10) {
        const scale = fov / (rz + fov);
        const screenX = centerX + rx * scale;
        const screenY = centerY + ry * scale;
        const radius = Math.max(1, p.size * scale);
        const alpha = Math.max(0, Math.min(0.6, p.baseAlpha * scale * (1 + Math.sin(p.w) * 0.3)));

        // Draw pixel block (Square pixel aesthetic)
        ctx.fillStyle = `hsla(${p.hue}, 70%, 50%, ${alpha})`;
        ctx.fillRect(screenX - radius, screenY - radius, radius * 2, radius * 2);

        // Subtle glowing lines connecting nearby 4D nodes
        for (let j = i + 1; j < Math.min(i + 4, particles.length); j++) {
          const p2 = particles[j];
          const p2x = p2.x + Math.sin(p2.w + time) * 35;
          const p2y = p2.y + Math.cos(p2.w + time * 0.8) * 35;
          const p2z = p2.z + Math.sin(p2.w * 0.5) * 50;

          const rx2 = p2x * cosY - p2z * sinY;
          let rz2 = p2x * sinY + p2z * cosY;
          const ry2 = p2y * cosX - rz2 * sinX;
          rz2 = p2y * sinX + rz2 * cosX;

          if (rz2 + fov > 10) {
            const scale2 = fov / (rz2 + fov);
            const s2X = centerX + rx2 * scale2;
            const s2Y = centerY + ry2 * scale2;
            const dist = Math.hypot(screenX - s2X, screenY - s2Y);
            if (dist < 110) {
              const lineAlpha = (1 - dist / 110) * 0.12 * scale;
              ctx.strokeStyle = `hsla(142, 70%, 45%, ${lineAlpha})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(screenX, screenY);
              ctx.lineTo(s2X, s2Y);
              ctx.stroke();
            }
          }
        }
      }
    }

    // 2. Render 4D Wireframe Cyber-Cubes
    cubes.forEach((cube) => {
      cube.rotX += 0.004;
      cube.rotY += 0.006;
      cube.rotZ += 0.002;

      const half = cube.size / 2;
      const vertices = [
        [-half, -half, -half], [half, -half, -half], [half, half, -half], [-half, half, -half],
        [-half, -half, half], [half, -half, half], [half, half, half], [-half, half, half]
      ];

      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
      ];

      const projected = vertices.map(([vx, vy, vz]) => {
        // Rotate cube locally
        let cx = vx, cy = vy, cz = vz;
        // X
        let y1 = cy * Math.cos(cube.rotX) - cz * Math.sin(cube.rotX);
        let z1 = cy * Math.sin(cube.rotX) + cz * Math.cos(cube.rotX);
        // Y
        let x2 = cx * Math.cos(cube.rotY) + z1 * Math.sin(cube.rotY);
        let z2 = -cx * Math.sin(cube.rotY) + z1 * Math.cos(cube.rotY);
        // Z
        let x3 = x2 * Math.cos(cube.rotZ) - y1 * Math.sin(cube.rotZ);
        let y3 = x2 * Math.sin(cube.rotZ) + y1 * Math.cos(cube.rotZ);

        // Position in space
        let worldX = x3 + cube.x;
        let worldY = y3 + cube.y;
        let worldZ = z2 + cube.z;

        // Apply mouse tilt
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);

        let rx = worldX * cosY - worldZ * sinY;
        let rz = worldX * sinY + worldZ * cosY;
        let ry = worldY * cosX - rz * sinX;
        rz = worldY * sinX + rz * cosX;

        const scale = fov / (rz + fov);
        return {
          x: centerX + rx * scale,
          y: centerY + ry * scale,
          scale
        };
      });

      ctx.strokeStyle = 'rgba(34, 197, 94, 0.16)';
      ctx.lineWidth = 1.2;
      edges.forEach(([i, j]) => {
        ctx.beginPath();
        ctx.moveTo(projected[i].x, projected[i].y);
        ctx.lineTo(projected[j].x, projected[j].y);
        ctx.stroke();
      });
    });

    requestAnimationFrame(render);
  }

  render();
}

// --- 3. 4D Interactive 3D Tilt & Holographic Sheen Engine ---
function init3DTiltPhysics() {
  const cards = document.querySelectorAll(
    '.nft-card, .bento-card, .trait-card, .roadmap-card, .token-allocation, .whitelist-steps-box, .funding-highlight-box, .fact-pill'
  );

  cards.forEach((card) => {
    // Add 3D container styling
    card.style.transformStyle = 'preserve-3d';
    card.style.willChange = 'transform, box-shadow';

    // Create dynamic specular holographic sheen element
    let glare = card.querySelector('.card-hologram-glare');
    if (!glare) {
      glare = document.createElement('div');
      glare.className = 'card-hologram-glare';
      card.appendChild(glare);
    }

    let isHovered = false;

    card.addEventListener('mouseenter', () => {
      isHovered = true;
      card.style.transition = 'transform 0.1s ease-out, box-shadow 0.1s ease-out';
      cyberSound.playBlip(620, 'triangle', 0.03, 0.015);
    });

    card.addEventListener('mousemove', (e) => {
      if (!isHovered) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // 3D rotation angles (-15deg to +15deg)
      const rotateX = ((y - centerY) / centerY) * -12;
      const rotateY = ((x - centerX) / centerX) * 12;

      // Dynamic holographic reflection coordinates
      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(16px) scale3d(1.025, 1.025, 1.025)`;
      card.style.boxShadow = `
        0 ${Math.abs(rotateX * 1.5) + 12}px 30px rgba(22, 163, 74, 0.12),
        0 4px 12px rgba(0, 0, 0, 0.06),
        ${-rotateY * 0.8}px ${rotateX * 0.8}px 24px rgba(34, 197, 94, 0.15)
      `;

      glare.style.opacity = '1';
      glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.45) 0%, rgba(74, 222, 128, 0.2) 35%, transparent 70%)`;
    });

    card.addEventListener('mouseleave', () => {
      isHovered = false;
      card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s ease-out';
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)';
      card.style.boxShadow = '';
      glare.style.opacity = '0';
    });
  });
}

// --- 4. Hero 3D Stage Spatial Tracking ---
function initHero3DStage() {
  const hero = document.querySelector('.hero');
  const lineup = document.querySelector('.pal-lineup');
  if (!hero || !lineup) return;

  lineup.style.transformStyle = 'preserve-3d';
  lineup.style.perspective = '1200px';

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const normY = (e.clientY - rect.top) / rect.height - 0.5;

    const rotY = normX * 24; // -12deg to +12deg 3D stage rotation
    const rotX = -normY * 14;

    lineup.style.transform = `translateX(-50%) perspective(1200px) rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg)`;
  });

  hero.addEventListener('mouseleave', () => {
    lineup.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    lineup.style.transform = 'translateX(-50%) perspective(1200px) rotateY(0deg) rotateX(0deg)';
    setTimeout(() => {
      lineup.style.transition = '';
    }, 600);
  });
}

// --- 5. NFT Data & Showcase Loader ---
async function loadNFTCollection() {
  try {
    const res = await fetch('/nfts.json');
    if (!res.ok) return;
    const nfts = await res.json();
    if (!Array.isArray(nfts) || nfts.length === 0) return;

    const shuffled = [...nfts].sort(() => Math.random() - 0.5);

    // Background floating animated sprites
    initFloatingBackground(shuffled);

    // Hero 3D Showcase (7 items with 3D depth curvature)
    const heroLineup = document.querySelector('.pal-lineup');
    if (heroLineup) {
      const heroNfts = shuffled.slice(0, 7);
      heroLineup.innerHTML = heroNfts.map((nft, idx) => {
        // Calculate 3D arc position
        const offset = idx - 3; // -3, -2, -1, 0, 1, 2, 3
        const rotY = offset * 7;
        const transZ = (3 - Math.abs(offset)) * 24;
        return `
          <figure class="nft-card hero-3d-card" data-offset="${offset}" style="--hero-rot-y: ${rotY}deg; --hero-z: ${transZ}px;" title="${nft.name} — ${nft.rarity}">
            <img src="${nft.image}" alt="${nft.name}" loading="lazy" referrerPolicy="no-referrer" />
          </figure>
        `;
      }).join('');
      
      // Re-bind 3D tilt physics to the freshly created cards
      setTimeout(init3DTiltPhysics, 50);
    }
  } catch (err) {
    console.error('Error loading NFT collection:', err);
  }
}

function initFloatingBackground(nfts) {
  const container = document.getElementById('bg-floating-container');
  if (!container || !nfts.length) return;

  container.innerHTML = '';
  const count = 48;
  const columns = 8;
  const rows = 6;

  for (let i = 0; i < count; i++) {
    const nft = nfts[i % nfts.length];
    const img = document.createElement('img');
    img.src = nft.image;
    img.alt = '';
    img.className = `bg-pixel-nft float-anim-${(i % 4) + 1}`;

    const col = i % columns;
    const row = Math.floor(i / columns);
    const leftPercent = col * (100 / columns) + (Math.random() * 6 - 3);
    const topPercent = row * (100 / rows) + (Math.random() * 6 - 3);

    const size = Math.floor(Math.random() * 12) + 18;
    const duration = (Math.random() * 10 + 8).toFixed(1);
    const delay = (-Math.random() * 14).toFixed(1);
    const opacity = (Math.random() * 0.22 + 0.14).toFixed(2);

    img.style.left = `${Math.max(1, Math.min(94, leftPercent))}%`;
    img.style.top = `${Math.max(1, Math.min(94, topPercent))}%`;
    img.style.width = `${size}px`;
    img.style.height = `${size}px`;
    img.style.animationDuration = `${duration}s`;
    img.style.animationDelay = `${delay}s`;
    img.style.opacity = opacity;

    container.appendChild(img);
  }
}

// --- 6. Circular Preloader ---
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
        cyberSound.playBlip(880, 'sine', 0.08, 0.03);
      }, 300);
    } else {
      const offset = circumference - (circumference * progress) / 100;
      circleBar.style.strokeDashoffset = offset;
      progressText.textContent = `${progress}%`;
    }
  }, 22);
}

// --- 7. Whitelist Form & Submission ---
function initWhitelistForm() {
  const form = document.querySelector('#whitelist-form');
  const walletInput = document.querySelector('#wallet');
  const message = document.querySelector('#form-message');
  const button = form ? form.querySelector('button') : null;
  const followConfirm = document.querySelector('#follow-confirm');
  const evmAddress = /^0x[a-fA-F0-9]{40}$/;

  if (!form || !walletInput || !followConfirm || !button || !message) return;

  followConfirm.addEventListener('change', () => {
    const unlocked = followConfirm.checked;
    walletInput.disabled = !unlocked;
    button.disabled = !unlocked;
    cyberSound.playBlip(unlocked ? 740 : 420, 'sine', 0.04, 0.03);

    message.textContent = unlocked
      ? 'Step 1 complete! Enter your EVM address below.'
      : 'Follow @ArcPixls on X to unlock wallet registration.';
    message.className = unlocked ? 'form-message success' : 'form-message';
    if (unlocked) walletInput.focus();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const wallet = walletInput.value.trim();

    if (!evmAddress.test(wallet)) {
      message.textContent = 'Enter a valid EVM address (0x followed by 40 hex characters).';
      message.className = 'form-message error';
      cyberSound.playBlip(320, 'sawtooth', 0.08, 0.04);
      return;
    }

    button.disabled = true;
    button.innerHTML = '<span>Verifying...</span>';
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
            throw new Error(`Server returned status ${response.status}.`);
          }
          data = { error: 'Invalid server response.' };
        }
      }

      if (!response.ok) {
        throw new Error(data.error || 'Submission failed.');
      }

      message.textContent = 'Success! Your wallet has been registered on the Genesis Whitelist.';
      message.className = 'form-message success';
      cyberSound.playBlip(980, 'sine', 0.12, 0.05);
      triggerCelebration();
      form.reset();
    } catch (error) {
      message.textContent = error.message || 'Could not submit right now. Please try again.';
      message.className = 'form-message error';
      cyberSound.playBlip(280, 'sawtooth', 0.1, 0.04);
    } finally {
      button.disabled = false;
      button.innerHTML = '<span>Join Whitelist</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    }
  });
}

// --- 8. 4D Confetti & Particle Celebration ---
function triggerCelebration() {
  let toast = document.querySelector('.celebration-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'celebration-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `
    <div class="toast-inner">
      <div class="toast-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <div class="toast-body">
        <div class="toast-title">WHITELIST CONFIRMED</div>
        <div class="toast-subtitle">Wallet successfully verified on Arc Mainnet</div>
      </div>
      <div class="toast-badge">VERIFIED</div>
    </div>
  `;
  toast.classList.add('show');
  if (window.toastTimeout) clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => toast.classList.remove('show'), 6000);

  // Canvas confetti bursts
  if (typeof window.confetti === 'function') {
    window.confetti({
      particleCount: 90,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.75 },
      colors: ['#22c55e', '#16a34a', '#86efac', '#15803d', '#ffffff', '#4ade80']
    });

    window.confetti({
      particleCount: 90,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.75 },
      colors: ['#22c55e', '#16a34a', '#86efac', '#15803d', '#ffffff', '#4ade80']
    });

    setTimeout(() => {
      window.confetti({
        particleCount: 140,
        spread: 120,
        origin: { x: 0.5, y: 0.45 },
        colors: ['#22c55e', '#86efac', '#15803d', '#ffffff', '#bbf7d0']
      });
    }, 350);
  }
}

// --- 9. Scroll Reveal Observer ---
function initScrollReveal() {
  const animatedSelectors = [
    '.section-header', '.bento-grid', '.funding-highlight-box',
    '.trait-grid', '.mint-card-wrapper', '.roadmap-grid',
    '.token-bar-container', '.tokenomics-grid', '.faq-accordion-wrap'
  ].join(', ');

  const animatedElements = [...document.querySelectorAll(animatedSelectors)];
  animatedElements.forEach((element, index) => {
    element.classList.add('scroll-reveal');
    element.style.setProperty('--reveal-delay', `${(index % 4) * 80}ms`);
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    animatedElements.forEach((element) => observer.observe(element));
  } else {
    animatedElements.forEach((el) => el.classList.add('is-visible'));
  }
}

// --- 10. Initialization on DOM Load ---
document.addEventListener('DOMContentLoaded', () => {
  runCircularPreloader();
  init4DSpatialCanvas();
  loadNFTCollection();
  initHero3DStage();
  initWhitelistForm();
  initScrollReveal();
  setTimeout(init3DTiltPhysics, 150);
});
