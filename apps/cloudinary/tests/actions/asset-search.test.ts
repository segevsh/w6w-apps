import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/asset-search.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

/**
 * Cloudinary's docs give the endpoint as POST /search. Measured 2026-08-18 that
 * 404s; /resources/search is the path that routes.
 */
Deno.test("asset-search: posts to /resources/search, not the documented /search", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { resources: [], total_count: 0 } }], conn);
  await action.execute!({ expression: "tags=product" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1_1/acme/resources/search");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!).expression, "tags=product");
});

Deno.test("asset-search: sort_by becomes Cloudinary's array-of-objects shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { resources: [] } }], conn);
  await action.execute!(
    { expression: "x", sortBy: "created_at:desc,bytes:asc", withField: "tags,context" },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.sort_by, [{ created_at: "desc" }, { bytes: "asc" }]);
  assertEquals(sent.with_field, ["tags", "context"]);
});

Deno.test("asset-search: a field with no direction defaults to descending", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { resources: [] } }], conn);
  await action.execute!({ expression: "x", sortBy: "created_at" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).sort_by, [{ created_at: "desc" }]);
});

Deno.test("asset-search: pages with next_cursor when returning all", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { resources: [{ public_id: "a" }], next_cursor: "c2", total_count: 2 } },
    { status: 200, body: { resources: [{ public_id: "b" }], total_count: 2 } },
  ], conn);
  const out = await action.execute!({ expression: "x", returnAll: true }, ctx) as {
    resources: unknown[];
    total_count: number;
  };
  assertEquals(out.resources.length, 2);
  assertEquals(out.total_count, 2);
  assertEquals(JSON.parse(calls[1].body!).next_cursor, "c2");
});

Deno.test("asset-search: an empty expression is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ expression: " " }, ctx),
    Error,
    "expression",
  );
  assertEquals(calls.length, 0);
});

Deno.test("asset-search: the description warns the index is eventually consistent", () => {
  assert(/eventually consistent/i.test(action.description!), action.description);
});
