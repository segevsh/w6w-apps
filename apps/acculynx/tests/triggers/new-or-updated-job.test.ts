import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-job.ts";

test("new-or-updated-job seeds, emits an edit, retries, and requests modified order", async () => {
  const input = { params: {}, subscriptionId: "s" };
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { items: [{ id: "a", modifiedDate: "1" }] } }]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  const run = async () => {
    const mock = mockCtx([{
      body: { items: [{ id: "a", modifiedDate: "2" }, { id: "a", modifiedDate: "1" }] },
    }]);
    const result = await trigger.poll!({ ...input, state: seeded.nextState }, mock.ctx);
    assertEquals(
      mock.calls[0].url,
      "https://api.acculynx.com/api/v2/jobs?pageSize=100&sortBy=ModifiedDate&sortOrder=Descending",
    );
    return result;
  };
  assertEquals((await run()).events, [{ id: "a", modifiedDate: "2" }]);
  assertEquals(await run(), await run());
});
