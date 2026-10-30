import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/mailing-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("mailing-get: calls GET /v3/mailings/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1", subject: "Hi" } }]);
  const out = await action.execute({ mailingId: "m1" }, ctx) as { item: { subject: string } };
  assertEquals(pathOf(calls[0].url), "/v3/mailings/m1");
  assertEquals(out.item.subject, "Hi");
});

test("mailing-get: requires a mailing id", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`mailingId` is required");
  assertEquals(calls.length, 0);
});
