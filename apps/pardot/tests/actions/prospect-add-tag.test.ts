import { assertEquals, assertRejects } from "@std/assert";
import { mockPardotCtx } from "../_helpers.ts";
import action from "../../actions/prospect-add-tag.ts";

Deno.test("prospect-add-tag: POSTs {tagId} to /prospects/<id>/do/addTag", async () => {
  const { ctx, calls } = mockPardotCtx([{
    status: 200,
    body: { id: 610, objectId: 1000, objectType: "prospect", tagId: 100 },
  }]);
  const out = await action.execute({ prospectId: 1000, tagId: 100 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v5/objects/prospects/1000/do/addTag");
  assertEquals(JSON.parse(calls[0].body!), { tagId: 100 });
  assertEquals(out, { id: 610, objectId: 1000, objectType: "prospect", tagId: 100 });
});

Deno.test("prospect-add-tag: refuses a non-integer tag id before any request", async () => {
  const { ctx, calls } = mockPardotCtx([]);
  await assertRejects(
    async () => await action.execute({ prospectId: 1000, tagId: 1.5 }, ctx),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
