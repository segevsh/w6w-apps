import { describe, it } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newForm from "../../triggers/new-form.ts";
import newOrUpdatedForm from "../../triggers/new-or-updated-form.ts";
import newWorkspace from "../../triggers/new-workspace.ts";
import newTheme from "../../triggers/new-theme.ts";
import newImage from "../../triggers/new-image.ts";

// Round 3: the list-backed poll triggers. Every request below is a literal, copied from the
// vendor's documentation (https://www.typeform.com/developers/create/reference/, 2026-11-10).
const API = "https://api.typeform.com";
const form = (id: string, updated = "2026-11-10T09:00:00+00:00") => ({
  id,
  title: `Form ${id}`,
  created_at: "2026-11-01T12:00:00+00:00",
  last_updated_at: updated,
});
const page = (items: unknown[], pages = 1) => ({
  body: { total_items: items.length, page_count: pages, items },
});

describe("new-form", () => {
  const t = newForm;
  const state = { v: 1, kind: "ids", seeded: true, ids: ["f1"] };
  it("seeds without emitting", async () => {
    const { ctx } = mockCtx([page([form("f1"), form("f0")])]);
    const r = await t.poll!({ params: {}, state: {} }, ctx);
    assertEquals(r.events, []);
    assertEquals(r.nextState.seeded, true);
  });
  it("emits only the new form, once", async () => {
    const { ctx } = mockCtx([page([form("f2"), form("f1")])]);
    assertEquals((await t.poll!({ params: {}, state }, ctx)).events, [form("f2")]);
  });
  it("is idempotent for the same state and response", async () => {
    const a = await t.poll!({ params: {}, state }, mockCtx([page([form("f2"), form("f1")])]).ctx);
    const b = await t.poll!({ params: {}, state }, mockCtx([page([form("f2"), form("f1")])]).ctx);
    assertEquals(a, b);
  });
  it("requests GET /forms newest-created first (literal), with and without a workspace", async () => {
    const one = mockCtx([page([])]);
    await t.poll!({ params: {}, state: {} }, one.ctx);
    assertEquals(
      [one.calls[0].method, one.calls[0].url],
      ["GET", `${API}/forms?page_size=50&sort_by=created_at&order_by=desc`],
    );
    const two = mockCtx([page([])]);
    await t.poll!({ params: { workspaceId: "ws1" }, state: {} }, two.ctx);
    assertEquals(
      two.calls[0].url,
      `${API}/forms?workspace_id=ws1&page_size=50&sort_by=created_at&order_by=desc`,
    );
  });
});

describe("new-or-updated-form", () => {
  const t = newOrUpdatedForm;
  const v1 = form("f1", "2026-11-10T09:00:00+00:00");
  const edited = form("f1", "2026-11-10T11:00:00+00:00");
  const state = { v: 1, kind: "ids", seeded: true, ids: ["f1:2026-11-10T09:00:00+00:00"] };
  it("seeds without emitting", async () => {
    const r = await t.poll!({ params: {}, state: {} }, mockCtx([page([v1])]).ctx);
    assertEquals(r.events, []);
    assertEquals(r.nextState.seeded, true);
  });
  it("emits an edited form as a new event (id:last_updated_at) and a new form", async () => {
    const f2 = form("f2", "2026-11-10T12:00:00+00:00");
    const r = await t.poll!({ params: {}, state }, mockCtx([page([f2, edited, v1])]).ctx);
    assertEquals(r.events, [edited, f2]);
  });
  it("an unchanged form is not re-emitted; same input twice → same output", async () => {
    const a = await t.poll!({ params: {}, state }, mockCtx([page([v1])]).ctx);
    assertEquals(a.events, []);
    const b = await t.poll!({ params: {}, state }, mockCtx([page([edited, v1])]).ctx);
    const c = await t.poll!({ params: {}, state }, mockCtx([page([edited, v1])]).ctx);
    assertEquals(b, c);
  });
  it("requests GET /forms most-recently-updated first (literal)", async () => {
    const { ctx, calls } = mockCtx([page([])]);
    await t.poll!({ params: {}, state: {} }, ctx);
    assertEquals(
      [calls[0].method, calls[0].url],
      ["GET", `${API}/forms?page_size=50&sort_by=last_updated_at&order_by=desc`],
    );
  });
});

describe("new-theme", () => {
  const t = newTheme;
  const theme = (id: string) => ({ id, name: `Theme ${id}`, font: "Roboto" });
  const state = { v: 1, kind: "ids", seeded: true, ids: ["t1"] };
  it("seeds without emitting", async () => {
    const r = await t.poll!({ params: {}, state: {} }, mockCtx([page([theme("t1")])]).ctx);
    assertEquals(r.events, []);
    assertEquals(r.nextState.seeded, true);
  });
  it("emits only the new theme", async () => {
    const r = await t.poll!({ params: {}, state }, mockCtx([page([theme("t2"), theme("t1")])]).ctx);
    assertEquals(r.events, [theme("t2")]);
  });
  it("is idempotent", async () => {
    const a = await t.poll!({ params: {}, state }, mockCtx([page([theme("t2"), theme("t1")])]).ctx);
    const b = await t.poll!({ params: {}, state }, mockCtx([page([theme("t2"), theme("t1")])]).ctx);
    assertEquals(a, b);
  });
  it("requests GET /themes (documented newest-added first) page_size=50 (literal)", async () => {
    const { ctx, calls } = mockCtx([page([])]);
    await t.poll!({ params: {}, state: {} }, ctx);
    assertEquals([calls[0].method, calls[0].url], ["GET", `${API}/themes?page_size=50`]);
  });
});

describe("new-image", () => {
  const t = newImage;
  const img = (id: string) => ({ id, file_name: `${id}.png`, src: `https://example.test/${id}` });
  const state = { v: 1, kind: "ids", seeded: true, ids: ["i1"] };
  it("seeds without emitting", async () => {
    const r = await t.poll!({ params: {}, state: {} }, mockCtx([{ body: [img("i1")] }]).ctx);
    assertEquals(r.events, []);
    assertEquals(r.nextState.seeded, true);
  });
  it("emits only the new image (the endpoint returns a bare array)", async () => {
    const r = await t.poll!({ params: {}, state }, mockCtx([{ body: [img("i2"), img("i1")] }]).ctx);
    assertEquals(r.events, [img("i2")]);
  });
  it("is idempotent", async () => {
    const a = await t.poll!({ params: {}, state }, mockCtx([{ body: [img("i2"), img("i1")] }]).ctx);
    const b = await t.poll!({ params: {}, state }, mockCtx([{ body: [img("i2"), img("i1")] }]).ctx);
    assertEquals(a, b);
  });
  it("requests GET /images (literal)", async () => {
    const { ctx, calls } = mockCtx([{ body: [] }]);
    await t.poll!({ params: {}, state: {} }, ctx);
    assertEquals([calls[0].method, calls[0].url], ["GET", `${API}/images`]);
  });
});

describe("new-workspace (snapshot)", () => {
  const t = newWorkspace;
  const ws = (id: string) => ({ id, name: `Space ${id}`, account_id: "A1", shared: false });
  it("seeds without emitting", async () => {
    const r = await t.poll!({ params: {}, state: {} }, mockCtx([page([ws("w1"), ws("w2")])]).ctx);
    assertEquals(r.events, []);
    assertEquals(r.nextState.seeded, true);
  });
  it("emits the added workspace once, never a removed one", async () => {
    const seed = await t.poll!(
      { params: {}, state: {} },
      mockCtx([page([ws("w1"), ws("w2")])]).ctx,
    );
    const next = await t.poll!(
      { params: {}, state: seed.nextState },
      mockCtx([page([ws("w1"), ws("w3")])]).ctx,
    );
    assertEquals(next.events, [ws("w3")]);
    const again = await t.poll!(
      { params: {}, state: next.nextState },
      mockCtx([page([ws("w1"), ws("w3")])]).ctx,
    );
    assertEquals(again.events, []);
  });
  it("is idempotent for the same state and response", async () => {
    const seed = await t.poll!({ params: {}, state: {} }, mockCtx([page([ws("w1")])]).ctx);
    const a = await t.poll!(
      { params: {}, state: seed.nextState },
      mockCtx([page([ws("w1"), ws("w2")])]).ctx,
    );
    const b = await t.poll!(
      { params: {}, state: seed.nextState },
      mockCtx([page([ws("w1"), ws("w2")])]).ctx,
    );
    assertEquals(a, b);
  });
  it("reads every page, 200 per page (literal requests)", async () => {
    const { ctx, calls } = mockCtx([page([ws("w1")], 2), page([ws("w2")], 2)]);
    const r = await t.poll!({ params: {}, state: {} }, ctx);
    assertEquals(calls.map((c) => [c.method, c.url]), [
      ["GET", `${API}/workspaces?page=1&page_size=200`],
      ["GET", `${API}/workspaces?page=2&page_size=200`],
    ]);
    const next = await t.poll!(
      { params: {}, state: r.nextState },
      mockCtx([page([ws("w1"), ws("w2"), ws("w9")], 1)]).ctx,
    );
    assertEquals(next.events, [ws("w9")]);
  });
  it("a workspace without an id fails loudly", async () => {
    await assertRejects(
      () => t.poll!({ params: {}, state: {} }, mockCtx([page([{ name: "x" }])]).ctx),
      Error,
      "without an id",
    );
  });
});

it("every new poll trigger declares output + sample and a poll, never onSubscribe", () => {
  for (const t of [newForm, newOrUpdatedForm, newWorkspace, newTheme, newImage]) {
    assert(t.output!.length > 0 && t.sample !== undefined, t.key);
    assertEquals(typeof t.poll, "function", t.key);
    assertEquals(t.onSubscribe, undefined, t.key);
  }
});
