import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/webhook-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("webhook-create: POSTs url and events and returns the one-time secret", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "w1", secret: "whsec_x" } }]);
  const out = await action.execute!({
    companyId: "c1",
    url: "https://hooks.example.com/b",
    events: ["candidateAdded", "candidateStatusUpdated"],
    description: "sync",
  }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/webhook_endpoints");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://hooks.example.com/b",
    events: ["candidateAdded", "candidateStatusUpdated"],
    description: "sync",
  });
  assertEquals(out, { id: "w1", secret: "whsec_x" });
});

Deno.test("webhook-create: the 10-endpoint quota 429 is an error", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { type: "quota", message: "limit" } },
    headers: { "content-type": "application/json", "x-ratelimit-reset": "123" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!(
        { companyId: "c1", url: "https://h.io", events: "candidateAdded" },
        ctx,
      ),
    Error,
    "rate limit resets: 123",
  );
});
