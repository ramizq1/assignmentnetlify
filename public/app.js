(() => {
  const { API, DAY, $, card, matches, toast, shake } = ITPM;
  const grid = $("grid");
  const dialog = $("formDialog");
  const form = $("addForm");
  const formError = $("formError");

  let assignments = [];
  let countdownTimer = null;

  async function load() {
    assignments = await ITPM.load();
    render();
  }

  // ---------- Rendering ----------
  function render() {
    const now = Date.now();
    const upcoming = assignments.filter((a) => a.dueMs >= now);
    const pastCount = assignments.length - upcoming.length;

    $("statTotal").textContent = upcoming.length;
    $("statWeek").textContent = upcoming.filter((a) => a.dueMs - now <= 7 * DAY).length;
    $("statGroup").textContent = upcoming.filter((a) => a.type === "group").length;
    $("statSolo").textContent = upcoming.filter((a) => a.type === "individual").length;
    $("historyCount").textContent = pastCount;

    const visible = upcoming.filter(matches);
    grid.replaceChildren(...visible.map((a, i) => card(a, i, now)));
    $("empty").hidden = visible.length > 0;

    startCountdown(upcoming[0]);
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

  ITPM.setupFilters(render);
  ITPM.onDeleted = load;

  // ---------- Add form ----------
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
    shake(form, formError, msg, field);
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
