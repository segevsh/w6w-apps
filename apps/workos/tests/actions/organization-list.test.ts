import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-list.ts";

/** How a self-serve signup gets matched against an enterprise account. */
Deno.test("organization-list: the domain filter sends repeated keys", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: "org_1" }], list_metadata: { after: null } } },
  ]);
  const result = await action.execute!({ domains: "acme.com, acme.co.uk" }, ctx) as {
    count: number;
  };
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("domains"), ["acme.com", "acme.co.uk"]);
  assertEquals(q.get("limit"), "50");
  assertEquals(result.count, 1);
});

Deno.test("organization-list: returnAll follows the cursor to the end", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: "a" }], list_metadata: { after: "a" } } },
    { status: 200, body: { data: [{ id: "b" }], list_metadata: { after: null } } },
  ]);
  const result = await action.execute!({ returnAll: true }, ctx) as { count: number };
  assertEquals(result.count, 2);
  assertEquals(calls.length, 2);
});

Deno.test("organization-list: the sort order reaches the wire", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [], list_metadata: { after: null } } },
  ]);
  await action.execute!({ order: "asc" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("order"), "asc");
});
