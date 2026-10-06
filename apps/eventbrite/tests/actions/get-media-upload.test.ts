import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-media-upload.ts";

Deno.test("get-media-upload: GETs /media/upload/ with type", async () => {
  const { ctx, calls } = mockCtx([{ body: { upload_token: "t" } }]);
  await action.execute!({ type: "image-event-logo" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/media/upload/");
  assertEquals(url.searchParams.get("type"), "image-event-logo");
});
