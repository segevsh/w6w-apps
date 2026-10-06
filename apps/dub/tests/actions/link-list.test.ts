import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/link-list.ts";
import { mockCtx } from "../_helpers.ts";

const page = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `link_${i + 1}` }));

Deno.test("link-list: GETs /links with filters and the cursor, never the deprecated `page`", async () => {
  const { ctx, calls } = mockCtx([{ body: page(2) }]);
  await action.execute!({
    domain: "dub.sh",
    search: "promo",
    tagIds: "a, b",
    showArchived: true,
    pageSize: 5,
    startingAfter: "link_9",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.dub.co/links");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    domain: "dub.sh",
    search: "promo",
    tagIds: "a,b",
    showArchived: "true",
    pageSize: "5",
    startingAfter: "link_9",
  });
  assert(!url.searchParams.has("page"));
  assert(!action.params!.some((p) => p.key === "page"), "deprecated param not exposed");
});

Deno.test("link-list: a full page returns the last ID as nextCursor", async () => {
  const { ctx } = mockCtx([{ body: page(3) }]);
  const out = await action.execute!({ pageSize: 3 }, ctx);
  assertEquals(out, { links: page(3), nextCursor: "link_3" });
});

Deno.test("link-list: a short page has no nextCursor", async () => {
  const { ctx } = mockCtx([{ body: page(2) }]);
  const out = await action.execute!({ pageSize: 3 }, ctx);
  assertEquals(out, { links: page(2) });
});

Deno.test("link-list: sends no authorization header and surfaces errors", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute!({}, ctx);
  assert(!("authorization" in calls[0].headers));
  const failing = mockCtx([{
    status: 403,
    body: { error: { code: "forbidden", message: "no links.read" } },
  }]);
  await assertRejects(
    async () => await action.execute!({}, failing.ctx),
    Error,
    "no links.read (forbidden)",
  );
});
