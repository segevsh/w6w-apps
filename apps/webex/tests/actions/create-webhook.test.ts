import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-webhook.ts";

Deno.test("create-webhook: POSTs /webhooks and strips the echoed secret from the result", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "w1", secret: "shh", resource: "messages", event: "created" } },
  ]);
  const result = await action.execute(
    {
      name: "hook",
      targetUrl: "https://example.com/hook",
      resource: "messages",
      event: "created",
      secret: "mysecret",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://webexapis.com/v1/webhooks");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    name: "hook",
    targetUrl: "https://example.com/hook",
    resource: "messages",
    event: "created",
    secret: "mysecret",
  });
  assertEquals(result, { id: "w1", resource: "messages", event: "created" });
});

Deno.test("create-webhook: ownedByOrg maps to ownedBy=org in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { name: "n", targetUrl: "https://x", resource: "rooms", event: "created", ownedByOrg: true },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).ownedBy, "org");
});

Deno.test("create-webhook: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
