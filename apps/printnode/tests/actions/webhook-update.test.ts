import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import webhookUpdate from "../../actions/webhook-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-update: PATCH /webhook/{id} sends only the given fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ webhookId: 188, secret: "password1", messages: ["computer state"] }],
  }]);
  const out = await webhookUpdate.execute({
    webhookId: 188,
    secret: "password1",
    messages: ["computer state"],
  }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/webhook/188");
  assertEquals(JSON.parse(calls[0].body!), { secret: "password1", messages: ["computer state"] });
  assertEquals(JSON.stringify(out).includes("password1"), false);
});

test("webhook-update: an empty update is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await webhookUpdate.execute({ webhookId: 1 }, ctx),
    Error,
    "Nothing to update",
  );
  assertEquals(calls.length, 0);
});

test("webhook-update: id must be a positive integer", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await webhookUpdate.execute({ webhookId: 0, url: "u" }, ctx),
    Error,
    "positive integer",
  );
});
