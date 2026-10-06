import { assertEquals, assertRejects } from "@std/assert";
import { mockPardotCtx } from "../_helpers.ts";
import action from "../../actions/prospect-delete.ts";

Deno.test("prospect-delete: DELETEs the prospect and reports the id", async () => {
  const { ctx, calls } = mockPardotCtx([{ status: 204 }]);
  const out = await action.execute({ prospectId: 12 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/v5/objects/prospects/12");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: 12, deleted: true });
});

Deno.test("prospect-delete: a refusal is an error, not a silent success", async () => {
  const { ctx } = mockPardotCtx([{
    status: 404,
    body: { code: 3, message: "Invalid prospect ID" },
  }]);
  await assertRejects(async () => await action.execute({ prospectId: 12 }, ctx), Error, "404");
});
