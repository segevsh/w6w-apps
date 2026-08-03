import { assert, assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/search.ts";

Deno.test("search: GETs /search.json with q in the query string", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { posts: [], topics: [] } }]);
  await action.execute({ q: "onboarding" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/search.json");
  assertEquals(url.searchParams.get("q"), "onboarding");
});

Deno.test("search: the filter grammar rides inside q, URL-encoded not concatenated", async () => {
  // Discourse takes exactly two parameters here; every filter a caller might
  // expect is a prefix inside `q`.
  const q = "onboarding @alice #howto tags:api+solved after:2026-01-01 status:solved";
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ q }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("q"), q);
  // `#` must not terminate the URL as a fragment.
  assert(!calls[0].url.includes("#howto"));
  assert(calls[0].url.includes("%23howto"));
});

Deno.test("search: page is optional and omitted when unset", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ q: "x" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("page"), false);

  const paged = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ q: "x", page: 3 }, paged.ctx);
  assertEquals(new URL(paged.calls[0].url).searchParams.get("page"), "3");
});

Deno.test("search: offers only the two params the endpoint documents", () => {
  assertEquals(action.params!.map((p) => p.key), ["q", "page"]);
  // The grammar is documented in the hint rather than exploded into params that
  // would only be reassembled into the same string.
  const hint = action.params!.find((p) => p.key === "q")!.hint!;
  for (const token of ["@user", "#category", "tags:", "before:", "order:", "status:"]) {
    assert(hint.includes(token), `q hint does not document ${token}`);
  }
});

Deno.test("search: SITE_URL is the connection's forum, not a hard-coded host", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }], "https://other.forum.test");
  await action.execute({ q: "x" }, ctx);
  assert(calls[0].url.startsWith("https://other.forum.test/"));
  assert(!calls[0].url.startsWith(SITE_URL));
});
