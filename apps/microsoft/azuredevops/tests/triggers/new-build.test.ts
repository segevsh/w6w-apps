import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-build.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});
const at = (seconds: number) => {
  clock.now = () => seconds * 1000;
};
// Run 1 finished before the seed (1_700_000_000 s); later runs finished after it.
const response = (...ids: number[]) => ({
  body: {
    value: ids.map((id) => ({
      id,
      finishTime: new Date((id === 1 ? 1_699_999_990 : 1_700_000_030) * 1000).toISOString(),
    })),
  },
});
const poll = (state: unknown, responses: ReturnType<typeof response>[]) => {
  const result = mockCtx(responses, { display: { organization: "org" } });
  return {
    result,
    out: trigger.poll!(
      { params: { project: "project" }, state, subscriptionId: "sub" },
      result.ctx,
    ),
  };
};

test("1 first check seeds without emitting", async () => {
  at(1_700_000_000);
  const value = await poll({}, [response(1)]).out;
  assertEquals(value.events, []);
  assertEquals((value.nextState as { seeded: boolean }).seeded, true);
});

test("2 a new build is emitted", async () => {
  at(1_700_000_000);
  const seed = await poll({}, [response(1)]).out;
  at(1_700_000_060);
  const value = await poll(seed.nextState, [response(2, 1)]).out;
  assertEquals(value.events.map((event) => (event as { id: number }).id), [2]);
  assertEquals((value.nextState as { cursor: number }).cursor, 1_700_000_060_000);
});

test("3 repeated check is idempotent", async () => {
  at(1_700_000_000);
  const seed = await poll({}, [response(1)]).out;
  at(1_700_000_060);
  const run = () => poll(seed.nextState, [response(2, 1)]).out;
  assertEquals(await run(), await run());
});

test("4 calls the literal build endpoint with minTime and its bounded page", async () => {
  at(1_700_000_060);
  const { result, out } = poll(
    { v: 1, kind: "ids", seeded: true, ids: [], cursor: 1_700_000_000_000 },
    [response(2)],
  );
  await out;
  const url = new URL(result.calls[0].url);
  assertEquals(result.calls[0].method, "GET");
  assertEquals(url.pathname, "/org/project/_apis/build/builds");
  assertEquals(url.searchParams.get("minTime"), "2023-11-14T22:11:20.000Z");
  assertEquals(url.searchParams.get("$top"), "100");
});
