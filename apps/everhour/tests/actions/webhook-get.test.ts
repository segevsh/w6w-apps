import { assertEquals, assertRejects } from "@std/assert";
import webhookGet from "../../actions/webhook-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webhook-get: GET /hooks/{hookId} with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await webhookGet.execute({ "hookId": 280382 }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/hooks/280382");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("webhook-get: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () => Promise.resolve(webhookGet.execute({ "hookId": 280382 }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("webhook-get: declares read", () => {
  assertEquals(webhookGet.type, "read");
});
