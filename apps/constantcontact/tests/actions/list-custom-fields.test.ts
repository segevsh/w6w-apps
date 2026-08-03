import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-custom-fields.ts";

Deno.test("list-custom-fields: GETs /v3/contact_custom_fields with the default limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { custom_fields: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/contact_custom_fields");
  assertEquals(url.searchParams.get("limit"), "50");
});

Deno.test("list-custom-fields: forwards limit and cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: { custom_fields: [] } }]);
  await action.execute!({ limit: 100, cursor: "abc" }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("limit"), "100");
  assertEquals(p.get("cursor"), "abc");
});

Deno.test("list-custom-fields: caps the limit at 100, not 500", () => {
  const limit = (action.params ?? []).find((p) => p.key === "limit");
  assertEquals(limit?.validation?.max, 100);
});

Deno.test("list-custom-fields: lifts the cursor out of _links.next", async () => {
  const { ctx } = mockCtx([{
    body: {
      custom_fields: [{ custom_field_id: "f1", name: "membership_level" }],
      _links: { next: { href: "/v3/contact_custom_fields?limit=50&cursor=NEXT" } },
    },
  }]);
  const out = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(out.next_cursor, "NEXT");
  assert(Array.isArray(out.custom_fields));
});
