import { assertEquals, assertRejects } from "@std/assert";
import resourceSubscriptionDelete from "../../actions/resource-subscription-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "resourceSubscriptionId": "resourceSubscriptionId-1==" };

Deno.test("resource-subscription-delete: sends DELETE /v2/resource_subscriptions/resourceSubscriptionId-1%3D%3D with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "message": "deleted" } }]);
  await resourceSubscriptionDelete.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/resource_subscriptions/resourceSubscriptionId-1%3D%3D");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("resource-subscription-delete: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: { "success": true, "message": "deleted" } }]);
  assertEquals(await resourceSubscriptionDelete.execute(INPUT, ctx), { "message": "deleted" });
});

Deno.test("resource-subscription-delete: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(resourceSubscriptionDelete.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("resource-subscription-delete: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(
    () => Promise.resolve(resourceSubscriptionDelete.execute(INPUT, ctx)),
    Error,
    "refused",
  );
});
