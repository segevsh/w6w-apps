import { test } from "node:test";
import { deepStrictEqual as assertEquals } from "node:assert/strict";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-message.ts";

const input = { params: { "yourNumber": "+15551230000" }, subscriptionId: "sub-1" };
const item = (id: string) => ({ uuid: id });
const wrap = (items: unknown[]) => ({ messages: items, page_number: 0 });
const ctx = (...pages: unknown[][]) => mockCtx(pages.map((p) => ({ body: wrap(p) })));

test("new-message seeds, emits, retries, and requests the newest page", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.p.2chat.io/open/whatsapp/messages/+15551230000?page_number=0",
  );
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

test("new-message reads one page even when every item on it is new", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
  const m = ctx([item("c"), item("b")], [item("z")]);
  const got = await trigger.poll!({ ...input, state: seeded.nextState }, m.ctx);
  assertEquals(got.events, [item("b"), item("c")]);
  assertEquals(m.calls.length, 1);
});
