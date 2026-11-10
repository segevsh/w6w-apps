import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockMatrixCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-room-message.ts";

const response = (...ids: string[]) => ({ body: { chunk: ids.map((event_id) => ({ event_id })) } });
const poll = (state: unknown, responses: ReturnType<typeof response>[]) => {
  const result = mockMatrixCtx(responses);
  return {
    result,
    out: trigger.poll!(
      { params: { roomId: "!x:example.org" }, state, subscriptionId: "sub" },
      result.ctx,
    ),
  };
};

test("1 first check seeds without emitting", async () => {
  const value = await poll({}, [response("$a:example.org")]).out;
  assertEquals(value.events, []);
  assertEquals((value.nextState as { seeded: boolean }).seeded, true);
});

test("2 a new room event is emitted", async () => {
  const seed = await poll({}, [response("$a:example.org")]).out;
  const value = await poll(seed.nextState, [response("$b:example.org", "$a:example.org")]).out;
  assertEquals(value.events.map((event) => (event as { event_id: string }).event_id), [
    "$b:example.org",
  ]);
});

test("3 repeated check is idempotent", async () => {
  const seed = await poll({}, [response("$a:example.org")]).out;
  const run = () => poll(seed.nextState, [response("$b:example.org", "$a:example.org")]).out;
  assertEquals(await run(), await run());
});

test("4 calls the literal messages endpoint backwards with a bounded limit", async () => {
  const { result, out } = poll({ v: 1, kind: "ids", seeded: true, ids: [] }, [
    response("$b:example.org"),
  ]);
  await out;
  const url = new URL(result.calls[0].url);
  assertEquals(result.calls[0].method, "GET");
  assertEquals(url.pathname, "/_matrix/client/v3/rooms/!x%3Aexample.org/messages");
  assertEquals(url.searchParams.get("dir"), "b");
  assertEquals(url.searchParams.get("limit"), "100");
});
