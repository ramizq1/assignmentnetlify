(() => {
  const { DAY, $, card, matches } = ITPM;
  const timeline = $("timeline");

  let past = [];

  async function load() {
    const now = Date.now();
    past = (await ITPM.load()).filter((a) => a.dueMs < now).reverse();
    render();
  }

  function render() {
    const now = Date.now();
    $("statTotal").textContent = past.length;
    $("statMonth").textContent = past.filter((a) => now - a.dueMs <= 30 * DAY).length;
    $("statGroup").textContent = past.filter((a) => a.type === "group").length;
    $("statSolo").textContent = past.filter((a) => a.type === "individual").length;

    const visible = past.filter(matches);
    $("empty").hidden = visible.length > 0;
    if (!past.length) $("empty").textContent = "No past assignments yet. Once a deadline passes, it shows up here.";
    else if (!visible.length) $("empty").textContent = "Nothing in the history matches.";

    // Group by month, newest month first.
    const months = new Map();
    visible.forEach((a) => {
      const label = new Date(a.dueMs).toLocaleString(undefined, { month: "long", year: "numeric" });
      if (!months.has(label)) months.set(label, []);
      months.get(label).push(a);
    });

    let i = 0;
    timeline.replaceChildren(...[...months].map(([label, items]) => {
      const section = document.createElement("section");
      section.className = "month";
      const head = document.createElement("h2");
      head.className = "month-head";
      head.innerHTML = `<span></span><span class="pill">${items.length}</span>`;
      head.firstChild.textContent = label;
      const grid = document.createElement("div");
      grid.className = "grid";
      grid.append(...items.map((a) => card(a, i++, now)));
      section.append(head, grid);
      return section;
    }));
  }

  ITPM.setupFilters(render);
  ITPM.onDeleted = load;
  load();
})();
