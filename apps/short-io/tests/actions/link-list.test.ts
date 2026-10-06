import { assert, assertEquals } from "@std/assert";
import action from "../../actions/link-list.ts";
import { LINK, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("link-list: GETs /api/links with domain_id and a small default limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 1, links: [LINK], nextPageToken: "page_1" } }]);
  const out = await action.execute({ domainId: 7 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/links");
  assertEquals(queryOf(calls[0].url), { domain_id: "7", limit: "50" });
  assertEquals(out.count, 1);
  assertEquals(out.nextPageToken, "page_1");
  assert(!("password" in out.links[0]));
});

Deno.test("link-list: forwards the page token and filters; null token on last page", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 0, links: [], nextPageToken: null } }]);
  const out = await action.execute({
    domainId: 7,
    limit: 10,
    pageToken: "p",
    folderId: "f",
    dateSortOrder: "asc",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    domain_id: "7",
    limit: "10",
    pageToken: "p",
    folderId: "f",
    dateSortOrder: "asc",
  });
  assertEquals(out.nextPageToken, null);
});
