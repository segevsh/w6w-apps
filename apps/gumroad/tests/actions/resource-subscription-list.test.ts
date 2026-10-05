import { assertEquals, assertRejects } from "@std/assert";
import resourceSubscriptionList from "../../actions/resource-subscription-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "resourceName": "sale" };

Deno.test("resource-subscription-list: sends GET /v2/resource_subscriptions with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "resource_subscriptions": [{ "id": "a" }] },
  }]);
  await resourceSubscriptionList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/resource_subscriptions");
  assertEquals(queryOf(calls[0].url), { "resource_name": "sale" });
  assertEquals(calls[0].body, null);
});

Deno.test("resource-subscription-list: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{
    body: { "success": true, "resource_subscriptions": [{ "id": "a" }] },
  }]);
  assertEquals(await resourceSubscriptionList.execute(INPUT, ctx), {
    "resourceSubscriptions": [{ "id": "a" }],
  });
});

Deno.test("resource-subscription-list: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(resourceSubscriptionList.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("resource-subscription-list: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(
    () => Promise.resolve(resourceSubscriptionList.execute(INPUT, ctx)),
    Error,
    "refused",
  );
});
