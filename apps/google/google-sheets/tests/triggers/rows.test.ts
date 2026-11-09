import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import rowAdded from "../../triggers/row-added.ts";
import rowUpdated from "../../triggers/row-updated.ts";
import rowAddedOrUpdated from "../../triggers/row-added-or-updated.ts";

const TRIGGERS = [rowAdded, rowUpdated, rowAddedOrUpdated];
const PARAMS = { spreadsheetId: "ss-1", sheetName: "Leads" };

const HEAD = ["id", "name", "email"];
const BASE = [HEAD, [1, "Ada", "ada@x.test"], [2, "Bob", "bob@x.test"]];
// BASE plus a new row 4, with row 2 changed.
const NEXT = [HEAD, [1, "Ada", "ada@x.test"], [2, "Bob", "bobby@x.test"], [3, "Cy", "cy@x.test"]];

type Poll = NonNullable<typeof rowAdded.poll>;
function run(
  t: (typeof TRIGGERS)[number],
  state: unknown,
  grid: unknown[][],
  params: Record<string, unknown> = PARAMS,
) {
  const { ctx, calls } = mockCtx([{ body: { range: "Leads!A1:C4", values: grid } }]);
  const poll = t.poll as Poll;
  return poll({ params, state, subscriptionId: "sub_1" } as never, ctx).then((r) => ({
    ...(r as { events: Array<Record<string, unknown>>; nextState: unknown }),
    calls,
  }));
}

for (const t of TRIGGERS) {
  test(`${t.key}: declares poll, output, sample and the 60s floor`, () => {
    assertEquals(typeof t.poll, "function");
    assertEquals("onSubscribe" in t, false);
    assertEquals(t.minIntervalMs, 60_000);
    assert(Array.isArray(t.output) && t.output.length > 0);
    assert(t.sample !== undefined);
    assertEquals(
      (t.params ?? []).map((p) => [p.key, !!p.required]),
      [["spreadsheetId", true], ["sheetName", true], ["keyColumn", false]],
    );
  });

  test(`${t.key}: unseeded state seeds without events`, async () => {
    const r = await run(t, {}, BASE);
    assertEquals(r.events, []);
    assertEquals((r.nextState as { seeded: boolean }).seeded, true);
  });

  test(`${t.key}: the same (state, response) twice is deep-equal`, async () => {
    const seed = (await run(t, {}, BASE)).nextState;
    const a = await run(t, seed, NEXT);
    const b = await run(t, seed, NEXT);
    assertEquals(a.events, b.events);
    assertEquals(a.nextState, b.nextState);
  });

  test(`${t.key}: reads the sheet-read request`, async () => {
    const r = await run(t, {}, BASE);
    assertEquals(r.calls.length, 1);
    assertEquals(r.calls[0].method, "GET");
    const url = new URL(r.calls[0].url);
    assertEquals(url.origin, "https://sheets.googleapis.com");
    assertEquals(url.pathname, "/v4/spreadsheets/ss-1/values/Leads");
    assertEquals(
      Object.fromEntries(url.searchParams),
      { valueRenderOption: "UNFORMATTED_VALUE", majorDimension: "ROWS" },
    );
  });

  test(`${t.key}: the sheet name is percent-encoded into the path`, async () => {
    const r = await run(t, {}, BASE, { ...PARAMS, sheetName: "Q1 Leads" });
    assertEquals(new URL(r.calls[0].url).pathname, "/v4/spreadsheets/ss-1/values/Q1%20Leads");
  });
}

test("one fixture pair: added / updated / both, then nothing", async () => {
  const seed = (await run(rowAdded, {}, BASE)).nextState;
  const added = await run(rowAdded, seed, NEXT);
  assertEquals(added.events, [{
    change: "added",
    rowNumber: 4,
    values: { id: 3, name: "Cy", email: "cy@x.test" },
  }]);
  const updated = await run(rowUpdated, seed, NEXT);
  assertEquals(updated.events, [{
    change: "updated",
    rowNumber: 3,
    values: { id: 2, name: "Bob", email: "bobby@x.test" },
  }]);
  const both = await run(rowAddedOrUpdated, seed, NEXT);
  assertEquals(both.events.map((e) => [e.change, e.rowNumber]), [["updated", 3], ["added", 4]]);
  for (const t of TRIGGERS) {
    const again = await run(t, both.nextState, NEXT);
    assertEquals(again.events, []);
  }
});

test("keyColumn: moving a row is not an update; an edit is, and carries the key", async () => {
  const p = { ...PARAMS, keyColumn: "id" };
  const seed = (await run(rowAddedOrUpdated, {}, BASE, p)).nextState;
  const moved = [HEAD, [2, "Bob", "bob@x.test"], [1, "Ada", "ada@x.test"]];
  for (const t of TRIGGERS) assertEquals((await run(t, seed, moved, p)).events, []);
  const r = await run(rowAddedOrUpdated, seed, NEXT, p);
  assertEquals(r.events, [
    { change: "updated", key: "2", values: { id: 2, name: "Bob", email: "bobby@x.test" } },
    { change: "added", key: "3", values: { id: 3, name: "Cy", email: "cy@x.test" } },
  ]);
});

test("without keyColumn an inserted row reads as updates below it (documented)", async () => {
  const seed = (await run(rowUpdated, {}, BASE)).nextState;
  const inserted = [HEAD, [9, "New", "n@x.test"], [1, "Ada", "ada@x.test"], [
    2,
    "Bob",
    "bob@x.test",
  ]];
  const r = await run(rowUpdated, seed, inserted);
  assertEquals(r.events.map((e) => e.rowNumber), [2, 3]);
});

test("a header edit, blank rows and a new empty column are not changes", async () => {
  const seed = (await run(rowAddedOrUpdated, {}, BASE)).nextState;
  const next = [
    ["id", "full name", "email", "extra"],
    [1, "Ada", "ada@x.test"],
    [2, "Bob", "bob@x.test", ""],
    [],
    ["", ""],
  ];
  assertEquals((await run(rowAddedOrUpdated, seed, next)).events, []);
});

test("5001 data rows throws naming the cap and returns no state", async () => {
  const grid = [["id"], ...Array.from({ length: 5001 }, (_, i) => [i + 1])];
  for (const t of TRIGGERS) {
    await assertRejects(() => run(t, {}, grid), Error, "5000");
  }
  const ok = [["id"], ...Array.from({ length: 5000 }, (_, i) => [i + 1])];
  assertEquals((await run(rowAdded, {}, ok)).events, []);
});

test("duplicate key values throw an error naming the column and rows", async () => {
  const dup = [HEAD, [1, "Ada", "a"], [1, "Ada again", "b"]];
  const p = { ...PARAMS, keyColumn: "id" };
  for (const t of TRIGGERS) {
    await assertRejects(() => run(t, {}, dup, p), Error, '"id" has the value "1" in rows 2 and 3');
  }
  // Without a key column the same sheet is fine.
  assertEquals((await run(rowAdded, {}, dup)).events, []);
});

test("an unknown keyColumn throws a clear error", async () => {
  await assertRejects(
    () => run(rowAdded, {}, BASE, { ...PARAMS, keyColumn: "nope" }),
    Error,
    'Key column "nope" is not a header',
  );
});

test("rows with a blank key are skipped; an empty sheet is fine", async () => {
  const p = { ...PARAMS, keyColumn: "id" };
  const r = await run(rowAdded, {}, [HEAD, ["", "x", "y"], [5, "z", "w"]], p);
  assertEquals((r.nextState as { hashes: Record<string, string> }).hashes["5"] !== undefined, true);
  assertEquals(Object.keys((r.nextState as { hashes: object }).hashes), ["5"]);
  assertEquals((await run(rowAdded, {}, [])).events, []);
});
