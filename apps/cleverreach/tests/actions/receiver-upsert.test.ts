import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/receiver-upsert.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("receiver-upsert: POSTs the array as the body", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, email: "a@b.co" }] }]);
  const rows = [{ email: "a@b.co", global_attributes: { firstname: "A" } }];
  await action.execute({ groupId: "5", receivers: JSON.stringify(rows) }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/groups/5/receivers/upsert");
  assertEquals(JSON.parse(calls[0].body!), rows);
});

Deno.test("receiver-upsert: rejects a non-array, an empty array and a row without an email", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ groupId: "5", receivers: { email: "a@b.co" } }, ctx),
    Error,
    "non-empty JSON array",
  );
  await assertRejects(
    async () => await action.execute({ groupId: "5", receivers: [] }, ctx),
    Error,
    "non-empty JSON array",
  );
  await assertRejects(
    async () => await action.execute({ groupId: "5", receivers: [{ source: "x" }] }, ctx),
    Error,
    "`receivers[0].email` is required",
  );
  assertEquals(calls.length, 0);
});
