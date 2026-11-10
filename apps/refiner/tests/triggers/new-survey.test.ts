import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-survey.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockCtx([{ body }]);

test("new-survey: seeds, emits only added rows, retries idempotently, and requests the literal list", async () => {
  const seed = ctx({ items: [{ uuid: "a", name: "A" }], pagination: { last_page: 1 } });
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.refiner.io/v1/forms?list=all&page=1&page_length=1000",
  );

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({
      items: [{ uuid: "b", name: "B" }, { uuid: "a", name: "A" }],
      pagination: { last_page: 1 },
    }).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({
      items: [{ uuid: "b", name: "B" }, { uuid: "a", name: "A" }],
      pagination: { last_page: 1 },
    }).ctx,
  );
  assertEquals(first.events, [{ uuid: "b", name: "B" }]);
  assertEquals(retry, first);

  // an edited row (same key, new values) is not a "new" record
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ items: [{ uuid: "a", name: "A renamed" }], pagination: { last_page: 1 } }).ctx,
  );
  assertEquals(edited.events, []);
});
