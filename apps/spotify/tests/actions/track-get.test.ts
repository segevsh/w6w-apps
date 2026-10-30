import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/track-get.ts";

test("track-get: GETs /tracks/{id}, accepting a bare ID", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "11dFghVXANMlKmJXsNCbNl" } }]);
  await action.execute({ id: "11dFghVXANMlKmJXsNCbNl" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/tracks/11dFghVXANMlKmJXsNCbNl");
});

test("track-get: strips a spotify:track: URI down to the bare ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ id: "spotify:track:11dFghVXANMlKmJXsNCbNl" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/tracks/11dFghVXANMlKmJXsNCbNl");
});

test("track-get: forwards market as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ id: "abc", market: "US" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("market"), "US");
});
