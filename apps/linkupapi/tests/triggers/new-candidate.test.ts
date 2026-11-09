import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-candidate.ts";
import { mockCtx } from "../_helpers.ts";

test("new-candidate seeds, emits, retries, and requests the newest page", async () => {
  const params = { accountId: "account-1", jobId: "job-1" };
  const seed = mockCtx([{ body: { success: true, data: [{ id: "old" }] } }]);
  const seeded = await trigger.poll!({ state: {}, params } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(seed.calls[0].url, "https://api.linkupapi.com/v2/recruiter");
  assertEquals(JSON.parse(seed.calls[0].body!), {
    account_id: "account-1",
    action: "get_candidates",
    params: { job_id: "job-1", count: 100, sortType: "APPLIED_DATE", sortOrder: "DESCENDING" },
  });
  const responses = [{ body: { success: true, data: [{ id: "new" }, { id: "old" }] } }];
  const first = await trigger.poll!(
    { state: seeded.nextState, params } as never,
    mockCtx(responses).ctx,
  );
  const retry = await trigger.poll!(
    { state: seeded.nextState, params } as never,
    mockCtx(responses).ctx,
  );
  assertEquals(first.events, [{ id: "new" }]);
  assertEquals(retry, first);
});
