import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-phone-number.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const num = (id: string) => ({ id, phone_number: `+1312555${id}` });
const page = (...ids: string[]) => ({ body: { data: ids.map(num), meta: {} } });

test("new-phone-number seeds without flooding", async () => {
  const m = mockCtx([page("0101", "0100")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
});

test("new-phone-number emits only the new number and retries identically", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([page("0101", "0100")]).ctx);
  const run = () =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([page("0102", "0101", "0100")]).ctx,
    );
  const first = await run();
  assertEquals(first.events, [num("0102")]);
  assertEquals(await run(), first);
});

test("new-phone-number requests the literal newest-first first page", async () => {
  const m = mockCtx([page("0101")]);
  await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(
    m.calls[0].url,
    "https://api.telnyx.com/v2/phone_numbers?page%5Bsize%5D=100&page%5Bnumber%5D=1",
  );
});
