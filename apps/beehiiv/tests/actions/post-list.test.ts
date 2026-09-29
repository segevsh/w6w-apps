import { assertEquals } from "@std/assert";
import postList from "../../actions/post-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("post-list: fetches GET /publications/:id/posts with the given filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "post_1", title: "Launch" }] } }]);

  const out = await postList.execute({
    publicationId: "pub_1",
    audience: "premium",
    platform: "email",
    status: "confirmed",
    contentTags: "a,b",
    slugs: "s1",
    authors: "Jane",
    limit: 5,
    orderBy: "publish_date",
    direction: "asc",
  }, ctx) as { data: Array<{ id: string }> };

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/publications/pub_1/posts");
  assertEquals(url.searchParams.get("audience"), "premium");
  assertEquals(url.searchParams.get("platform"), "email");
  assertEquals(url.searchParams.get("status"), "confirmed");
  assertEquals(url.searchParams.getAll("content_tags[]"), ["a", "b"]);
  assertEquals(url.searchParams.getAll("slugs[]"), ["s1"]);
  assertEquals(url.searchParams.getAll("authors[]"), ["Jane"]);
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.get("order_by"), "publish_date");
  assertEquals(url.searchParams.get("direction"), "asc");
  assertEquals(out.data[0].id, "post_1");
});

Deno.test("post-list: omits unset filters entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await postList.execute({ publicationId: "pub_1" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("post-list: is a read action", () => {
  assertEquals(postList.type, "read");
});
