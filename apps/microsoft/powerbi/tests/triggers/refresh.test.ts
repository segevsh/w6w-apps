import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import created from "../../triggers/new-refresh.ts";
import updated from "../../triggers/new-or-updated-refresh.ts";

const entry = (requestId: string, status = "Completed") => ({
  requestId,
  status,
  refreshType: "ViaApi",
  startTime: "2026-11-09T10:00:00Z",
});
const response = (...entries: ReturnType<typeof entry>[]) => ({ body: { value: entries } });

for (
  const [name, trigger] of [["new-refresh", created], ["new-or-updated-refresh", updated]] as const
) {
  const poll = (
    state: unknown,
    responses: ReturnType<typeof response>[],
    params: { datasetId: string; groupId?: string } = { datasetId: "d1" },
  ) => {
    const result = mockCtx(responses);
    return { result, out: trigger.poll!({ params, state, subscriptionId: "sub" }, result.ctx) };
  };

  test(`${name} 1 first check seeds without emitting`, async () => {
    const value = await poll({}, [response(entry("r1"))]).out;
    assertEquals(value.events, []);
    assertEquals((value.nextState as { seeded: boolean }).seeded, true);
  });

  test(`${name} 2 a new refresh is emitted`, async () => {
    const seed = await poll({}, [response(entry("r1"))]).out;
    const value = await poll(seed.nextState, [response(entry("r2"), entry("r1"))]).out;
    assertEquals(value.events.map((e) => (e as { requestId: string }).requestId), ["r2"]);
  });

  test(`${name} 3 repeated check is idempotent`, async () => {
    const seed = await poll({}, [response(entry("r1"))]).out;
    const run = () => poll(seed.nextState, [response(entry("r2"), entry("r1"))]).out;
    assertEquals(await run(), await run());
  });

  test(`${name} 4 calls the literal refresh-history endpoint with its bounded page`, async () => {
    const { result, out } = poll({ v: 1, kind: "ids", seeded: true, ids: [] }, [
      response(entry("r2")),
    ]);
    await out;
    const url = new URL(result.calls[0].url);
    assertEquals(result.calls[0].method, "GET");
    assertEquals(url.pathname, "/v1.0/myorg/datasets/d1/refreshes");
    assertEquals(url.searchParams.get("$top"), "60");
  });

  test(`${name} a workspace id scopes the call`, async () => {
    const { result, out } = poll(
      { v: 1, kind: "ids", seeded: true, ids: [] },
      [response()],
      { datasetId: "d1", groupId: "w1" },
    );
    await out;
    assertEquals(
      new URL(result.calls[0].url).pathname,
      "/v1.0/myorg/groups/w1/datasets/d1/refreshes",
    );
  });
}

test("new-or-updated-refresh emits an in-progress refresh again when its status changes", async () => {
  const run = (state: unknown, ...entries: ReturnType<typeof entry>[]) =>
    updated.poll!(
      { params: { datasetId: "d1" }, state, subscriptionId: "s" },
      mockCtx([response(...entries)]).ctx,
    );
  const seed = await run({}, entry("r1", "Unknown"));
  const value = await run(seed.nextState, entry("r1", "Completed"));
  assertEquals(value.events.map((e) => (e as { status: string }).status), ["Completed"]);
});

test("new-refresh does not re-emit a refresh whose status changes", async () => {
  const run = (state: unknown, ...entries: ReturnType<typeof entry>[]) =>
    created.poll!(
      { params: { datasetId: "d1" }, state, subscriptionId: "s" },
      mockCtx([response(...entries)]).ctx,
    );
  const seed = await run({}, entry("r1", "Unknown"));
  const value = await run(seed.nextState, entry("r1", "Completed"));
  assertEquals(value.events, []);
});
