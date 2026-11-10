import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { API, mockConnectedCtx, NET, queryOf } from "../_helpers.ts";
import newSpace from "../../triggers/new-space.ts";
import newPlan from "../../triggers/new-plan.ts";
import newTag from "../../triggers/new-tag.ts";
import newCoursework from "../../triggers/new-coursework.ts";

const input = (params: Record<string, unknown> = {}, state: unknown = {}) => ({
  params,
  state,
  subscriptionId: "sub-1",
});
const rec = (id: number) => ({ id, name: `record ${id}` });
const page = (from: number, n: number) => Array.from({ length: n }, (_, i) => rec(from + i));
const keys = (r: { events: unknown[] }) => r.events.map((e) => (e as { key: string }).key);
const pathOf = (url: string) => new URL(url).pathname;

const TABLE = [
  { name: "new-space", t: newSpace, params: {}, path: `/networks/${NET}/spaces` },
  { name: "new-plan", t: newPlan, params: {}, path: `/networks/${NET}/plans` },
  { name: "new-tag", t: newTag, params: {}, path: `/networks/${NET}/tags` },
  {
    name: "new-coursework",
    t: newCoursework,
    params: { spaceId: 111 },
    path: `/networks/${NET}/spaces/111/courseworks`,
  },
];

for (const { name, t, params, path } of TABLE) {
  const base = new URL(API).pathname.replace(/\/$/, "");

  test(`${name}: first check seeds without events; request is GET ${path}?page=1&per_page=100`, async () => {
    const c = mockConnectedCtx([{ body: { items: [rec(1), rec(2)] } }]);
    const r = await t.poll!(input(params), c.ctx);
    assertEquals(r.events, []);
    assertEquals((r.nextState as { seeded: boolean }).seeded, true);
    assertEquals(c.calls.length, 1);
    assertEquals(c.calls[0].method, "GET");
    assertEquals(pathOf(c.calls[0].url), `${base}${path}`);
    assertEquals(queryOf(c.calls[0]), { page: "1", per_page: "100" });
  });

  test(`${name}: a record added after the seed is emitted once; a retry is identical; later checks are quiet`, async () => {
    const seeded = await t.poll!(
      input(params),
      mockConnectedCtx([{ body: { items: [rec(1)] } }]).ctx,
    );
    const run = () =>
      t.poll!(
        input(params, seeded.nextState),
        mockConnectedCtx([{ body: { items: [rec(1), rec(2)] } }]).ctx,
      );
    const first = await run();
    assertEquals(keys(first), ["2"]);
    assertEquals((first.events[0] as { change: string }).change, "added");
    assertEquals((first.events[0] as { values: { name: string } }).values.name, "record 2");
    assertEquals(await run(), first);
    const again = await t.poll!(
      input(params, first.nextState),
      mockConnectedCtx([{ body: { items: [rec(1), rec(2)] } }]).ctx,
    );
    assertEquals(again.events, []);
  });

  test(`${name}: reads every page (a full page of 100 then a short one) and a {data} envelope`, async () => {
    const seeded = await t.poll!(
      input(params),
      mockConnectedCtx([{ body: { items: page(1, 100) } }, { body: { data: page(101, 1) } }]).ctx,
    );
    const c = mockConnectedCtx([
      { body: { items: page(1, 100) } },
      { body: { data: [...page(101, 1), rec(500)] } },
    ]);
    const r = await t.poll!(input(params, seeded.nextState), c.ctx);
    assertEquals(keys(r), ["500"]);
    assertEquals(c.calls.map((x) => queryOf(x)), [
      { page: "1", per_page: "100" },
      { page: "2", per_page: "100" },
    ]);
  });

  test(`${name}: an unliftable list response throws instead of reading as empty`, async () => {
    const seeded = await t.poll!(
      input(params),
      mockConnectedCtx([{ body: { items: [rec(1)] } }]).ctx,
    );
    let err: unknown;
    try {
      await t.poll!(
        input(params, seeded.nextState),
        mockConnectedCtx([{ body: { weird: true } }]).ctx,
      );
    } catch (e) {
      err = e;
    }
    assert(err instanceof Error && err.message.includes("unexpected shape"));
  });

  test(`${name}: a collection filling all 20 pages is refused, not cut`, async () => {
    const full = Array.from(
      { length: 20 },
      (_, i) => ({ body: { items: page(i * 100 + 1, 100) } }),
    );
    let err: unknown;
    try {
      await t.poll!(input(params), mockConnectedCtx(full).ctx);
    } catch (e) {
      err = e;
    }
    assert(err instanceof Error && err.message.includes("2000 or more"));
  });

  test(`${name}: an existing record that is renamed is not a new one`, async () => {
    const seeded = await t.poll!(
      input(params),
      mockConnectedCtx([{ body: { items: [rec(1)] } }]).ctx,
    );
    const r = await t.poll!(
      input(params, seeded.nextState),
      mockConnectedCtx([{ body: { items: [{ id: 1, name: "renamed" }] } }]).ctx,
    );
    assertEquals(r.events, []);
  });
}

test("new-coursework: no course chosen → refused before any request", async () => {
  const c = mockConnectedCtx([]);
  let err: unknown;
  try {
    await newCoursework.poll!(input({}), c.ctx);
  } catch (e) {
    err = e;
  }
  assert(err instanceof Error && err.message.includes("Choose the course"));
  assertEquals(c.calls.length, 0);
});

test("new-coursework: declares the course as a required number param; the others take none", () => {
  assertEquals(
    (newCoursework.params ?? []).map((p) => [p.key, p.type, p.required]),
    [["spaceId", "number", true]],
  );
  for (const t of [newSpace, newPlan, newTag]) assertEquals(t.params ?? [], []);
});
