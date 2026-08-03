import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/delete-fields.ts";

const body = (raw: string | null) => JSON.parse(raw!);

Deno.test("delete-fields: DELETEs /fields with the id list in the body", async () => {
  // There is no DELETE /fields/{id}; deletion is always a batch.
  const { ctx, calls } = mockQbCtx([{ body: { deletedFieldIds: [6, 7], errors: [] } }]);
  const out = await action.execute({ tableId: "bck1", fieldIds: [6, 7] }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/fields");
  assertEquals(new URL(calls[0].url).searchParams.get("tableId"), "bck1");
  assertEquals(body(calls[0].body), { fieldIds: [6, 7] });
  assertEquals(out.deletedFieldIds, [6, 7]);
});

Deno.test("delete-fields: a 200 carrying `errors` is a partial success and is logged", async () => {
  const { ctx, logs } = mockQbCtx([{
    body: { deletedFieldIds: [6], errors: ["Error found with fid: 7"] },
  }]);
  const out = await action.execute({ tableId: "bck1", fieldIds: "[6,7]" }, ctx);

  assertEquals(out.deletedFieldIds, [6]);
  assertEquals(out.errors!.length, 1);
  assertEquals(logs[0].level, "warn");
});

Deno.test("delete-fields: rejects an empty or non-array id list without calling", async () => {
  for (const fieldIds of [[], "[]", '"nope"']) {
    const { ctx, calls } = mockQbCtx([]);
    await assertRejects(
      () => Promise.resolve(action.execute({ tableId: "bck1", fieldIds }, ctx)),
      Error,
    );
    assertEquals(calls.length, 0);
  }
});

Deno.test("delete-fields: is named plural, matching the batch-only API", () => {
  assert(action.key.endsWith("fields"));
});
