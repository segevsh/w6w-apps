import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-contact.ts";

const input = { params: { listId: "list_1" }, subscriptionId: "sub_1" };
const contact = (id: string, updated: string) => ({
  id,
  email_address: `${id}@example.com`,
  created_at: "2026-11-09T11:00:00Z",
  last_updated_at: updated,
});

test("new-or-updated-contact: seeds, emits an edited contact again, retries idempotently, and requests last_updated_at.gte", async () => {
  const seed = mockCtx([{ body: { data: [contact("a", "2026-11-09T12:00:00Z")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const state = {
    v: 1 as const,
    kind: "ids" as const,
    seeded: true as const,
    ids: ["a:2026-11-09T12:00:00Z"],
    cursor: "2026-11-09T12:02:00.000Z",
  };
  const response = {
    body: { data: [contact("a", "2026-11-09T12:01:00Z"), contact("a", "2026-11-09T12:00:00Z")] },
  };
  const first = mockCtx([response]);
  const retry = mockCtx([response]);
  const result = await trigger.poll!({ ...input, state }, first.ctx);
  const repeated = await trigger.poll!({ ...input, state }, retry.ctx);
  assertEquals(result.events, [contact("a", "2026-11-09T12:01:00Z")]);
  assertEquals(repeated.events, result.events);
  assertEquals(first.calls[0].method, "GET");
  assertEquals(
    first.calls[0].url,
    "https://api.emailoctopus.com/lists/list_1/contacts?limit=100&last_updated_at.gte=2026-11-09T12%3A00%3A00.000Z",
  );
});
