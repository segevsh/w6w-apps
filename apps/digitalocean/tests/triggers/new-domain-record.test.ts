import { test } from "node:test";
import { rejects } from "node:assert/strict";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-domain-record.ts";

const input = { params: { domain: "example.com" }, subscriptionId: "sub-1" };
const rec = (id: number) => ({ id, type: "A", name: `h${id}`, data: "203.0.113.1", ttl: 300 });
const ctx = (records: unknown[], total = records.length) =>
  mockCtx([{ body: { domain_records: records, meta: { total } } }]);
const withName = (r: ReturnType<typeof rec>) => ({ ...r, qualifiedName: `${r.name}.example.com` });

test("new-domain-record: seeds without flooding and requests the domain's records", async () => {
  const seed = ctx([rec(1)]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.digitalocean.com/v2/domains/example.com/records?per_page=200",
  );
});

test("new-domain-record: emits only the record that was added", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([rec(1)]).ctx);
  const result = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([rec(1), rec(2)]).ctx,
  );
  assertEquals(result.events, [withName(rec(2))]);
});

test("new-domain-record: the same state and responses give the same result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([rec(1)]).ctx);
  const page = [rec(1), rec(2)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

test("new-domain-record: a domain larger than one page is refused, not silently truncated", async () => {
  await rejects(
    () => trigger.poll!({ ...input, state: {} }, ctx([rec(1)], 450).ctx) as Promise<unknown>,
    /at most 200/,
  );
});
