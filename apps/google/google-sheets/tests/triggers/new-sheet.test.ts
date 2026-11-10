import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newSheet from "../../triggers/new-sheet.ts";

const params = { spreadsheetId: "ss-1" };
const tab = (sheetId: number, title: string) => ({
  properties: { sheetId, title, index: sheetId, sheetType: "GRID" },
});
const props = (t: ReturnType<typeof tab>) => t.properties;
const A = tab(0, "Sheet1");
const B = tab(1234, "Data");
const run = (state: unknown, tabs: unknown[]) => {
  const { ctx, calls } = mockCtx([{ body: { sheets: tabs } }]);
  return newSheet.poll!({ params, state, subscriptionId: "sub_1" }, ctx).then((r) => ({
    ...(r as { events: unknown[]; nextState: unknown }),
    calls,
  }));
};

test("new-sheet: declares poll, output and sample, and a required spreadsheetId", () => {
  assertEquals(typeof newSheet.poll, "function");
  assertEquals("onSubscribe" in newSheet, false);
  assert((newSheet.output ?? []).length > 0 && newSheet.sample !== undefined);
  assertEquals((newSheet.params ?? []).map((p) => [p.key, !!p.required]), [[
    "spreadsheetId",
    true,
  ]]);
});

test("new-sheet: unseeded state seeds without events", async () => {
  const r = await run({}, [A]);
  assertEquals(r.events, []);
  assertEquals((r.nextState as { seeded?: boolean }).seeded, true);
});

test("new-sheet: emits exactly the tab added since the seed", async () => {
  const seeded = (await run({}, [A])).nextState;
  const r = await run(seeded, [A, B]);
  assertEquals(r.events, [props(B)]);
});

test("new-sheet: a renamed tab keeps its sheetId and is not new", async () => {
  const seeded = (await run({}, [A, B])).nextState;
  const r = await run(seeded, [tab(0, "Renamed"), B]);
  assertEquals(r.events, []);
});

test("new-sheet: the same (state, response) twice is deep-equal", async () => {
  const seeded = (await run({}, [A])).nextState;
  const a = await run(seeded, [A, B]);
  const b = await run(seeded, [A, B]);
  assertEquals(a.events, b.events);
  assertEquals(a.nextState, b.nextState);
});

test("new-sheet: requests the spreadsheet with the sheets.properties field mask", async () => {
  const r = await run({}, [A]);
  assertEquals(r.calls.length, 1);
  const url = new URL(r.calls[0].url);
  assertEquals(
    {
      method: r.calls[0].method,
      origin: url.origin,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
    },
    {
      method: "GET",
      origin: "https://sheets.googleapis.com",
      path: "/v4/spreadsheets/ss-1",
      query: { fields: "sheets.properties" },
    },
  );
});
