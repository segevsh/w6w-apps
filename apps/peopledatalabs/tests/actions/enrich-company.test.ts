import { assertEquals } from "@std/assert";
import action from "../../actions/enrich-company.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("enrich-company: GETs /v5/company/enrich and keeps the flat profile", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: 200, likelihood: 6, name: "google", id: "g1" },
  }]);
  const out = await action.execute!(
    { website: "google.com", min_likelihood: 4, titlecase: true } as never,
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v5/company/enrich");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    website: "google.com",
    min_likelihood: "4",
    titlecase: "true",
  });
  assertEquals(out, { found: true, status: 200, likelihood: 6, name: "google", id: "g1" });
});

Deno.test("enrich-company: 404 is found: false", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { status: 404, error: { type: ["not_found"] } } }]);
  const out = await action.execute!({ name: "zzz" } as never, ctx) as Record<string, unknown>;
  assertEquals(out.found, false);
  assertEquals(out.status, 404);
});
