import { assertEquals, assertRejects } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webhook-list: GET /api/v1/webhooks on the workspace host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { webhooks: page([{ id: "w1" }]) } }]);
  const out = await webhookList.execute({ pageSize: 5, cursor: "c", status: "active" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).host, "acme.fellow.app");
  assertEquals(pathOf(calls[0].url), "/api/v1/webhooks");
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign()");
  assertEquals(calls[0].body, null);
  assertEquals(queryOf(calls[0].url), {
    page_size: "5",
    cursor: "c",
    filters: '{"status":"active"}',
  });
  assertEquals((out as { items: unknown[] }).items.length, 1);
});

Deno.test("webhook-list: a Fellow error surfaces its detail and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Forbidden for this key" } }]);
  const err = await assertRejects(
    () => Promise.resolve(webhookList.execute({ pageSize: 5, cursor: "c", status: "active" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("Forbidden for this key"), true, err.message);
});
