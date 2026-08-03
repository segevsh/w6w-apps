import { assert, assertEquals } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/list-fields.ts";

Deno.test("list-fields: GETs /fields with tableId as a query param", async () => {
  const { ctx, calls } = mockQbCtx([{ body: [] }]);
  await action.execute({ tableId: "bck1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/fields");
  assertEquals(url.searchParams.get("tableId"), "bck1");
});

Deno.test("list-fields: omits includeFieldPerms unless asked, then sends it", async () => {
  const off = mockQbCtx([{ body: [] }]);
  await action.execute({ tableId: "bck1" }, off.ctx);
  assert(!new URL(off.calls[0].url).searchParams.has("includeFieldPerms"));

  const on = mockQbCtx([{ body: [] }]);
  await action.execute({ tableId: "bck1", includeFieldPerms: true }, on.ctx);
  assertEquals(new URL(on.calls[0].url).searchParams.get("includeFieldPerms"), "true");
});

Deno.test("list-fields: returns the id/label/type map record actions need", async () => {
  const { ctx } = mockQbCtx([{
    body: [
      { id: 3, label: "Record ID#", fieldType: "recordid", mode: "" },
      { id: 9, label: "Email Address", fieldType: "email", mode: "" },
      { id: 12, label: "Total", fieldType: "currency", mode: "virtual" },
    ],
  }]);
  const out = await action.execute({ tableId: "bck1" }, ctx);

  assertEquals(out.length, 3);
  assertEquals(out[1].id, 9);
  // `mode: virtual` marks a derived field that upsert cannot write.
  assertEquals(out[2].mode, "virtual");
});
