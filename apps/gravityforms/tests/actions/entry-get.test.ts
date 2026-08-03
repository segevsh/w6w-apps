import { assert, assertEquals, assertRejects } from "@std/assert";
import { BASE_PATH, DISPLAY, mockCtx, paramsOf } from "../_helpers.ts";
import action from "../../actions/entry-get.ts";

Deno.test("entry-get: GETs /entries/{id} with no extras by default", async () => {
  const entry = { id: "159", form_id: "30", "1.3": "Neil" };
  const { ctx, calls } = mockCtx([{ body: entry }], { display: DISPLAY });
  const out = await action.execute!({ entryId: 159 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/entries/159`);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out, entry);
});

Deno.test("entry-get: forwards _field_ids and _labels", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ entryId: 159, fieldIds: "1.3,1.6", labels: true }, ctx);
  const params = paramsOf(calls);
  assertEquals(params.get("_field_ids"), "1.3,1.6");
  assertEquals(params.get("_labels"), "1");
});

Deno.test("entry-get: omits _labels when not requested", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ entryId: 159, labels: false }, ctx);
  assertEquals(paramsOf(calls).has("_labels"), false);
});

Deno.test("entry-get: surfaces gf_entry_invalid_id", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { code: "gf_entry_invalid_id", message: "Entry not found" },
  }], { display: DISPLAY });
  await assertRejects(
    async () => await action.execute!({ entryId: 1 }, ctx),
    Error,
    "gf_entry_invalid_id",
  );
});

Deno.test("entry-get: is a read action against the entry resource", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "entry");
  assert(action.output);
});
