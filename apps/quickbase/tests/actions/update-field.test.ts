import { assert, assertEquals } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/update-field.ts";

const body = (raw: string | null) => JSON.parse(raw!);

Deno.test("update-field: POSTs to the field path with tableId in the query", async () => {
  const { ctx, calls } = mockQbCtx([{ body: { id: 9 } }]);
  await action.execute({ tableId: "bck1", fieldId: 9, label: "Work Email" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/fields/9");
  assertEquals(new URL(calls[0].url).searchParams.get("tableId"), "bck1");
  assertEquals(body(calls[0].body), { label: "Work Email" });
});

Deno.test("update-field: exposes no fieldType param — the API has no such property", () => {
  // Changing a field's type is a conversion Quickbase handles in its own UI;
  // offering it here would create a param the API ignores.
  assert(!action.params!.some((p) => p.key === "fieldType"));
});
