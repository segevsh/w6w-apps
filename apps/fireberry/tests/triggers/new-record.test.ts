import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-record.ts";

const input = { params: { objectType: 1, fields: ["accountname"] }, subscriptionId: "sub_1" };
const row = (id: string) => ({
  _id: id,
  createdon: "2026-11-09T12:00:00Z",
  accountname: `Acme ${id}`,
});
const page = (...ids: string[]) => ({
  body: { data: ids.map(row), pageNumber: 1, pageSize: 100, isLastPage: true },
});

test("new-record: seeds, emits only new records, retries idempotently, and posts the createdon-desc query", async () => {
  const seed = mockCtx([page("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const first = mockCtx([page("b", "a")]);
  const retry = mockCtx([page("b", "a")]);
  const result = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
  const repeated = await trigger.poll!({ ...input, state: seeded.nextState }, retry.ctx);
  assertEquals(result.events, [row("b")]);
  assertEquals(repeated.events, result.events);
  assertEquals(first.calls[0].method, "POST");
  assertEquals(first.calls[0].url, "https://api.fireberry.com/api/v3/query");
  assertEquals(JSON.parse(first.calls[0].body ?? "null"), {
    objectType: 1,
    fields: [{ name: "createdon" }, { name: "accountname" }],
    orderBy: [{ name: "createdon", order: "desc" }],
    pageSize: 100,
  });
});
