import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/upload-photo.ts";

Deno.test("upload-photo: POSTs /{pageId}/photos with url/caption/published as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "photo-1", post_id: "post-1" } }]);
  const result = await action.execute!(
    { pageId: "page-1", url: "https://example.com/pic.jpg", caption: "nice" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v23.0/page-1/photos");
  assertEquals(url.searchParams.get("url"), "https://example.com/pic.jpg");
  assertEquals(url.searchParams.get("caption"), "nice");
  assertEquals(url.searchParams.get("published"), "true");
  assertEquals(result, { id: "photo-1", post_id: "post-1" });
});

Deno.test("upload-photo: declares idempotent: false", () => {
  assertEquals(action.idempotent, false);
});
