import { assertEquals } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/solution-article-search.ts";

Deno.test("solution-article-search: GETs the search path and unwraps `articles`", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { articles: [{ id: 2886 }] } }]);
  const out = await action.execute({ searchTerm: "printer" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.freshservice.com/api/v2/solutions/articles/search?search_term=printer",
  );
  assertEquals(out, { articles: [{ id: 2886 }] });
});

Deno.test("solution-article-search: passes user_email for an impersonated search", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { articles: [] } }]);
  await action.execute(
    { searchTerm: "vpn issue", userEmail: "andrea@acme.test", perPage: 10 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("search_term"), "vpn issue");
  assertEquals(url.searchParams.get("user_email"), "andrea@acme.test");
  assertEquals(url.searchParams.get("per_page"), "10");
});
