/*******************************************************
 * script.js - Final cleaned & robust script
 * - Waits for DOMContentLoaded to avoid "null" errors
 * - Defensive checks for optional elements (gated overlay may be commented out)
 * - About section toggle (dynamic height + header offset) works on desktop & mobile
 * - Preserves menu toggle, dropdowns, carousel lightbox & tilt
 * - Clear comments for maintainability
 *******************************************************/

/* Configuration (set your Apps Script URL here if used) */
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwu4icbfmXHza9A5Qt0dX1k86EJ2ZuA5we1SbseyPGmE8BiZtdQtqGTPdvPN6uzTSXgUQ/exec";

/* All DOM work happens after DOMContentLoaded */
document.addEventListener("DOMContentLoaded", () => {
  console.log("[akshara] DOMContentLoaded — script initializing");

  /* ----------------------------
     Query DOM elements safely
     ---------------------------- */
  const overlay = document.getElementById("gatedOverlay");      // may be null if overlay is commented out
  const form = document.getElementById("signupForm");          // may be null
  const submitBtn = document.getElementById("submitBtn");     // may be null
  const spinner = document.getElementById("spinner");         // may be null
  const submitText = document.getElementById("submitText");   // may be null
  const closeBtn = document.getElementById("closeBtn");       // may be null

  /* Utility: lock body scroll when overlay shown */
  function lockBody(lock = true) {
    document.body.classList.toggle("gated-locked", !!lock);
  }

 
  /* ----------------------------
     About section "Know more" toggle (IMPROVED for mobile)
     - dynamic max-height (fits content)
     - scroll with header offset so content is visible under sticky header
     - prevents accidental double toggles
     ---------------------------- */
  (function aboutToggleInit() {
    const knowBtn = document.getElementById("knowMoreBtn");
    const aboutMore = document.getElementById("aboutMore");
    const headerEl = document.querySelector("header");

    if (!knowBtn && !aboutMore) {
      console.info("[akshara] about section elements missing — know more disabled.");
      return;
    }
    if (!knowBtn) {
      console.warn("[akshara] knowMoreBtn not found.");
      return;
    }
    if (!aboutMore) {
      console.warn("[akshara] aboutMore not found.");
      return;
    }

    // Ensure button behaves as a button (prevents accidental form submit)
    try { if (!knowBtn.hasAttribute('type')) knowBtn.setAttribute('type','button'); } catch (e) { /* ignore */ }

    // Ensure clean initial state
    aboutMore.classList.remove("open");
    aboutMore.setAttribute("aria-hidden", "true");
    aboutMore.style.maxHeight = "0px";
    knowBtn.textContent = "Know more";

    // small debounce guard to avoid double-triggering
    let lock = false;
    function toggleAbout() {
      if (lock) return;
      lock = true;
      setTimeout(() => lock = false, 250); // prevents accidental double toggles

      // toggle class
      const isOpen = aboutMore.classList.toggle("open");
      aboutMore.setAttribute("aria-hidden", String(!isOpen));
      knowBtn.textContent = isOpen ? "Show less" : "Know more";

      // dynamic expand/collapse using scrollHeight so content always fits
      if (isOpen) {
        // set explicit maxHeight to content height (forces CSS transition)
        aboutMore.style.maxHeight = (aboutMore.scrollHeight + 24) + "px"; // small buffer
      } else {
        aboutMore.style.maxHeight = "0px";
      }

      // Scroll into view with header offset (so sticky header does not cover top)
      if (isOpen) {
        const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 0;
        const rect = aboutMore.getBoundingClientRect();
        const absoluteTop = window.scrollY + rect.top;
        const scrollTo = Math.max(absoluteTop - headerHeight - 16, 0); // 16px gap
        window.scrollTo({ top: scrollTo, behavior: "smooth" });
      }

      console.log("[akshara] aboutMore toggled:", isOpen);
    }

    knowBtn.addEventListener("click", toggleAbout);
    knowBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleAbout(); }
    });
  })();

  /* ----------------------------
     Menu toggle & dropdown logic
     ---------------------------- */
  (function menuInit() {
    const menuToggle = document.querySelector(".menu-toggle");
    const navLinks = document.querySelector(".nav-links");
    if (menuToggle && navLinks) {
      menuToggle.addEventListener("click", () => {
        navLinks.classList.toggle("open");
        menuToggle.classList.toggle("open");
      });
    }

    // Services dropdown for mobile: toggles `.open` on li
    document.querySelectorAll(".has-dropdown").forEach(item => {
      item.addEventListener("click", (e) => {
        // prevent immediate page jump if anchor exists
        e.stopPropagation();
        item.classList.toggle("open");
      });
    });
  })();

  /* ----------------------------
     Carousel lightbox & tilt effect
     ---------------------------- */
  (function carouselInit() {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImg");
    const closeBtnModal = document.querySelector(".closeBtn");

    document.querySelectorAll(".carousel img").forEach(img => {
      img.addEventListener("click", () => {
        if (!modal || !modalImg) return;
        modal.style.display = "flex";
        modal.setAttribute("aria-hidden", "false");
        modalImg.src = img.src;
      });
    });

    if (closeBtnModal && modal) {
      closeBtnModal.addEventListener("click", () => {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
      });
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.style.display = "none";
          modal.setAttribute("aria-hidden", "true");
        }
      });
    }

    // Mouse tilt for desktop and touch fallback
    const container = document.querySelector(".carousel");
    if (container) {
      document.addEventListener("mousemove", (e) => {
        let x = (window.innerWidth / 2 - e.clientX) / 40;
        let y = (window.innerHeight / 2 - e.clientY) / 40;
        container.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
      });
      document.addEventListener("touchstart", () => { container.style.transform = "rotateY(0deg) rotateX(0deg)"; });
    }
  })();

  console.log("[akshara] script initialized successfully.");
}); // end DOMContentLoaded


/* ========== Reels auto-scroll carousel (seamless, clickable) ========== */
(function reelsCarousel() {
  const track = document.getElementById("reelTrack");
  const viewport = document.querySelector(".reels-viewport");
  const btnPause = document.getElementById("reelBtnPause");
  const btnPlay = document.getElementById("reelBtnPlay");

  if (!track || !viewport) return;

  // Duplicate items so the track can scroll seamlessly (minimum duplication)
  function duplicateTrackItems() {
    const items = Array.from(track.children);
    // if less than 3 items, duplicate more for smooth loop
    const minCount = 6; // ensure enough content to scroll smoothly
    let clones = [];
    // initial clone once
    items.forEach(it => { clones.push(it.cloneNode(true)); });
    // If not enough, clone again until minCount reached
    while (track.children.length + clones.length < minCount) {
      clones = clones.concat(clones.map(c => c.cloneNode(true)));
    }
    // append clones
    clones.forEach(c => track.appendChild(c));
  }

  duplicateTrackItems();

  // compute animation duration based on content width & speed (px per second)
  function setAutoscrollSpeed(speedPxPerSec = 80) {
    // total width to scroll (we will set translateX from 0 to -scrollWidth/2)
    const totalWidth = track.scrollWidth; // after duplication
    // we scroll half of track width (because we've duplicated content)
    const scrollDistance = totalWidth / 2;
    const duration = Math.max(8, scrollDistance / speedPxPerSec); // seconds; min 8s
    // apply animation duration inline (in seconds)
    track.style.animationDuration = `${duration}s`;
    // also set transform to 0 at start to avoid jump
    track.style.transform = 'translateX(0)';
  }

  // start autoscroll by adding class .autoscroll
  function startAutoscroll() {
    // ensure animation keyframes properly reflect content width,
    // set CSS variable animation duration based on width
    setAutoscrollSpeed(90); // adjust speedPxPerSec (higher -> faster)
    track.classList.add("autoscroll");
    track.classList.remove("paused");
  }

  /* ===== Smooth Manual Drag / Swipe Scroll ===== */
let isDown = false;
let startX;
let scrollLeft;

viewport.addEventListener("mousedown", (e) => {
  isDown = true;
  viewport.classList.add("dragging");
  startX = e.pageX - viewport.offsetLeft;
  scrollLeft = viewport.scrollLeft;
  pauseAutoscroll();
});

viewport.addEventListener("mouseleave", () => {
  if (!isDown) return;
  isDown = false;
  startAutoscroll();
});

viewport.addEventListener("mouseup", () => {
  if (!isDown) return;
  isDown = false;
  startAutoscroll();
});

viewport.addEventListener("mousemove", (e) => {
  if (!isDown) return;
  e.preventDefault();
  const x = e.pageX - viewport.offsetLeft;
  const walk = (x - startX) * 1.4; // drag speed multiplier
  viewport.scrollLeft = scrollLeft - walk;
});

/* ---- Touch (Mobile) ---- */
viewport.addEventListener("touchstart", (e) => {
  isDown = true;
  startX = e.touches[0].pageX;
  scrollLeft = viewport.scrollLeft;
  pauseAutoscroll();
}, { passive: true });

viewport.addEventListener("touchend", () => {
  isDown = false;
  startAutoscroll();
});

viewport.addEventListener("touchmove", (e) => {
  if (!isDown) return;
  const x = e.touches[0].pageX;
  const walk = (x - startX) * 1.2;
  viewport.scrollLeft = scrollLeft - walk;
}, { passive: true });

  function pauseAutoscroll() {
    track.classList.add("paused");
    track.classList.remove("autoscroll");
  }

  // toggle controls
  if (btnPause && btnPlay) {
    btnPause.addEventListener("click", () => {
      pauseAutoscroll();
      btnPause.hidden = true;
      btnPlay.hidden = false;
    });
    btnPlay.addEventListener("click", () => {
      startAutoscroll();
      btnPlay.hidden = true;
      btnPause.hidden = false;
    });
  }

  // Pause on hover or focus for accessibility
  viewport.addEventListener("mouseenter", () => {
    pauseAutoscroll();
  });
  viewport.addEventListener("mouseleave", () => {
    startAutoscroll();
  });
  // Pause if any reel-item receives focus (keyboard users)
  track.querySelectorAll(".reel-item").forEach(item => {
    item.addEventListener("focusin", () => pauseAutoscroll());
    item.addEventListener("focusout", () => startAutoscroll());
  });

  // Responsive: recalc speed on resize (give time for layout)
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => { setAutoscrollSpeed(90); }, 240);
  });

  // Edge: when track animation completes one cycle we need seamless loop.
  // We used duplicated content and CSS animation from 0 -> -50% to achieve loop.
  // Start
  startAutoscroll();

  // Accessibility: clicking an item opens Instagram in new tab (anchors already set).
  // Nothing more to do here.

  // Safety: if user is on reduced-motion prefer, reduce animation
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (mq && mq.matches) {
    // disable auto-scroll
    pauseAutoscroll();
    if (btnPause) btnPause.hidden = true;
    if (btnPlay) btnPlay.hidden = false;
  }

})();
/* Testimonials — stable auto + manual scroll (desktop + mobile) */
(function initTestimonialsRestart() {

  const slider = document.getElementById("testimonialSlider");
  if (!slider) return;

  const wrap = slider.parentElement;

  /* Duplicate once for seamless loop */
  if (!slider.dataset.duplicated) {
    slider.innerHTML += slider.innerHTML;
    slider.dataset.duplicated = "true";
  }

  let rafId;
  let running = true;
  let speed = 3; // pixels per frame
  let idleTimer = null;

  /* Auto scroll using scrollLeft (native smooth) */
  function tick() {
    if (running) {
      wrap.scrollLeft += speed;

      /* Seamless loop */
      if (wrap.scrollLeft >= slider.scrollWidth / 2) {
        wrap.scrollLeft = 0;
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  /* Pause + Resume helpers */
  function pauseAuto() {
    running = false;
    clearTimeout(idleTimer);
  }

  function resumeAuto(delay = 800) {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      running = true;
    }, delay);
  }

  /* Manual scroll detection (mouse, touch, trackpad) */
  wrap.addEventListener("scroll", () => {
    pauseAuto();
    resumeAuto();
  }, { passive: true });

  wrap.addEventListener("mouseenter", pauseAuto);
  wrap.addEventListener("mouseleave", () => resumeAuto(400));

  /* Modal logic (original cards only) */
  const cards = Array.from(slider.querySelectorAll(".testimonial-card"));
  const originals = cards.slice(0, cards.length / 2);

  const modal = document.getElementById("testimonialModal");
  const modalPhoto = modal?.querySelector("#modalPhoto");
  const modalName = modal?.querySelector("#modalName");
  const modalText = modal?.querySelector("#modalText");
  const modalClose = modal?.querySelector(".close-modal");

  originals.forEach(card => {
    card.addEventListener("click", () => {
      if (!modal) return;

      modalPhoto.src = card.querySelector(".review-photo")?.src || "";
      modalName.textContent = card.querySelector(".review-name")?.textContent || "";
      modalText.textContent = card.querySelector(".review-text")?.textContent || "";

      modal.style.display = "flex";
      pauseAuto();
    });
  });

  if (modal && modalClose) {
    modalClose.addEventListener("click", () => {
      modal.style.display = "none";
      resumeAuto(400);
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
        resumeAuto(400);
      }
    });
  }

  window.addEventListener("unload", () => cancelAnimationFrame(rafId));

})();


/* ===== Compact 5-step JS ===== */
(function(){
  const stepsContainer = document.getElementById('wfSteps');
  const stepEls = Array.from(document.querySelectorAll('.wf-step'));
  const buttons = Array.from(document.querySelectorAll('.wf-btn'));
  const svg = document.getElementById('wfConnector');
  const path = document.getElementById('wfPath');
  const pathActive = document.getElementById('wfPathActive');
  const dot = document.getElementById('wfDot');

  // keyboard navigation
  stepsContainer.addEventListener('keydown', (e)=>{
    const focused = document.activeElement.closest('.wf-step');
    const idx = focused ? stepEls.indexOf(focused) : -1;
    if(e.key === 'ArrowRight' || e.key === 'ArrowDown'){
      e.preventDefault();
      const next = Math.min(stepEls.length - 1, (idx === -1 ? 0 : idx + 1));
      focusStep(next); moveDotToStep(next, true);
    } else if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){
      e.preventDefault();
      const prev = Math.max(0, (idx === -1 ? 0 : idx - 1));
      focusStep(prev); moveDotToStep(prev, true);
    } else if(e.key === 'Home'){ e.preventDefault(); focusStep(0); moveDotToStep(0,true);
    } else if(e.key === 'End'){ e.preventDefault(); focusStep(stepEls.length-1); moveDotToStep(stepEls.length-1,true);
    } else if(e.key === 'Enter' || e.key === ' '){ if(focused){ focused.querySelector('.wf-btn').click(); } }
  });

  function focusStep(i){ const el = stepEls[i]; if(!el) return; el.focus(); el.querySelector('.wf-btn').focus(); el.scrollIntoView({ inline:'center', behavior:'smooth' }); }

  // accordion + hover
  buttons.forEach((btn,i)=> {
    btn.addEventListener('click', ()=> {
      const li = btn.closest('.wf-step');
      const isOpen = li.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(isOpen));
      const panel = li.querySelector('.wf-panel');
      if(isOpen){ panel.removeAttribute('hidden'); panel.style.maxHeight = panel.scrollHeight + 'px'; } else { panel.setAttribute('hidden',''); panel.style.maxHeight = null; }
      moveDotToStep(i,true);
    });
    const li = stepEls[i];
    li.addEventListener('mouseenter', ()=> moveDotToStep(i,true));
  });

  // reveal observer
  const observer = new IntersectionObserver((entries)=> {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        const el = entry.target;
        const idx = stepEls.indexOf(el);
        setTimeout(()=> el.classList.add('wf-inview'), idx * 80);
      }
    });
  }, { threshold: 0.28 });
  stepEls.forEach(el => observer.observe(el));

  // svg path prep
  const pathLen = path.getTotalLength();
  path.style.strokeDasharray = pathLen;
  pathActive.style.strokeDasharray = `0 ${pathLen}`;

  function clientXToPathPoint(clientX){
    if(!svg || !path) return null;
    const svgRect = svg.getBoundingClientRect();
    let rel = (clientX - svgRect.left) / svgRect.width;
    rel = Math.max(0, Math.min(1, rel));
    const targetLen = rel * pathLen;
    return path.getPointAtLength(targetLen);
  }

  function moveDotToStep(index, animate=true){
    const el = stepEls[index];
    if(!el || !svg || !path) return;
    const cardRect = el.getBoundingClientRect();
    const centerX = cardRect.left + cardRect.width / 2;
    const pt = clientXToPathPoint(centerX);
    if(!pt) return;
    dot.style.opacity = 1;
    if(animate){
      dot.animate([{ transform: dot.style.transform || `translate(${pt.x}px, ${pt.y}px) translate(-50%,-50%) scale(.9)` },
                   { transform: `translate(${pt.x}px, ${pt.y}px) translate(-50%,-50%) scale(1)` }], { duration: 480, easing: 'cubic-bezier(.2,.9,.2,1)', fill:'forwards' })
          .onfinish = ()=> dot.style.transform = `translate(${pt.x}px, ${pt.y}px) translate(-50%,-50%)`;
    } else {
      dot.style.transform = `translate(${pt.x}px, ${pt.y}px) translate(-50%,-50%)`;
    }

    // approximate stroke length by sampling
    let bestLen = 0, bestDiff = Infinity;
    const samples = 40;
    for(let i=0;i<=samples;i++){
      const tLen = (i/samples) * pathLen;
      const p = path.getPointAtLength(tLen);
      const diff = Math.abs(p.x - pt.x);
      if(diff < bestDiff){ bestDiff = diff; bestLen = tLen; }
    }
    pathActive.style.strokeDasharray = `${bestLen} ${pathLen - bestLen}`;
    stepEls.forEach((s, idx)=> s.classList.toggle('active', idx === index));
  }

  // init
  setTimeout(()=> {
    const firstIn = stepEls.findIndex(s => s.classList.contains('wf-inview'));
    const idx = firstIn >= 0 ? firstIn : 0;
    moveDotToStep(idx, false);
    stepEls[idx].classList.add('active');
  }, 600);

  // reposition on resize
  window.addEventListener('resize', ()=> {
    const active = stepEls.findIndex(s => s.classList.contains('active'));
    moveDotToStep(active >= 0 ? active : 0, false);
  });
})();


// Footer helpers: set year and ensure map iframe is responsive
document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("footerYear");
  if (year) year.textContent = new Date().getFullYear();

  // Optional: lazy-load map only when footer is visible (saves network)
  const mapFrame = document.querySelector(".map-iframe");
  if (mapFrame) {
    // If you want lazy load on intersection:
    if ("IntersectionObserver" in window) {
      const obs = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const src = mapFrame.getAttribute("data-src");
            if (src) mapFrame.src = src;
            observer.disconnect();
          }
        });
      }, { rootMargin: "200px" });
      // move real src to data-src to avoid immediate load if you prefer
      // For now we keep the src as-is; if you change to data-src, uncomment:
      // obs.observe(mapFrame);
    }
  }
});


// whatsappfloatbutton
(function(){
  const el = document.getElementById('whatsapp-float');
  if(!el) return;
  // If you prefer constructing the URL dynamically:
  const phone = '919876543210'; // change to your number (no +)
  const message = 'Hello, I would like to enquire about your services.'; // customize
  const url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
  el.setAttribute('href', url);
})();
// whatsappfloatbuttonend


// signform script
const form = document.getElementById("signupForm");
const overlay = document.getElementById("signupOverlay");
const website = document.getElementById("websiteContent");

/* Check if already signed up */
if (localStorage.getItem("signedUp") === "true") {
  overlay.style.display = "none";
  website.classList.remove("blurred");
} else {
  // Hide overlay initially
  overlay.style.display = "none";

  setTimeout(() => {
    overlay.style.display = "flex"; // show it first
    
    // Force browser to register the display change before animating
    void overlay.offsetHeight; // 👈 this triggers reflow so animation fires

    overlay.classList.add("visible");
  }, 5000);
}
/* Phone number: allow digits only */
form.phone.addEventListener("input", () => {
  form.phone.value = form.phone.value.replace(/\D/g, "");
});

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const data = {
    name: form.name.value,
    phone: form.phone.value,
    eventType: form.eventType.value,
    venue: form.venue.value,
    location: form.location.value
  };

  fetch("https://script.google.com/macros/s/AKfycbxKmB4Up-bqRCOiG8npj7Y8G32uwtYzxl7F6GyIZMKoIcA8Cq7ELW_p0FatJD7mOQtjew/exec", {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json"
    }
  });

  // Unlock website
  localStorage.setItem("signedUp", "true");
  document.getElementById("signupOverlay").style.display = "none";
  document.getElementById("websiteContent").classList.remove("blurred");
});

//  signup form end