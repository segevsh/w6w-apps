import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-subscription-get-many.ts";

Deno.test("webhook-subscription-get-many: sends scope + organization, omits user for org scope", async () => {
  const { ctx, calls } = mockCtx([{ body: { collection: [] } }]);
  await action.execute({ scope: "organization", organization: "org", user: "ignored" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/webhook_subscriptions");
  assertEquals(url.searchParams.get("scope"), "organization");
  assertEquals(url.searchParams.get("organization"), "org");
  assertEquals(url.searchParams.has("user"), false);
});

Deno.test("webhook-subscription-get-many: includes user for user scope", async () => {
  const { ctx, calls } = mockCtx([{ body: { collection: [] } }]);
  await action.execute({ scope: "user", organization: "org", user: "usr" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("user"), "usr");
});
