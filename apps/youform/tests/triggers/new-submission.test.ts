import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-submission.ts";

test("new-submission seeds, emits submissions, retries idempotently, and requests newest first", async () => {
  const body = (ids: string[]) => ({ data: { data: ids.map((id) => ({ id })) } });
  const params = { form: "form-a" };
  const seed = mockCtx([{ body: body(["1"]) }]);
  const baseline = await trigger.poll!({ params, state: {} }, seed.ctx);
  assertEquals(baseline.events, []);
  assertEquals(baseline.nextState.seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://app.youform.com/api/forms/form-a/submissions?sort_by=created_at&sort_by_order=desc&per_page=100&page=1",
  );
  const a = mockCtx([{ body: body(["2", "1"]) }]);
  const b = mockCtx([{ body: body(["2", "1"]) }]);
  const one = await trigger.poll!({ params, state: baseline.nextState }, a.ctx);
  const retry = await trigger.poll!({ params, state: baseline.nextState }, b.ctx);
  assertEquals(one.events, [{ id: "2" }]);
  assertEquals(one, retry);
});
