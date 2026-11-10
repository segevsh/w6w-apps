import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";

const input = { params: { listId: "list_1" }, subscriptionId: "sub_1" };
const contact = (id: string) => ({
  id,
  email_address: `${id}@example.com`,
  created_at: "2026-11-09T12:00:00Z",
});

test("new-contact: seeds, emits unseen contacts, retries idempotently, and requests the documented since filter", async () => {
  const seed = mockCtx([{ body: { data: [contact("a")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const state = {
    v: 1 as const,
    kind: "ids" as const,
    seeded: true as const,
    ids: ["a"],
    cursor: "2026-11-09T12:02:00.000Z",
  };
  const response = { body: { data: [contact("b"), contact("a")] } };
  const first = mockCtx([response]);
  const retry = mockCtx([response]);
  const result = await trigger.poll!({ ...input, state }, first.ctx);
  const repeated = await trigger.poll!({ ...input, state }, retry.ctx);
  assertEquals(result.events, [contact("b")]);
  assertEquals(repeated.events, result.events);
  assertEquals(first.calls[0].method, "GET");
  assertEquals(
    first.calls[0].url,
    "https://api.emailoctopus.com/lists/list_1/contacts?limit=100&created_at.gte=2026-11-09T12%3A00%3A00.000Z",
  );
});
