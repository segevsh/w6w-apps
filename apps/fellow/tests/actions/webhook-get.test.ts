import { assertEquals, assertRejects } from "@std/assert";
import webhookGet from "../../actions/webhook-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-get: GET /api/v1/webhook/w1 on the workspace host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { webhook: { id: "w1", url: "https://h.test/x", status: "active", secret: "s3" } },
  }]);
  const out = await webhookGet.execute({ webhookId: "w1" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).host, "acme.fellow.app");
  assertEquals(pathOf(calls[0].url), "/api/v1/webhook/w1");
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign()");
  assertEquals(calls[0].body, null);
  assertEquals((out as { id: string }).id, "w1");
});

Deno.test("webhook-get: a Fellow error surfaces its detail and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Forbidden for this key" } }]);
  const err = await assertRejects(
    () => Promise.resolve(webhookGet.execute({ webhookId: "w1" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("Forbidden for this key"), true, err.message);
});
