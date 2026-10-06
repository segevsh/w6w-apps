import { assertEquals } from "@std/assert";
import { mockEgnyteCtx } from "../_helpers.ts";
import action from "../../actions/link-list.ts";

Deno.test("link-list: GETs v2/links with mapped filters", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: { links: [], count: 0 } }]);
  const out = await action.execute({
    path: "/a",
    username: "jo",
    type: "file",
    accessibility: "anyone",
    createdAfter: "2026-01-01",
    createdBefore: "2026-02-01",
    offset: 5,
    count: 50,
  }, ctx);
  const u = new URL(calls[0].url);
  assertEquals(u.pathname, "/pubapi/v2/links");
  assertEquals(Object.fromEntries(u.searchParams), {
    path: "/a",
    username: "jo",
    type: "file",
    accessibility: "anyone",
    created_after: "2026-01-01",
    created_before: "2026-02-01",
    offset: "5",
    count: "50",
  });
  assertEquals(out, { links: [], count: 0 });
});

Deno.test("link-list: no filters means no query string", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: {} }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v2/links");
});
