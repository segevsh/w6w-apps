import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-subscriber.ts";

const page = (...ids: number[]) => ({ body: { entries: ids.map((id) => ({ id })) } });

test("new-subscriber seeds, emits, retries, and requests subscribed_at desc", async () => {
  const params = { accountId: "1", listId: "2" };
  const seed = await trigger.poll!({ params, state: {} }, mockCtx([page(20, 10)]).ctx);
  assertEquals(seed.events, []);
  assertEquals((seed.nextState as { seeded: boolean }).seeded, true);
  const run = () => {
    const c = mockCtx([page(30, 20, 10)]);
    return trigger.poll!({ params, state: seed.nextState }, c.ctx).then((r) => ({ r, c }));
  };
  const first = await run();
  assertEquals(first.r.events, [{ id: 30 }]);
  assertEquals((await run()).r, first.r);
  assertEquals(first.c.calls[0].method, "GET");
  assertEquals(
    first.c.calls[0].url,
    "https://api.aweber.com/1.0/accounts/1/lists/2/subscribers?ws.op=find&sort_key=subscribed_at&sort_order=desc&ws.size=100",
  );
});
