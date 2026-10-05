import { assertEquals, assertRejects } from "@std/assert";
import resourceSubscriptionCreate from "../../actions/resource-subscription-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "resourceName": "sale", "postUrl": "postUrl-1" };

Deno.test("resource-subscription-create: sends PUT /v2/resource_subscriptions with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "resource_subscription": { "id": "x1", "marker": true } },
  }]);
  await resourceSubscriptionCreate.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/resource_subscriptions");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals([...new URLSearchParams(calls[0].body ?? "")], [["resource_name", "sale"], [
    "post_url",
    "postUrl-1",
  ]]);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("resource-subscription-create: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{
    body: { "success": true, "resource_subscription": { "id": "x1", "marker": true } },
  }]);
  assertEquals(await resourceSubscriptionCreate.execute(INPUT, ctx), {
    "id": "x1",
    "marker": true,
  });
});

Deno.test("resource-subscription-create: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(resourceSubscriptionCreate.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("resource-subscription-create: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(
    () => Promise.resolve(resourceSubscriptionCreate.execute(INPUT, ctx)),
    Error,
    "refused",
  );
});
