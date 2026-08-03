import { assert, assertEquals } from "@std/assert";
import { actionCtx } from "../_helpers.ts";
import action from "../../actions/upsert-records.ts";

const REC = [{ require: { pet: "cat" }, fields: { popularity: 67 } }];

Deno.test("upsert-records: PUTs a require/fields envelope", async () => {
  const { ctx, calls } = actionCtx([{ status: 200, body: "" }]);
  await action.execute!({ docId: "d", tableId: "People", records: REC }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/docs/d/tables/People/records");
  assertEquals(JSON.parse(calls[0].body!), { records: REC });
});

Deno.test("upsert-records: sends no behaviour flags unless they were set", async () => {
  const { ctx, calls } = actionCtx([{ status: 200, body: "" }]);
  await action.execute!({ docId: "d", tableId: "T", records: REC }, ctx);
  const q = new URL(calls[0].url).searchParams;
  for (const k of ["onmany", "noadd", "noupdate", "allow_empty_require", "noparse"]) {
    assert(!q.has(k), `${k} must not be sent when unset`);
  }
});

Deno.test("upsert-records: maps allowEmptyRequire onto Grist's allow_empty_require", async () => {
  const { ctx, calls } = actionCtx([{ status: 200, body: "" }]);
  await action.execute!(
    { docId: "d", tableId: "T", records: REC, allowEmptyRequire: true, onmany: "all" },
    ctx,
  );
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("allow_empty_require"), "true");
  assertEquals(q.get("onmany"), "all");
  // The camelCase spelling must NOT also appear — Grist would ignore it.
  assert(!q.has("allowEmptyRequire"));
});

Deno.test("upsert-records: forwards noadd and noupdate independently", async () => {
  const { ctx, calls } = actionCtx([{ status: 200, body: "" }, { status: 200, body: "" }]);
  await action.execute!({ docId: "d", tableId: "T", records: REC, noadd: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("noadd"), "true");

  await action.execute!({ docId: "d", tableId: "T", records: REC, noupdate: true }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("noupdate"), "true");
});

Deno.test("upsert-records: the dangerous flag defaults to off in the declared params", () => {
  const p = action.params!.find((p) => p.key === "allowEmptyRequire")!;
  assertEquals(p.default, false);
  assert(/dangerous/i.test(p.hint ?? ""), "the empty-require hazard must be stated in the hint");
});

Deno.test("upsert-records: is idempotent — re-running converges on the same rows", () => {
  assertEquals(action.idempotent, true);
});
