(() => {
  const $ = (id) => document.getElementById(id);

  const unwrap = $("unwrap");
  const unwrapBtn = $("unwrapBtn");
  const story = $("story");
  const candlesEl = $("candles");
  const cake = $("cake");
  const wishHint = $("wishHint");
  const wishGranted = $("wishGranted");
  const progress = $("progress");
  const typed = $("typed");
  const letterSign = $("letterSign");
  const musicBtn = $("musicBtn");
  const music = $("music");

  let blown = false;
  let typedOnce = false;
  let micStream = null;
  let userMuted = false;
  let storyOpen = false;
  let specialPlaying = false;
  let birthdayNode = null;
  let birthdayActive = false;
  let photoUrls = [];

  function renderHero() {
    $("heroLine").textContent = CONFIG.heroLine;
    $("heroSub").textContent = CONFIG.heroSub;
    $("surpriseBtn").textContent = CONFIG.surpriseTitle;
    $("surpriseLine").textContent = CONFIG.surpriseMessage;
    $("surpriseWish").textContent = CONFIG.surpriseWish;
    $("closeLine").textContent = `Happy birthday, ${CONFIG.herName}.`;
    $("closeSub").textContent = "That's all I made. The rest is just me.";
    $("made").textContent = `made for you by ${CONFIG.yourName}`;
    $("letterSign").textContent = CONFIG.yourName;
    document.title = `For ${CONFIG.herName} — ${CONFIG.birthday}`;
    const paperDate = $("paperDate");
    if (paperDate) {
      paperDate.textContent = `For ${CONFIG.herName}, ${CONFIG.birthday}`;
    }
  }

  function renderCandles() {
    candlesEl.innerHTML = "";
    for (let i = 0; i < 5; i += 1) {
      const candle = document.createElement("div");
      candle.className = "candle";
      candle.innerHTML = `<span class="flame"></span><span class="smoke"></span>`;
      candlesEl.appendChild(candle);
    }
  }

  function renderMemories() {
    const root = $("timeline");
    root.innerHTML = "";
    CONFIG.memories.forEach((memory, index) => {
      const article = document.createElement("article");
      article.className = "memory reveal-up";
      const fallback = CONFIG.herName.charAt(0);
      article.innerHTML = `
        <figure class="polaroid" style="--wash:${["#c97b84", "#8b3a48", "#b8860b", "#6e2c38"][index % 4]}">
          <div class="frame">
            <span class="mono">${fallback}</span>
            <img src="${memory.photo}" alt="${memory.title}" />
          </div>
          <figcaption>${memory.title}</figcaption>
        </figure>
        <div class="memory-copy">
          <h3>${memory.title}</h3>
          <p>${memory.caption}</p>
        </div>
      `;
      const img = article.querySelector("img");
      const mono = article.querySelector(".mono");
      bindPhoto(img, mono);
      root.appendChild(article);
    });
  }

  function renderReasons() {
    const list = $("reasonList");
    list.innerHTML = "";
    CONFIG.reasons.forEach((reason, index) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span>${reason}`;
      list.appendChild(li);
    });
  }

  function observeReveals() {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          if (entry.target.id === "letter" && !typedOnce) {
            typedOnce = true;
            typeLetter();
          }
        });
      },
      { threshold: 0.22 }
    );

    document.querySelectorAll(".reveal-up, .section, .hero, .closing").forEach((el) => io.observe(el));

    const reasons = [...document.querySelectorAll(".reason-list li")];
    const rio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const i = reasons.indexOf(entry.target);
          entry.target.style.animationDelay = `${i * 0.12}s`;
          entry.target.classList.add("in");
          rio.unobserve(entry.target);
        });
      },
      { threshold: 0.35 }
    );
    reasons.forEach((li) => rio.observe(li));
  }

  function typeLetter() {
    const text = CONFIG.letter;
    let i = 0;
    typed.innerHTML = `<span class="caret"></span>`;
    const step = () => {
      if (i > text.length) return;
      typed.innerHTML = `${escapeHtml(text.slice(0, i)).replace(/\n/g, "<br>")}<span class="caret"></span>`;
      const next = text[i] || "";
      i += 1;
      const pause = next === "." || next === "?" || next === "!" ? 160 : next === "\n" ? 220 : 22;
      window.setTimeout(step, pause);
    };
    step();
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function blowOut() {
    if (blown) return;
    blown = true;
    document.querySelectorAll(".candle").forEach((candle, i) => {
      window.setTimeout(() => candle.classList.add("is-out"), i * 90);
    });
    wishGranted.classList.add("show");
    wishHint.textContent = "";
    ["wishActions", "wishLede", "micBtn", "blowBtn"].forEach((id) => {
      const el = $(id);
      if (el) el.hidden = true;
    });
    stopMic();
    playBirthdayThenContinue();
    burst(0.6);
  }

  async function listenForBlow() {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(micStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      wishHint.textContent = "Blow toward your phone. Softer than you think.";

      const tick = () => {
        if (blown) return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((sum, n) => sum + n, 0) / data.length;
        if (avg > 22) blowOut();
        else requestAnimationFrame(tick);
      };
      tick();
    } catch {
      wishHint.textContent = "Mic didn’t start — tap the cake instead. Same wish.";
    }
  }

  function stopMic() {
    if (!micStream) return;
    micStream.getTracks().forEach((track) => track.stop());
    micStream = null;
  }

  function burst(intensity = 1) {
    if (typeof confetti !== "function") return;
    const count = Math.round(140 * intensity);
    confetti({
      particleCount: count,
      spread: 78,
      origin: { y: 0.7 },
      colors: ["#d4af37", "#f0d78c", "#e8b4b8", "#f6efe4", "#c97b84"],
    });
  }

  function bindPhoto(img, fallback) {
    const ready = () => {
      img.classList.add("is-ready");
      if (fallback) fallback.remove();
    };
    img.addEventListener("error", () => img.remove());
    if (img.complete && img.naturalWidth) ready();
    else img.addEventListener("load", ready);
  }

  function renderHerGallery() {
    const root = $("herGallery");
    if (!root || !CONFIG.herPhotos) return;
    root.innerHTML = "";
    CONFIG.herPhotos.forEach((item, index) => {
      const figure = document.createElement("figure");
      figure.className = "polaroid gallery-card";
      figure.style.setProperty("--tilt", `${index % 2 === 0 ? -2.2 : 2.4}deg`);
      figure.style.setProperty("--d", `${0.12 + index * 0.1}s`);
      figure.innerHTML = `
        <div class="frame">
          <span class="mono">${CONFIG.herName.charAt(0)}</span>
          <img src="${item.photo}" alt="${item.caption}" />
        </div>
        <figcaption>${item.caption}</figcaption>
      `;
      bindPhoto(figure.querySelector("img"), figure.querySelector(".mono"));
      root.appendChild(figure);
    });
  }

  function openSurprise() {
    const reveal = $("reveal");
    if ($("surpriseBtn")) $("surpriseBtn").hidden = true;
    if ($("surpriseLede")) $("surpriseLede").hidden = true;
    reveal.hidden = false;
    reveal.classList.add("is-open");
    burst(1.15);
    window.setTimeout(() => burst(0.7), 350);
    $("herGallery")?.querySelectorAll(".gallery-card").forEach((card, i) => {
      window.setTimeout(() => card.classList.add("in"), 180 + i * 140);
    });

    if (CONFIG.youtubeId) {
      const box = $("videoEmbed");
      box.hidden = false;
      box.innerHTML = `<iframe src="https://www.youtube.com/embed/${encodeURIComponent(CONFIG.youtubeId)}?rel=0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="A message for ${CONFIG.herName}"></iframe>`;
    }

    if (CONFIG.spotifyEmbed) {
      const box = $("spotifyEmbed");
      box.hidden = false;
      box.classList.add("spotify");
      box.innerHTML = `<iframe src="${CONFIG.spotifyEmbed}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="A playlist for ${CONFIG.herName}"></iframe>`;
    }
  }

  function startParticles() {
    const canvas = $("particles");
    const ctx = canvas.getContext("2d");
    const dots = [];
    const hearts = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const small = window.innerWidth < 760;
    const dotCount = small ? 28 : 70;
    const heartCount = small ? 7 : 14;

    for (let i = 0; i < dotCount; i += 1) {
      dots.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.8 + 0.4,
        a: Math.random() * 0.45 + 0.15,
        s: Math.random() * 0.25 + 0.05,
      });
    }

    for (let i = 0; i < heartCount; i += 1) {
      hearts.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        s: Math.random() * 0.7 + 0.35,
        v: Math.random() * 0.35 + 0.12,
        a: Math.random() * 0.28 + 0.08,
      });
    }

    const drawHeart = (x, y, size, alpha) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(size, size);
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.bezierCurveTo(-9, -4, -6, -12, 0, -8);
      ctx.bezierCurveTo(6, -12, 9, -4, 0, 4);
      ctx.fillStyle = `rgba(232, 180, 184, ${alpha})`;
      ctx.fill();
      ctx.restore();
    };

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach((dot) => {
        dot.y -= dot.s;
        if (dot.y < -4) {
          dot.y = canvas.height + 4;
          dot.x = Math.random() * canvas.width;
        }
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240, 215, 140, ${dot.a})`;
        ctx.fill();
      });
      hearts.forEach((heart) => {
        heart.y -= heart.v;
        heart.x += Math.sin(heart.y / 40) * 0.15;
        if (heart.y < -20) {
          heart.y = canvas.height + 20;
          heart.x = Math.random() * canvas.width;
        }
        drawHeart(heart.x, heart.y, heart.s, heart.a);
      });
      requestAnimationFrame(tick);
    };
    tick();
  }

  function trackProgress() {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
    };
    window.addEventListener("scroll", () => {
      onScroll();
      if (window.scrollY > 80) stopBirthdayOnScroll();
    }, { passive: true });
  }

  function fadeVolume(el, to, ms) {
    return new Promise((resolve) => {
      const from = el.volume;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / ms);
        el.volume = from + (to - from) * t;
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  function playClip(src, volume) {
    return new Promise((resolve) => {
      const node = new Audio(src);
      birthdayNode = node;
      node.volume = volume;
      node.addEventListener("ended", () => resolve(), { once: true });
      node.addEventListener("error", () => resolve(), { once: true });
      node.play().then(() => {}).catch(() => resolve());
    });
  }

  async function resumeBed() {
    if (userMuted) return;
    music.volume = 0.08;
    await music.play().catch(() => {});
    musicBtn.classList.add("is-on");
    await fadeVolume(music, 0.48, 700);
  }

  function stopBirthdayOnScroll() {
    if (!birthdayActive) return;
    const wish = $("wish");
    if (wish && wish.getBoundingClientRect().bottom > 140) return;
    birthdayActive = false;
    specialPlaying = false;
    if (birthdayNode) {
      birthdayNode.pause();
      birthdayNode.currentTime = 0;
      birthdayNode = null;
    }
    resumeBed();
  }

  async function playBirthdayThenContinue() {
    const src = CONFIG.sounds && CONFIG.sounds.birthday;
    if (!src || userMuted) return;
    birthdayActive = true;
    specialPlaying = true;
    try {
      await fadeVolume(music, 0.06, 320);
      if (!birthdayActive) return;
      music.pause();
      await playClip(src, 0.8);
    } finally {
      specialPlaying = false;
      if (birthdayActive) {
        birthdayActive = false;
        birthdayNode = null;
        await resumeBed();
      }
    }
  }

  function keepMusicOn() {
    if (!CONFIG.musicSrc || userMuted || specialPlaying) return;
    if (music.paused) {
      music.play().then(() => musicBtn.classList.add("is-on")).catch(() => {});
    }
  }

  function setupMusic() {
    if (!CONFIG.musicSrc || !music) return;
    music.src = CONFIG.musicSrc;
    music.loop = true;
    music.volume = 0.48;
    musicBtn.hidden = false;
    music.addEventListener("error", () => {
      musicBtn.hidden = true;
    });
    music.addEventListener("pause", () => {
      if (!userMuted && !specialPlaying) {
        window.setTimeout(keepMusicOn, 120);
      }
    });
    music.addEventListener("ended", keepMusicOn);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) keepMusicOn();
    });
    window.addEventListener("pointerdown", keepMusicOn, { passive: true });
    window.addEventListener("touchstart", keepMusicOn, { passive: true });
    window.addEventListener("click", keepMusicOn);
    musicBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (userMuted || music.paused) {
        userMuted = false;
        try {
          await music.play();
          musicBtn.classList.add("is-on");
        } catch {
          wishHint.textContent = "Tap the music button if the song doesn’t start.";
        }
      } else {
        userMuted = true;
        music.pause();
        musicBtn.classList.remove("is-on");
      }
    });
    startMusic();
  }

  function startMusic() {
    if (!CONFIG.musicSrc || !music) return;
    userMuted = false;
    storyOpen = true;
    music.volume = 0.48;
    const play = () => music.play().then(() => {
      music.muted = false;
      musicBtn.hidden = false;
      musicBtn.classList.add("is-on");
    });
    play().catch(() => {
      music.muted = true;
      play().then(() => {
        music.muted = false;
      }).catch(() => {
        music.muted = false;
        musicBtn.hidden = false;
      });
    });
  }

  function openStory() {
    startMusic();
    unwrap.classList.add("is-opening");
    window.setTimeout(() => {
      unwrap.remove();
      story.hidden = false;
      story.classList.add("is-live");
      document.body.classList.remove("is-locked");
      window.scrollTo(0, 0);
    }, 900);
  }

  function normalizeKey(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  }

  async function deriveKey(password, salt) {
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 8000, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
  }

  async function decryptBin(url, cryptoKey) {
    const bytes = new Uint8Array(await fetch(url).then((res) => {
      if (!res.ok) throw new Error("missing photo");
      return res.arrayBuffer();
    }));
    const iv = bytes.slice(16, 28);
    const tag = bytes.slice(28, 44);
    const data = bytes.slice(44);
    const combined = new Uint8Array(data.length + tag.length);
    combined.set(data);
    combined.set(tag, data.length);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, combined);
    const head = new Uint8Array(plain, 0, 3);
    const type = head[0] === 0xff && head[1] === 0xd8 ? "image/jpeg" : "image/png";
    return URL.createObjectURL(new Blob([plain], { type }));
  }

  async function loadPlainPhoto(binPath) {
    const pngPath = binPath.replace(/\.bin$/i, ".png");
    const res = await fetch(pngPath).catch(() => null);
    if (res && res.ok) return pngPath;
    return "";
  }

  async function unlockPhotos(password) {
    const keyWord = normalizeKey(password);
    const paths = [...new Set([
      ...CONFIG.memories.map((item) => item.photo),
      ...CONFIG.herPhotos.map((item) => item.photo),
    ])];
    const map = {};
    const firstPlain = await loadPlainPhoto(paths[0]);
    if (firstPlain) {
      await Promise.all(paths.map(async (path) => {
        map[path] = (await loadPlainPhoto(path)) || path;
      }));
    } else {
      const firstBytes = new Uint8Array(await fetch(paths[0]).then((res) => res.arrayBuffer()));
      const cryptoKey = await deriveKey(keyWord, firstBytes.slice(0, 16));
      await Promise.all(paths.map(async (path) => {
        map[path] = await decryptBin(path, cryptoKey);
      }));
    }
    CONFIG.memories.forEach((item) => {
      item.photo = map[item.photo];
    });
    CONFIG.herPhotos.forEach((item) => {
      item.photo = map[item.photo];
    });
    photoUrls = [0, 1, 2, 8, 9, 10]
      .map((index) => CONFIG.memories[index] && CONFIG.memories[index].photo)
      .filter(Boolean);
  }

  function renderPhotoBg() {
    const root = $("photoBg");
    if (!root || !photoUrls.length) return;
    root.innerHTML = "";
    photoUrls.slice(0, 6).forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      root.appendChild(img);
    });
    root.classList.add("is-on");
  }

  function playButtonMotion(event) {
    const btn = event.currentTarget;
    if (!btn) return;
    btn.classList.remove("is-pop");
    void btn.offsetWidth;
    btn.classList.add("is-pop");
    window.setTimeout(() => btn.classList.remove("is-pop"), 560);

    const rect = btn.getBoundingClientRect();
    const x = event.clientX || rect.left + rect.width / 2;
    const y = event.clientY || rect.top + rect.height / 2;
    if (btn.classList.contains("btn")) {
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.left = `${x - rect.left}px`;
      ripple.style.top = `${y - rect.top}px`;
      btn.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 700);
    }

    for (let i = 0; i < 10; i += 1) {
      const spark = document.createElement("i");
      spark.className = "click-spark";
      const angle = (Math.PI * 2 * i) / 10;
      const dist = 28 + Math.random() * 36;
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.setProperty("--x", `${Math.cos(angle) * dist}px`);
      spark.style.setProperty("--y", `${Math.sin(angle) * dist}px`);
      document.body.appendChild(spark);
      window.setTimeout(() => spark.remove(), 720);
    }
  }

  function on(id, event, handler) {
    const el = $(id);
    if (el) el.addEventListener(event, handler);
  }

  function bind() {
    document.querySelectorAll(".btn").forEach((btn) => {
      btn.addEventListener("click", playButtonMotion);
    });
    on("unwrapBtn", "click", openStory);
    on("blowBtn", "click", blowOut);
    on("micBtn", "click", listenForBlow);
    if (cake) {
      cake.addEventListener("click", playButtonMotion);
      cake.addEventListener("click", blowOut);
      cake.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          blowOut();
        }
      });
    }
    on("surpriseBtn", "click", openSurprise);
  }

  function startApp() {
    renderHero();
    renderCandles();
    renderMemories();
    renderReasons();
    renderHerGallery();
    renderPhotoBg();
    observeReveals();
    trackProgress();
    bind();
  }

  document.body.classList.add("is-locked");
  setupMusic();
  startParticles();
  startApp();
  unlockPhotos("26august")
    .then(() => {
      renderMemories();
      renderHerGallery();
      renderPhotoBg();
      observeReveals();
    })
    .catch(() => {});
})();
