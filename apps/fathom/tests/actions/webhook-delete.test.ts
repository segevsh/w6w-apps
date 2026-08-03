import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-delete.ts";

Deno.test("webhook-delete: DELETEs /webhooks/{id} and reports the id it removed", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ webhookId: "ikEoQ4bVoq4JYUmc" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/external/v1/webhooks/ikEoQ4bVoq4JYUmc");
  assertEquals(calls[0].body, null);
  assertEquals(result, { id: "ikEoQ4bVoq4JYUmc", deleted: true });
  assertEquals(logs[0].level, "info");
});

Deno.test("webhook-delete: url-encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ webhookId: "a/b c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/external/v1/webhooks/a%2Fb%20c");
});

Deno.test("webhook-delete: an unknown id's 404 surfaces as an error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "Not found" }]);
  const err = await assertRejects(async () => await action.execute({ webhookId: "gone" }, ctx));
  assert(err instanceof Error);
  assert(err.message.includes("404"));
});

Deno.test("webhook-delete: is an idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
