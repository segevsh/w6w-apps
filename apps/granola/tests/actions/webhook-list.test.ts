import { assertEquals, assertRejects } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-list: GET /v1/webhook-endpoints", async () => {
  const body = { webhook_endpoints: [{ id: "whe_x", url_redacted: true }] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await webhookList.execute({}, ctx), body);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/webhook-endpoints");
});

Deno.test("webhook-list: 404 surfaces as an error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { code: "NOT_FOUND", message: "n/a" } }]);
  await assertRejects(async () => await webhookList.execute({}, ctx), Error, "404");
});
