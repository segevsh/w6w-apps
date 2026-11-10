import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-connection.ts";

const input = { params: {}, subscriptionId: "sub_1" };
const connection = (id: string) => ({ id, group_id: "g1", service: "postgres", schema: `s_${id}` });
const page = (...ids: string[]) => ({
  body: { code: "Success", data: { items: ids.map(connection), next_cursor: null } },
});

test("new-connection: seeds, emits only added connections, retries idempotently, and requests GET /v1/connections?limit=1000", async () => {
  const seed = mockCtx([page("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const first = mockCtx([page("a", "b")]);
  const retry = mockCtx([page("a", "b")]);
  const result = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
  const repeated = await trigger.poll!({ ...input, state: seeded.nextState }, retry.ctx);
  assertEquals(result.events, [connection("b")]);
  assertEquals(repeated.events, result.events);
  assertEquals(first.calls[0].method, "GET");
  assertEquals(first.calls[0].url, "https://api.fivetran.com/v1/connections?limit=1000");
});

test("new-connection: edits and removals do not emit", async () => {
  const seed = mockCtx([page("a", "b")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  const edited = { ...connection("a"), schema: "renamed" };
  const next = mockCtx([{
    body: { code: "Success", data: { items: [edited], next_cursor: null } },
  }]);
  const result = await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
  assertEquals(result.events, []);
});
