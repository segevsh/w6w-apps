import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-notification.ts";

const response = (...ids: string[]) => ({ body: ids.map((id) => ({ id, type: "mention" })) });
const poll = (state: unknown, responses: ReturnType<typeof response>[]) => {
  const result = mockCtx(responses, { display: { url: "https://mastodon.example" } });
  return { result, out: trigger.poll!({ params: {}, state, subscriptionId: "sub" }, result.ctx) };
};

test("1 first check seeds without emitting", async () => {
  const { out } = poll({}, [response("a")]);
  const value = await out;
  assertEquals(value.events, []);
  assertEquals((value.nextState as { seeded: boolean }).seeded, true);
});

test("2 a new notification is emitted", async () => {
  const seed = await poll({}, [response("a")]).out;
  const value = await poll(seed.nextState, [response("b", "a")]).out;
  assertEquals(value.events.map((event) => (event as { id: string }).id), ["b"]);
});

test("3 repeated check is idempotent", async () => {
  const seed = await poll({}, [response("a")]).out;
  const run = () => poll(seed.nextState, [response("b", "a")]).out;
  assertEquals(await run(), await run());
});

test("4 calls the literal notifications endpoint with its limit", async () => {
  const { result, out } = poll({ v: 1, kind: "ids", seeded: true, ids: [] }, [response("b")]);
  await out;
  const url = new URL(result.calls[0].url);
  assertEquals(result.calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://mastodon.example/api/v1/notifications");
  assertEquals(url.searchParams.get("limit"), "40");
});
