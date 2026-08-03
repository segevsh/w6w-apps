import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import action, { locationAttributes } from "../../actions/add-rows.ts";

const ok = () => mockCtx([{ status: 200, body: { message: "SUCCESS", result: [] } }]);

Deno.test("add-rows: is a non-idempotent perform over the row resource", () => {
  assertEquals(action.key, "add-rows");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "row");
  // Each call mints new row ids and there is no idempotency key on this endpoint.
  assertEquals(action.idempotent, false);
});

Deno.test("add-rows: POSTs to /sheets/{id}/rows", async () => {
  const { ctx, calls } = ok();
  await action.execute({ sheetId: "4583173393803140", cells: { "1": "a" } }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/2.0/sheets/4583173393803140/rows");
});

Deno.test("add-rows: builds cells keyed by columnId from a column-id map", async () => {
  const { ctx, calls } = ok();
  await action.execute({
    sheetId: "1",
    cells: { "7960873114331012": "Revenue", "642523719853956": 42 },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), [{
    toBottom: true,
    cells: [
      { columnId: 7960873114331012, value: "Revenue" },
      { columnId: 642523719853956, value: 42 },
    ],
  }]);
});

Deno.test("add-rows: the wire body carries columnId and NEVER a column title", async () => {
  const { ctx, calls } = ok();
  await action.execute({ sheetId: "1", cells: { "7960873114331012": "x" } }, ctx);
  const wire = calls[0].body!;
  assert(wire.includes('"columnId"'));
  assert(!/columnTitle|"title"/.test(wire));
});

Deno.test("add-rows: a title-keyed cells map fails loudly instead of writing nowhere", () => {
  const { ctx } = ok();
  const err = assertThrows(
    () => action.execute({ sheetId: "1", cells: { Status: "Done" } }, ctx),
    Error,
  );
  assert(err.message.includes("not an integer id"));
});

Deno.test("add-rows: the array cell form carries a formula through", async () => {
  const { ctx, calls } = ok();
  await action.execute({
    sheetId: "1",
    cells: [{ columnId: 7960873114331012, formula: "=SUM(Cost:Cost)" }],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!)[0].cells, [
    { columnId: 7960873114331012, formula: "=SUM(Cost:Cost)" },
  ]);
});

Deno.test("add-rows: bulk rows each get their own cells and the shared location", async () => {
  const { ctx, calls } = ok();
  await action.execute({
    sheetId: "1",
    location: "toTop",
    rows: [
      { cells: { "1": "Task A" } },
      { cells: { "1": "Task B" } },
    ],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), [
    { toTop: true, cells: [{ columnId: 1, value: "Task A" }] },
    { toTop: true, cells: [{ columnId: 1, value: "Task B" }] },
  ]);
});

Deno.test("add-rows: a bulk entry may be the bare cell map itself", async () => {
  const { ctx, calls } = ok();
  await action.execute({ sheetId: "1", rows: [{ "1": "A" }] }, ctx);
  assertEquals(JSON.parse(calls[0].body!)[0].cells, [{ columnId: 1, value: "A" }]);
});

Deno.test("add-rows: rows takes precedence over cells", async () => {
  const { ctx, calls } = ok();
  await action.execute({
    sheetId: "1",
    cells: { "1": "ignored" },
    rows: [{ cells: { "2": "used" } }],
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.length, 1);
  assertEquals(body[0].cells, [{ columnId: 2, value: "used" }]);
});

Deno.test("add-rows: defaults to the bottom of the sheet", async () => {
  const { ctx, calls } = ok();
  await action.execute({ sheetId: "1", cells: { "1": "a" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!)[0].toBottom, true);
});

Deno.test("locationAttributes: emits only the legal attribute combinations", () => {
  assertEquals(locationAttributes("toBottom"), { toBottom: true });
  assertEquals(locationAttributes("toTop"), { toTop: true });
  assertEquals(locationAttributes("parentId", "88965082"), { parentId: 88965082 });
  assertEquals(locationAttributes("parentIdToBottom", "88965082"), {
    parentId: 88965082,
    toBottom: true,
  });
  assertEquals(locationAttributes("siblingId", "88965082"), { siblingId: 88965082 });
  assertEquals(locationAttributes("siblingIdAbove", "88965082"), {
    siblingId: 88965082,
    above: true,
  });
});

Deno.test("locationAttributes: never pairs parentId with siblingId, which the API forbids", () => {
  const cases = [
    "toBottom",
    "toTop",
    "parentId",
    "parentIdToBottom",
    "siblingId",
    "siblingIdAbove",
  ] as const;
  for (const c of cases) {
    const attrs = locationAttributes(c, "1") as Record<string, unknown>;
    assert(!(("parentId" in attrs) && ("siblingId" in attrs)), c);
    // `above` is only ever paired with siblingId, per the documented restriction.
    if ("above" in attrs) assert("siblingId" in attrs, c);
  }
});

Deno.test("locationAttributes: an anchored location without an anchor id is an error", () => {
  for (const c of ["parentId", "parentIdToBottom", "siblingId", "siblingIdAbove"] as const) {
    assertThrows(() => locationAttributes(c), Error, "Anchor row ID");
  }
});

Deno.test("add-rows: exposes exactly the six legal location choices", () => {
  assertEquals(optionValues(action, "location"), [
    "toBottom",
    "toTop",
    "parentId",
    "parentIdToBottom",
    "siblingId",
    "siblingIdAbove",
  ]);
  // indent/outdent are Update Rows' business — they only apply to existing rows.
  assertEquals((action.params ?? []).some((p) => p.key === "indent"), false);
});

Deno.test("add-rows: sends the bulk flags only when asked for", async () => {
  const { ctx, calls } = ok();
  await action.execute({ sheetId: "1", cells: { "1": "a" } }, ctx);
  assertEquals(new URL(calls[0].url).search, "");

  const second = ok();
  await action.execute(
    { sheetId: "1", cells: { "1": "a" }, allowPartialSuccess: true, overrideValidation: true },
    second.ctx,
  );
  const q = new URL(second.calls[0].url).searchParams;
  assertEquals(q.get("allowPartialSuccess"), "true");
  assertEquals(q.get("overrideValidation"), "true");
});

Deno.test("add-rows: states the 500-row ceiling where a bulk load would hit it", () => {
  assert(/500/.test(action.description!));
  assert(/500/.test(param(action, "rows").hint ?? ""));
});
