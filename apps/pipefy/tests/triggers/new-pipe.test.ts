import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import trigger from "../../triggers/new-pipe.ts";

const input = { params: { organizationId: "12345" }, subscriptionId: "sub-1" };
const row = (id: string, name: string) => ({ id, name });
const ctx = (pipes: unknown[]) => mockCtx([{ body: { data: { organization: { pipes } } } }]);

test("new-pipe: seeds, emits only added pipes (not edits), retries idempotently, lists the organization's pipes", async () => {
  const seed = ctx([row("1", "Hiring")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(seed.calls[0].url, "https://api.pipefy.com/graphql");
  assert(
    normalizeGql(JSON.parse(seed.calls[0].body!).query).startsWith(
      "{ organization(id: 12345) { pipes {",
    ),
  );

  // "2" is added and "1" is renamed in place: only the added pipe is emitted.
  const page = [row("1", "Hiring (renamed)"), row("2", "Sales")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [{ change: "added", key: "2", values: row("2", "Sales") }]);
  assertEquals(retry, first);
});
