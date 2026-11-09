import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-domain.ts";
import { mockCtx } from "../_helpers.ts";

test("new-domain seeds, emits, retries, and requests the newest page", async () => {
  const seed = mockCtx([{ body: { data: { domains: [{ id: "old" }] } } }]);
  const seeded = await trigger.poll!({ state: {}, params: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://api.maileroo.com/v1/domains?page=1&per_page=100&sort_by=id&sort_dir=desc",
  );
  const responses = [{ body: { data: { domains: [{ id: "new" }, { id: "old" }] } } }];
  const first = await trigger.poll!(
    { state: seeded.nextState, params: {} } as never,
    mockCtx(responses).ctx,
  );
  const retry = await trigger.poll!(
    { state: seeded.nextState, params: {} } as never,
    mockCtx(responses).ctx,
  );
  assertEquals(first.events, [{ id: "new" }]);
  assertEquals(retry, first);
});
