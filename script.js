/**
 * OnchainApp - Interactive Scripts & Whitelist Management
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Preloader Animation
  const loaderScreen = document.getElementById('loader-screen');
  const circleBar = document.getElementById('circle-bar');
  const progressText = document.getElementById('progress-text');
  
  if (loaderScreen && circleBar && progressText) {
    const circumference = 2 * Math.PI * 50; // r=50 -> 314.159
    circleBar.style.strokeDasharray = `${circumference}`;
    circleBar.style.strokeDashoffset = `${circumference}`;

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 12) + 8;
      if (progress > 100) progress = 100;
      
      const offset = circumference - (progress / 100) * circumference;
      circleBar.style.strokeDashoffset = `${offset}`;
      progressText.textContent = `${progress}%`;

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          loaderScreen.style.opacity = '0';
          setTimeout(() => {
            loaderScreen.style.display = 'none';
          }, 400);
        }, 200);
      }
    }, 45);
  }

  // 2. Floating Background Pixels (Subtle ambience)
  const bgContainer = document.getElementById('bg-floating-container');
  if (bgContainer) {
    const nftImages = [
      'assets/nfts/1.svg',
      'assets/nfts/2.svg',
      'assets/nfts/3.svg',
      'assets/nfts/4.svg',
      'assets/nfts/5.svg',
      'assets/nfts/6.svg',
      'assets/nfts/7.svg'
    ];

    for (let i = 0; i < 8; i++) {
      const img = document.createElement('img');
      img.src = nftImages[i % nftImages.length];
      img.className = 'bg-pixel-nft';
      img.style.left = `${Math.random() * 90 + 5}%`;
      img.style.top = `${Math.random() * 85 + 10}%`;
      img.style.width = `${Math.random() * 28 + 24}px`;
      img.style.opacity = `${Math.random() * 0.12 + 0.05}`;
      img.style.animation = `floatSlow ${Math.random() * 10 + 12}s ease-in-out infinite alternate`;
      bgContainer.appendChild(img);
    }
  }

  // 3. Hero Lineup Arc Dynamic Curvature
  const cards = document.querySelectorAll('.pal-lineup .nft-card');
  const count = cards.length;
  cards.forEach((card, index) => {
    const offsetFromCenter = index - (count - 1) / 2;
    const translateY = Math.pow(Math.abs(offsetFromCenter), 2) * 4.5;
    const rotate = offsetFromCenter * 3;
    card.style.transform = `translateY(${translateY}px) rotate(${rotate}deg)`;
  });

  // 4. Whitelist Verification Form
  const followCheckbox = document.getElementById('follow-confirm');
  const walletInput = document.getElementById('wallet');
  const whitelistForm = document.getElementById('whitelist-form');
  const submitBtn = whitelistForm ? whitelistForm.querySelector('button[type="submit"]') : null;
  const formMsg = document.getElementById('form-message');

  if (followCheckbox && walletInput && submitBtn) {
    followCheckbox.addEventListener('change', () => {
      const isChecked = followCheckbox.checked;
      walletInput.disabled = !isChecked;
      submitBtn.disabled = !isChecked;

      if (isChecked) {
        walletInput.focus();
        if (formMsg) {
          formMsg.textContent = '';
          formMsg.className = 'form-message';
        }
      } else {
        walletInput.value = '';
        if (formMsg) {
          formMsg.textContent = '';
          formMsg.className = 'form-message';
        }
      }
    });
  }

  // Handle Whitelist Submission
  if (whitelistForm && walletInput && formMsg) {
    whitelistForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rawVal = walletInput.value.trim();
      
      // Normalize EVM address
      let fullAddress = rawVal;
      if (!fullAddress.startsWith('0x') && !fullAddress.startsWith('0X')) {
        fullAddress = '0x' + fullAddress;
      }

      // Check EVM regex 0x + 40 hex chars
      const evmRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!evmRegex.test(fullAddress)) {
        formMsg.textContent = '❌ Please enter a valid 42-character EVM wallet address (0x...)';
        formMsg.className = 'form-message error';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Registering...</span>';
      formMsg.textContent = 'Submitting your wallet to whitelist...';
      formMsg.className = 'form-message';

      try {
        const response = await fetch('/api/whitelist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet: fullAddress })
        });
        
        let data = {};
        try {
          data = await response.json();
        } catch (jsonErr) {
          data = { error: `Server error (${response.status})` };
        }

        if (response.ok) {
          submitBtn.innerHTML = '<span>Registered!</span> ✓';
          formMsg.textContent = `🎉 Success! Wallet ${fullAddress.substring(0, 6)}...${fullAddress.substring(38)} is registered for guaranteed whitelist.`;
          formMsg.className = 'form-message success';

          if (typeof confetti === 'function') {
            confetti({
              particleCount: 85,
              spread: 75,
              origin: { y: 0.75 },
              colors: ['#15803d', '#16a34a', '#22c55e', '#4ade80', '#86efac']
            });
          }
        } else {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>Join Whitelist</span> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
          formMsg.textContent = `⚠️ ${data.error || 'Failed to submit wallet. Please try again.'}`;
          formMsg.className = 'form-message error';
        }
      } catch (err) {
        console.error('Submission fetch error:', err);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Join Whitelist</span> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
        formMsg.textContent = `⚠️ Network error (${err.message || 'connection failed'}). Please redeploy or check connection.`;
        formMsg.className = 'form-message error';
      }
    });
  }
});
