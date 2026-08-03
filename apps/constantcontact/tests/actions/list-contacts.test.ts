import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-contacts.ts";

Deno.test("list-contacts: GETs /v3/contacts with the default limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.hostname, "api.cc.email");
  assertEquals(url.pathname, "/v3/contacts");
  assertEquals(url.searchParams.get("limit"), "50");
});

Deno.test("list-contacts: forwards every filter under its snake_case name", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await action.execute!({
    status: "active,unsubscribed",
    email: "a@b.test",
    lists: "l1,l2",
    tags: "t1",
    include: "custom_fields,list_memberships",
    updatedAfter: "2026-01-01T00:00:00Z",
    updatedBefore: "2026-02-01T00:00:00Z",
    createdAfter: "2025-01-01T00:00:00Z",
    createdBefore: "2025-02-01T00:00:00Z",
    limit: 200,
    cursor: "abc",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("status"), "active,unsubscribed");
  assertEquals(p.get("email"), "a@b.test");
  assertEquals(p.get("lists"), "l1,l2");
  assertEquals(p.get("tags"), "t1");
  assertEquals(p.get("include"), "custom_fields,list_memberships");
  assertEquals(p.get("updated_after"), "2026-01-01T00:00:00Z");
  assertEquals(p.get("updated_before"), "2026-02-01T00:00:00Z");
  assertEquals(p.get("created_after"), "2025-01-01T00:00:00Z");
  assertEquals(p.get("created_before"), "2025-02-01T00:00:00Z");
  assertEquals(p.get("limit"), "200");
  assertEquals(p.get("cursor"), "abc");
});

Deno.test("list-contacts: include_count is sent only when asked for", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }, { body: { contacts: [] } }]);
  await action.execute!({ includeCount: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("include_count"), "true");
  await action.execute!({ includeCount: false }, ctx);
  assert(!new URL(calls[1].url).searchParams.has("include_count"));
});

Deno.test("list-contacts: maps segmentId to the API's segment_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [], status: "processing" } }]);
  await action.execute!({ segmentId: "42" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("segment_id"), "42");
});

Deno.test("list-contacts: omits every filter that was not supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await action.execute!({}, ctx);
  const p = new URL(calls[0].url).searchParams;
  for (const k of ["status", "email", "lists", "tags", "include", "cursor", "segment_id"]) {
    assert(!p.has(k), `${k} should not be sent`);
  }
});

Deno.test("list-contacts: lifts the cursor out of _links.next for the caller", async () => {
  const { ctx } = mockCtx([{
    body: {
      contacts: [{ contact_id: "c1" }],
      contacts_count: 1,
      _links: { next: { href: "/v3/contacts?limit=50&cursor=TOKEN" } },
    },
  }]);
  const out = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(out.next_cursor, "TOKEN");
  assertEquals(out.contacts_count, 1);
});

Deno.test("list-contacts: next_cursor is undefined on the last page", async () => {
  const { ctx } = mockCtx([{ body: { contacts: [] } }]);
  const out = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(out.next_cursor, undefined);
});
