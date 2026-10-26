(() => {
  const API = "/api/assignments";
  const SEED = "assignments.json";
  const DAY = 86400000;
  const PALETTE = [
    ["#7c5cff", "#ff4fa3"],
    ["#19d3c5", "#38bdf8"],
    ["#ff9f43", "#ff4fa3"],
    ["#a3e635", "#19d3c5"],
    ["#38bdf8", "#7c5cff"],
    ["#ff4fa3", "#ff9f43"],
  ];

  const $ = (id) => document.getElementById(id);
  const grid = $("grid");
  const pastGrid = $("pastGrid");
  const dialog = $("formDialog");
  const form = $("addForm");
  const formError = $("formError");

  let assignments = [];
  let filter = "all";
  let query = "";
  let countdownTimer = null;

  const icons = {
    group: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.8"/><path d="M16 14.2c3.2.1 5.5 2.3 5.5 5.8"/></svg>',
    individual: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 21c0-4.2 3.4-7 7.5-7s7.5 2.8 7.5 7"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  };

  // ---------- Data ----------
  async function load() {
    const [seed, saved] = await Promise.all([
      fetchJSON(SEED).catch(() => []),
      fetchJSON(API).catch(() => []),
    ]);
    assignments = [...seed, ...saved]
      .filter((a) => a && a.title && a.due && !isNaN(new Date(a.due)))
      .map((a) => ({ ...a, type: a.type === "group" ? "group" : "individual", dueMs: new Date(a.due).getTime() }))
      .sort((a, b) => a.dueMs - b.dueMs);
    render();
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    return res.json();
  }

  // ---------- Rendering ----------
  function render() {
    const now = Date.now();
    const upcoming = assignments.filter((a) => a.dueMs >= now);
    const past = assignments.filter((a) => a.dueMs < now).reverse();

    $("statTotal").textContent = upcoming.length;
    $("statWeek").textContent = upcoming.filter((a) => a.dueMs - now <= 7 * DAY).length;
    $("statGroup").textContent = upcoming.filter((a) => a.type === "group").length;
    $("statSolo").textContent = upcoming.filter((a) => a.type === "individual").length;

    const visible = upcoming.filter(matches);
    grid.replaceChildren(...visible.map((a, i) => card(a, i, now)));
    $("empty").hidden = visible.length > 0;

    const visiblePast = past.filter(matches);
    $("pastWrap").hidden = visiblePast.length === 0;
    $("pastCount").textContent = visiblePast.length;
    pastGrid.replaceChildren(...visiblePast.map((a, i) => card(a, i, now)));

    startCountdown(upcoming[0]);
  }

  function matches(a) {
    if (filter !== "all" && a.type !== filter) return false;
    if (!query) return true;
    return (a.title + " " + (a.description || "")).toLowerCase().includes(query);
  }

  function card(a, i, now) {
    const diff = a.dueMs - now;
    const days = Math.ceil(diff / DAY);
    const [c1, c2] = diff >= 0 && diff < 2 * DAY ? ["#ff5470", "#ff9f43"] : PALETTE[i % PALETTE.length];
    const fill = diff < 0 ? 100 : Math.round(100 - (Math.min(diff, 30 * DAY) / (30 * DAY)) * 100);

    const el = document.createElement("article");
    el.className = "card";
    el.tabIndex = 0;
    el.style.setProperty("--accent", c1);
    el.style.setProperty("--accent-2", c2);
    el.style.animationDelay = `${Math.min(i, 12) * 60}ms`;

    el.innerHTML = `
      <div class="card-top">
        <span class="badge ${a.type}">${icons[a.type]}${a.type === "group" ? "Group" : "Individual"}</span>
        <div class="days" style="--p:${fill}">
          <div><b>${diff < 0 ? "✓" : Math.max(days, 0)}</b><small>${diff < 0 ? "done" : days === 1 ? "day" : "days"}</small></div>
        </div>
      </div>
      <h3></h3>
      <p class="desc"></p>
      <div class="card-foot">
        <span class="when">${icons.clock}<span></span></span>
        <span class="urgency ${urgencyClass(diff)}">${urgencyLabel(diff)}</span>
      </div>`;
    el.querySelector("h3").textContent = a.title;
    el.querySelector(".desc").textContent = a.description || "";
    el.querySelector(".when span").textContent = formatDate(a.dueMs);

    const desc = el.querySelector(".desc");
    requestAnimationFrame(() => {
      if (desc.scrollHeight > desc.clientHeight + 2) {
        const more = document.createElement("div");
        more.className = "more";
        more.textContent = "Click to read more";
        el.appendChild(more);
      }
    });

    const toggle = () => {
      el.classList.toggle("open");
      const more = el.querySelector(".more");
      if (more) more.textContent = el.classList.contains("open") ? "Click to collapse" : "Click to read more";
    };
    el.addEventListener("click", toggle);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    addTilt(el);
    return el;
  }

  function urgencyClass(diff) {
    if (diff < 0) return "u-past";
    if (diff < 2 * DAY) return "u-hot";
    if (diff < 7 * DAY) return "u-soon";
    return "u-ok";
  }

  function urgencyLabel(diff) {
    if (diff < 0) return "Past due";
    const hours = diff / 3600000;
    if (hours < 1) return "Due within the hour";
    if (hours < 24) return `Due in ${Math.floor(hours)}h`;
    const days = Math.ceil(diff / DAY);
    if (days === 1) return "Due tomorrow";
    if (days < 7) return `Due in ${days} days`;
    const weeks = Math.round(days / 7);
    return `In ${weeks} week${weeks > 1 ? "s" : ""}`;
  }

  function formatDate(ms) {
    return new Date(ms).toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
  }

  function addTilt(el) {
    if (matchMedia("(hover: none)").matches) return;
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(800px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateY(-4px)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  }

  // ---------- Countdown ----------
  function startCountdown(next) {
    clearInterval(countdownTimer);
    $("nextUp").hidden = !next;
    if (!next) return;
    $("nextTitle").textContent = next.title;
    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const diff = next.dueMs - Date.now();
      if (diff <= 0) { render(); return; }
      $("cdD").textContent = Math.floor(diff / DAY);
      $("cdH").textContent = pad(Math.floor((diff % DAY) / 3600000));
      $("cdM").textContent = pad(Math.floor((diff % 3600000) / 60000));
      $("cdS").textContent = pad(Math.floor((diff % 60000) / 1000));
    };
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  // ---------- Filters ----------
  document.querySelectorAll(".chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      filter = chip.dataset.filter;
      render();
    })
  );
  $("search").addEventListener("input", (e) => { query = e.target.value.trim().toLowerCase(); render(); });

  // ---------- Form ----------
  $("openForm").addEventListener("click", () => {
    form.reset();
    formError.textContent = "";
    dialog.showModal();
    form.elements.title.focus();
  });
  $("closeForm").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.textContent = "";
    const data = Object.fromEntries(new FormData(form));
    const title = data.title.trim();
    const description = data.description.trim();

    if (!title || !description || !data.due) return fail("Please fill in the title, description and due date.");
    if (!data.password) return fail("Enter the password to save.", form.elements.password);

    const btn = $("submitBtn");
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, type: data.type,
          due: new Date(data.due).toISOString(),
          password: data.password,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) return fail("Wrong password. Submission not saved.", form.elements.password);
      if (!res.ok) return fail(body.error || "Could not save. Please try again.");
      dialog.close();
      toast("Assignment saved! It will show on every refresh.");
      confetti();
      load();
    } catch {
      fail("Network error. Is the site deployed on Netlify?");
    } finally {
      btn.disabled = false;
      btn.textContent = "Save assignment";
    }
  });

  function fail(msg, field) {
    formError.textContent = msg;
    form.classList.remove("shake");
    void form.offsetWidth;
    form.classList.add("shake");
    if (field) { field.value = ""; field.focus(); }
  }

  function toast(msg, isError) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.toggle("error", !!isError);
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  // ---------- Confetti ----------
  function confetti() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = $("confetti");
    const ctx = canvas.getContext("2d");
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const colors = ["#7c5cff", "#ff4fa3", "#ff9f43", "#19d3c5", "#a3e635", "#38bdf8"];
    const pieces = Array.from({ length: 160 }, () => ({
      x: innerWidth / 2, y: innerHeight * 0.6,
      vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 16 - 6,
      s: Math.random() * 7 + 4, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    let frame = 0;
    (function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach((p) => {
        p.vy += 0.4; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      });
      if (++frame < 160) requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    })();
  }

  load();
})();
