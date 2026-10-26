// Shared by index.html and history.html: data loading, cards, filters, toast and the delete dialog.
window.ITPM = (() => {
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

  const icons = {
    group: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.8"/><path d="M16 14.2c3.2.1 5.5 2.3 5.5 5.8"/></svg>',
    individual: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 21c0-4.2 3.4-7 7.5-7s7.5 2.8 7.5 7"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  };

  // ---------- Data ----------
  async function load() {
    const [seed, saved] = await Promise.all([
      fetchJSON(SEED).catch(() => []),
      fetchJSON(API).catch(() => ({})),
    ]);
    const hidden = new Set(saved.hidden || []);
    return [...seed, ...(saved.assignments || [])]
      .filter((a) => a && a.id && a.title && a.due && !isNaN(new Date(a.due)) && !hidden.has(a.id))
      .map((a) => ({ ...a, type: a.type === "group" ? "group" : "individual", dueMs: new Date(a.due).getTime() }))
      .sort((a, b) => a.dueMs - b.dueMs);
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    return res.json();
  }

  // ---------- Cards ----------
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
        <span class="foot-right">
          <span class="urgency ${urgencyClass(diff)}">${urgencyLabel(diff)}</span>
          <button type="button" class="del-btn" aria-label="Delete assignment" title="Delete">${icons.trash}</button>
        </span>
      </div>`;
    el.querySelector("h3").textContent = a.title;
    el.querySelector(".desc").textContent = a.description || "";
    el.querySelector(".when span").textContent = formatDate(a.dueMs);
    el.querySelector(".del-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openDelete(a);
    });

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
    el.addEventListener("keydown", (e) => {
      if (e.target === el && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggle(); }
    });
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
    if (diff < 0) {
      const ago = Math.floor(-diff / DAY);
      return ago === 0 ? "Ended today" : ago === 1 ? "Ended yesterday" : `Ended ${ago} days ago`;
    }
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

  // ---------- Filters ----------
  const filters = { type: "all", query: "" };

  function matches(a) {
    if (filters.type !== "all" && a.type !== filters.type) return false;
    if (!filters.query) return true;
    return (a.title + " " + (a.description || "")).toLowerCase().includes(filters.query);
  }

  function setupFilters(onChange) {
    document.querySelectorAll(".chip").forEach((chip) =>
      chip.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        filters.type = chip.dataset.filter;
        onChange();
      })
    );
    $("search").addEventListener("input", (e) => { filters.query = e.target.value.trim().toLowerCase(); onChange(); });
  }

  // ---------- Toast ----------
  function toast(msg, isError) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.toggle("error", !!isError);
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  function shake(form, errorEl, msg, field) {
    errorEl.textContent = msg;
    form.classList.remove("shake");
    void form.offsetWidth;
    form.classList.add("shake");
    if (field) { field.value = ""; field.focus(); }
  }

  // ---------- Delete dialog ----------
  let deleteTarget = null;
  let onDeleted = () => {};

  document.body.insertAdjacentHTML("beforeend", `
    <dialog id="deleteDialog" class="modal">
      <form id="deleteForm" method="dialog" novalidate>
        <div class="modal-head">
          <h2>Delete assignment?</h2>
          <button type="button" class="close" data-close aria-label="Close">&times;</button>
        </div>
        <p class="del-msg">This removes <strong id="deleteTitle"></strong> for everyone. It can't be undone.</p>
        <label>Password
          <input name="password" type="password" required autocomplete="off" placeholder="Course password" />
        </label>
        <p id="deleteError" class="form-error" role="alert"></p>
        <div class="btn-row">
          <button type="button" class="ghost" data-close>Cancel</button>
          <button type="submit" class="submit danger" id="deleteBtn">Delete</button>
        </div>
      </form>
    </dialog>`);

  const delDialog = $("deleteDialog");
  const delForm = $("deleteForm");
  const delError = $("deleteError");
  delDialog.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => delDialog.close()));
  delDialog.addEventListener("click", (e) => { if (e.target === delDialog) delDialog.close(); });

  function openDelete(a) {
    deleteTarget = a;
    delForm.reset();
    delError.textContent = "";
    $("deleteTitle").textContent = `“${a.title}”`;
    delDialog.showModal();
    delForm.elements.password.focus();
  }

  delForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pwField = delForm.elements.password;
    if (!pwField.value) return shake(delForm, delError, "Enter the password to delete.", pwField);

    const btn = $("deleteBtn");
    btn.disabled = true;
    btn.textContent = "Deleting…";
    try {
      const res = await fetch(API, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id, password: pwField.value }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) return shake(delForm, delError, "Wrong password. Nothing was deleted.", pwField);
      if (!res.ok) return shake(delForm, delError, body.error || "Could not delete. Please try again.");
      delDialog.close();
      toast(`Deleted “${deleteTarget.title}”.`);
      onDeleted();
    } catch {
      shake(delForm, delError, "Network error. Is the site deployed on Netlify?");
    } finally {
      btn.disabled = false;
      btn.textContent = "Delete";
    }
  });

  return {
    API, DAY, $, load, card, matches, setupFilters, toast, shake,
    set onDeleted(fn) { onDeleted = fn; },
  };
})();
