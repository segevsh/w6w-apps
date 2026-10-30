import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscriber-get.ts";

test("subscriber-get: GETs the contact by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "987", email: "a@example.com", tags: ["1"] } }]);
  const out = await action.execute({ subscriberId: "987" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.klicktipp.com/subscriber/987");
  assertEquals(out, { subscriber: { id: "987", email: "a@example.com", tags: ["1"] } });
});

test("subscriber-get: refuses an id that could escape the path", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ subscriberId: "1/../tag" }, ctx),
    Error,
    "alphanumeric",
  );
  assertEquals(calls.length, 0);
});

test("subscriber-get: surfaces error 401 (contact not found) in English", async () => {
  const { ctx } = mockCtx([{ status: 406, body: { error: 401, error_message: "Nicht gefunden" } }]);
  await assertRejects(
    async () => await action.execute({ subscriberId: "1" }, ctx),
    Error,
    "contact not found",
  );
});
