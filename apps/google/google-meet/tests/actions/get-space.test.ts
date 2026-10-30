import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-space.ts";

test("get-space: GETs the space by its typeable meeting-code alias", async () => {
  const { ctx, calls } = mockCtx([
    { body: { name: "spaces/abc", meetingCode: "abc-mnop-xyz", meetingUri: "https://x" } },
  ]);
  const result = await action.execute!({ name: "spaces/abc-mnop-xyz" }, ctx) as Record<string, unknown>;
  assertEquals(result.meetingCode, "abc-mnop-xyz");
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v2/spaces/abc-mnop-xyz");
});

test("get-space: sends no query parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "spaces/jQCFfuBOdN5z" } }]);
  await action.execute!({ name: "spaces/jQCFfuBOdN5z" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
