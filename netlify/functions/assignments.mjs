import { getStore } from "@netlify/blobs";

const PASSWORD = process.env.ASSIGNMENT_PASSWORD || "itpm";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export default async (req) => {
  const store = getStore({ name: "assignments", consistency: "strong" });
  // Starter assignments live in public/assignments.json, so deleting one records its id here instead.
  const hiddenStore = getStore({ name: "hidden-assignments", consistency: "strong" });

  if (req.method === "GET") {
    const [{ blobs }, { blobs: hidden }] = await Promise.all([store.list(), hiddenStore.list()]);
    const items = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
    return json({ assignments: items.filter(Boolean), hidden: hidden.map((b) => b.key) });
  }

  let data;
  try {
    data = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  if (data.password !== PASSWORD) return json({ error: "Wrong password." }, 401);

  if (req.method === "POST") {
    const title = String(data.title || "").trim().slice(0, 120);
    const description = String(data.description || "").trim().slice(0, 1000);
    const due = new Date(data.due);
    if (!title || !description || isNaN(due)) {
      return json({ error: "Title, description and a valid due date are required." }, 400);
    }

    const item = {
      id: crypto.randomUUID(),
      title,
      description,
      due: due.toISOString(),
      type: data.type === "group" ? "group" : "individual",
      createdAt: new Date().toISOString(),
    };
    await store.setJSON(item.id, item);
    return json(item, 201);
  }

  if (req.method === "DELETE") {
    const id = String(data.id || "").slice(0, 100);
    if (!id) return json({ error: "Missing assignment id." }, 400);

    if (await store.get(id)) await store.delete(id);
    else await hiddenStore.set(id, new Date().toISOString());
    return json({ ok: true });
  }

  return json({ error: "Method not allowed." }, 405);
};

export const config = { path: "/api/assignments" };
