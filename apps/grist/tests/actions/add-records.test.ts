import { assert, assertEquals } from "@std/assert";
import { actionCtx } from "../_helpers.ts";
import action, { normalize } from "../../actions/add-records.ts";

Deno.test("add-records: POSTs a {records:[{fields}]} envelope", async () => {
  const { ctx, calls } = actionCtx([{ body: { records: [{ id: 1 }] } }]);
  await action.execute!(
    { docId: "d", tableId: "People", records: [{ fields: { pet: "cat" } }] },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/docs/d/tables/People/records");
  assertEquals(JSON.parse(calls[0].body!), { records: [{ fields: { pet: "cat" } }] });
});

Deno.test("add-records: wraps bare field maps that forgot the fields envelope", async () => {
  const { ctx, calls } = actionCtx([{ body: { records: [] } }]);
  await action.execute!(
    { docId: "d", tableId: "T", records: [{ pet: "cat" }, { pet: "dog" }] },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    records: [{ fields: { pet: "cat" } }, { fields: { pet: "dog" } }],
  });
});

Deno.test("add-records: normalize leaves an already-wrapped record alone", () => {
  assertEquals(normalize([{ fields: { a: 1 } }]), [{ fields: { a: 1 } }]);
  assertEquals(normalize([{ a: 1 }]), [{ fields: { a: 1 } }]);
  // Mixed input in one batch, which is exactly what a hand-edited JSON param produces.
  assertEquals(normalize([{ fields: { a: 1 } }, { b: 2 }]), [
    { fields: { a: 1 } },
    { fields: { b: 2 } },
  ]);
});

Deno.test("add-records: omits noparse unless asked, and sends it when set", async () => {
  const { ctx, calls } = actionCtx([{ body: { records: [] } }, { body: { records: [] } }]);
  await action.execute!({ docId: "d", tableId: "T", records: [] }, ctx);
  assert(!new URL(calls[0].url).searchParams.has("noparse"));

  await action.execute!({ docId: "d", tableId: "T", records: [], noparse: true }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("noparse"), "true");
});

Deno.test("add-records: returns the ids Grist assigned", async () => {
  const { ctx } = actionCtx([{ body: { records: [{ id: 7 }, { id: 8 }] } }]);
  const out = await action.execute!({ docId: "d", tableId: "T", records: [{}] }, ctx);
  assertEquals(out.records.map((r) => r.id), [7, 8]);
});

Deno.test("add-records: is declared non-idempotent — a retry appends duplicates", () => {
  assertEquals(action.idempotent, false);
});
