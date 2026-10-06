import { assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: POST /v1/webhooks and keeps the one-time secret", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "wh_1", url: "https://example.com/h", secret: "whsec_abc", state: "active" },
  }]);
  const out = await webhookCreate.execute({ url: "https://example.com/h" }, ctx) as {
    secret: string;
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks");
  assertEquals(JSON.parse(calls[0].body!), { url: "https://example.com/h" });
  assertEquals(out.secret, "whsec_abc");
});
