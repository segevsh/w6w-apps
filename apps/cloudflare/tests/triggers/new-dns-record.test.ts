import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-dns-record.ts";

const input = { params: { zoneId: "zone-1" }, subscriptionId: "sub-1" };
const rec = (id: string) => ({ id, type: "A", name: `${id}.example.com` });
const page = (...result: unknown[]) => mockCtx([{ body: { success: true, result } }]);

test("new-dns-record: seeds, emits only new, retries idempotently, lists the whole zone", async () => {
  const seed = page(rec("a"));
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.cloudflare.com/client/v4/zones/zone-1/dns_records?per_page=5000&page=1",
  );

  const rows = [rec("a"), rec("b")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  assertEquals(first.events, [rec("b")]);
  assertEquals(retry, first);
});
