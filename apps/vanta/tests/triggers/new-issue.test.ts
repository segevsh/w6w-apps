import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-issue.ts";

test("new-issue seeds, emits issues, retries idempotently, and requests newest first", async () => {
  const display = { display: { region: "commercial" } };
  const reply = (ids: string[]) => ({
    results: { data: ids.map((id) => ({ id })), pageInfo: { hasNextPage: false } },
  });
  const seed = mockCtx(
    [{ body: reply(["1"]) }],
    display,
  );
  const baseline = await trigger.poll!({ params: {}, state: {} }, seed.ctx);
  assertEquals(baseline.events, []);
  assertEquals(baseline.nextState.seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://api.vanta.com/v1/issues?orderBy=createdDate&orderDirection=desc&pageSize=100",
  );
  const response = { body: reply(["2", "1"]) };
  const a = mockCtx([response], display);
  const b = mockCtx([response], display);
  const one = await trigger.poll!({ params: {}, state: baseline.nextState }, a.ctx);
  const retry = await trigger.poll!({ params: {}, state: baseline.nextState }, b.ctx);
  assertEquals(one.events, [{ id: "2" }]);
  assertEquals(one, retry);
});
