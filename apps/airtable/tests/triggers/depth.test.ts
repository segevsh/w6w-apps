import { describe, it } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import updated, { versionId } from "../../triggers/new-or-updated-record.ts";
import newBase from "../../triggers/new-base.ts";

// Round 3. Every request is a literal; the list-bases and list-records shapes are the vendor's
// (https://airtable.com/developers/web/api/list-bases and /list-records, 2026-11-10).
const API = "https://api.airtable.com/v0";

describe("new-or-updated-record", () => {
  const params = { baseId: "appABC", table: "Orders", lastModifiedField: "Modified" };
  const rec = (id: string, modified: string) => ({
    id,
    createdTime: "2026-11-01T10:00:00.000Z",
    fields: { Name: id, Modified: modified },
  });
  const r1 = rec("rec1", "2026-11-10T09:00:00.000Z");
  const r1edited = rec("rec1", "2026-11-10T11:00:00.000Z");
  const r2 = rec("rec2", "2026-11-10T10:00:00.000Z");
  const state = { v: 1, kind: "ids", seeded: true, ids: ["rec1:2026-11-10T09:00:00.000Z"] };

  it("seeds without emitting", async () => {
    const { ctx } = mockCtx([{ body: { records: [r1] } }]);
    const r = await updated.poll!({ params, state: {} }, ctx);
    assertEquals(r.events, []);
    assertEquals(r.nextState.seeded, true);
  });
  it("emits a new record and an edited record, oldest first", async () => {
    const { ctx } = mockCtx([{ body: { records: [r1edited, r2, r1] } }]);
    const r = await updated.poll!({ params, state }, ctx);
    assertEquals(r.events, [r2, r1edited]);
  });
  it("an unchanged record is not re-emitted", async () => {
    const { ctx } = mockCtx([{ body: { records: [r1] } }]);
    assertEquals((await updated.poll!({ params, state }, ctx)).events, []);
  });
  it("is idempotent for the same state and response", async () => {
    const a = await updated.poll!(
      { params, state },
      mockCtx([{ body: { records: [r1edited, r1] } }]).ctx,
    );
    const b = await updated.poll!(
      { params, state },
      mockCtx([{ body: { records: [r1edited, r1] } }]).ctx,
    );
    assertEquals(a, b);
  });
  it("requests list records sorted by the last-modified field, descending (literal)", async () => {
    const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
    await updated.poll!({ params, state: {} }, ctx);
    assertEquals(
      [calls[0].method, calls[0].url],
      [
        "GET",
        `${API}/appABC/Orders?sort%5B0%5D%5Bfield%5D=Modified&sort%5B0%5D%5Bdirection%5D=desc&pageSize=100`,
      ],
    );
  });
  it("versionId pins id:stamp and refuses a record without an id", () => {
    assertEquals(versionId(r1, "Modified"), "rec1:2026-11-10T09:00:00.000Z");
    assertEquals(versionId({ id: "recX", fields: {} }, "Modified"), "recX:");
    assert(
      (() => {
        try {
          versionId({ fields: {} }, "Modified");
          return false;
        } catch {
          return true;
        }
      })(),
    );
  });
});

describe("new-base (snapshot)", () => {
  const base = (id: string) => ({ id, name: `Base ${id}`, permissionLevel: "create" });
  it("seeds without emitting", async () => {
    const { ctx } = mockCtx([{ body: { bases: [base("app1"), base("app2")] } }]);
    const r = await newBase.poll!({ params: {}, state: {} }, ctx);
    assertEquals(r.events, []);
    assertEquals(r.nextState.seeded, true);
  });
  it("emits the added base once, never a removed one", async () => {
    const seed = await newBase.poll!(
      { params: {}, state: {} },
      mockCtx([{ body: { bases: [base("app1"), base("app2")] } }]).ctx,
    );
    const next = await newBase.poll!(
      { params: {}, state: seed.nextState },
      mockCtx([{ body: { bases: [base("app1"), base("app3")] } }]).ctx,
    );
    assertEquals(next.events, [base("app3")]);
    const again = await newBase.poll!(
      { params: {}, state: next.nextState },
      mockCtx([{ body: { bases: [base("app1"), base("app3")] } }]).ctx,
    );
    assertEquals(again.events, []);
  });
  it("is idempotent for the same state and response", async () => {
    const seed = await newBase.poll!(
      { params: {}, state: {} },
      mockCtx([{ body: { bases: [base("app1")] } }]).ctx,
    );
    const run = () =>
      newBase.poll!(
        { params: {}, state: seed.nextState },
        mockCtx([{ body: { bases: [base("app1"), base("app2")] } }]).ctx,
      );
    assertEquals(await run(), await run());
  });
  it("follows the offset cursor (literal requests)", async () => {
    const { ctx, calls } = mockCtx([
      { body: { bases: [base("app1")], offset: "itr1/app1" } },
      { body: { bases: [base("app2")] } },
    ]);
    await newBase.poll!({ params: {}, state: {} }, ctx);
    assertEquals(calls.map((c) => [c.method, c.url]), [
      ["GET", `${API}/meta/bases`],
      ["GET", `${API}/meta/bases?offset=itr1%2Fapp1`],
    ]);
  });
  it("a base without an id fails loudly", async () => {
    await assertRejects(
      () => newBase.poll!({ params: {}, state: {} }, mockCtx([{ body: { bases: [{}] } }]).ctx),
      Error,
      "without id",
    );
  });
});

it("app wires the poll triggers: output + sample, poll, never onSubscribe", () => {
  assertEquals(app.triggers.map((t) => t.key), ["new-record", "new-or-updated-record", "new-base"]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0 && t.sample !== undefined, t.key);
    assertEquals(typeof t.poll, "function", t.key);
    assertEquals(t.onSubscribe, undefined, t.key);
  }
});
