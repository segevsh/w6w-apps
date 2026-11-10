import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-job.ts";

test("new-job seeds, emits, retries, and requests the documented creation order", async () => {
  const input = { params: {}, subscriptionId: "s" };
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { items: [{ id: "a" }] } }]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  const run = async () => {
    const mock = mockCtx([{ body: { items: [{ id: "b" }, { id: "a" }] } }]);
    const result = await trigger.poll!({ ...input, state: seeded.nextState }, mock.ctx);
    assertEquals(
      mock.calls[0].url,
      "https://api.acculynx.com/api/v2/jobs?pageSize=100&sortBy=CreatedDate&sortOrder=Descending",
    );
    return result;
  };
  const first = await run();
  assertEquals(first.events, [{ id: "b" }]);
  assertEquals(await run(), first);
});
