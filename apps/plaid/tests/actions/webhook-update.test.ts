import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-update.ts";

const conn = { display: { environment: "sandbox" } };

Deno.test("webhook-update: points the Item at a URL", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { item: {} } }], conn);
  await action.execute!({ accessToken: "tok", webhook: "https://example.com/plaid" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/item/webhook/update");
  assertEquals(JSON.parse(calls[0].body!).webhook, "https://example.com/plaid");
});

Deno.test("webhook-update: a non-HTTPS URL is refused before the call", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ accessToken: "tok", webhook: "http://example.com" }, ctx),
    Error,
    "HTTPS",
  );
  assertEquals(calls.length, 0);
});

/** Webhooks are the alternative to polling a few-times-a-day refresh. */
Deno.test("webhook-update: frames itself against polling", () => {
  assert(/polling/.test(action.description!), action.description);
});
