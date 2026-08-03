import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-contact-lists.ts";

Deno.test("list-contact-lists: GETs /v3/contact_lists with the default limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { lists: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/contact_lists");
  assertEquals(url.searchParams.get("limit"), "50");
});

Deno.test("list-contact-lists: forwards the filters under their API names", async () => {
  const { ctx, calls } = mockCtx([{ body: { lists: [] } }]);
  await action.execute!({
    name: "Newsletter",
    status: "active",
    channelType: "sms",
    includeMembershipCount: "active",
    limit: 100,
    cursor: "abc",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("name"), "Newsletter");
  assertEquals(p.get("status"), "active");
  assertEquals(p.get("channel_type"), "sms");
  assertEquals(p.get("include_membership_count"), "active");
  assertEquals(p.get("limit"), "100");
  assertEquals(p.get("cursor"), "abc");
});

Deno.test("list-contact-lists: include_count is sent only when asked for", async () => {
  const { ctx, calls } = mockCtx([{ body: { lists: [] } }, { body: { lists: [] } }]);
  await action.execute!({ includeCount: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("include_count"), "true");
  await action.execute!({ includeCount: false }, ctx);
  assert(!new URL(calls[1].url).searchParams.has("include_count"));
});

Deno.test("list-contact-lists: lifts the cursor out of _links.next", async () => {
  const { ctx } = mockCtx([{
    body: { lists: [], _links: { next: { href: "/v3/contact_lists?limit=50&cursor=NEXT" } } },
  }]);
  const out = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(out.next_cursor, "NEXT");
});
