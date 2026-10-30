import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/asset-list.ts";

test("asset-list: can filter to one live stream's recordings", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute!({ liveStreamId: "ls1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("live_stream_id"), "ls1");
});

/** There is no search — which is the argument for passthrough. */
test("asset-list: says there is no search", () => {
  assert(/no search/i.test(action.description!), action.description);
});
