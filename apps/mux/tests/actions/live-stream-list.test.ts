import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/live-stream-list.ts";

test("live-stream-list: reads the account's streams", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [{ id: "ls1", status: "idle" }] },
  }]);
  const out = await action.execute!({}, ctx) as { streams: unknown[] };
  assertEquals(out.streams.length, 1);
  assertEquals(new URL(calls[0].url).pathname, "/video/v1/live-streams");
});

/** The response contains every broadcaster's key. */
test("live-stream-list: warns that the response carries credentials", () => {
  assert(/credentials/.test(action.description!), action.description);
});
