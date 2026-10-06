import { assertEquals, assertRejects } from "@std/assert";
import { mockPardotCtx } from "../_helpers.ts";
import action from "../../actions/prospect-remove-tag.ts";

Deno.test("prospect-remove-tag: POSTs {tagId} to /prospects/<id>/do/removeTag", async () => {
  const { ctx, calls } = mockPardotCtx([{ status: 204, body: undefined }]);
  const out = await action.execute({ prospectId: 1000, tagId: 100 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v5/objects/prospects/1000/do/removeTag");
  assertEquals(JSON.parse(calls[0].body!), { tagId: 100 });
  assertEquals(out, { removed: true });
});

Deno.test("prospect-remove-tag: refuses a non-integer tag id before any request", async () => {
  const { ctx, calls } = mockPardotCtx([]);
  await assertRejects(
    async () => await action.execute({ prospectId: 1000, tagId: 1.5 }, ctx),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
