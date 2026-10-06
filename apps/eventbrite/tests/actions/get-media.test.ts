import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-media.ts";

Deno.test("get-media: GETs /media/{id}/ with thumbnail size", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", url: "u" } }]);
  await action.execute!({ mediaId: "12345", width: 10, height: 15 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/media/12345/");
  assertEquals(url.searchParams.get("width"), "10");
  assertEquals(url.searchParams.get("height"), "15");
});
