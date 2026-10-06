import { assertEquals } from "@std/assert";
import action from "../../actions/preview-enrich-person.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("preview-enrich-person: GETs /v5/person/enrich/preview", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: 200, likelihood: 6, data: { emails: true } },
  }]);
  const out = await action.execute!(
    { email: "sean@peopledatalabs.com", min_likelihood: 6 } as never,
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v5/person/enrich/preview");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    email: "sean@peopledatalabs.com",
    min_likelihood: "6",
  });
  assertEquals((out as Record<string, unknown>).found, true);
});

Deno.test("preview-enrich-person: 404 is found: false", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { status: 404, error: { type: "not_found" } } }]);
  const out = await action.execute!({ email: "x@y.z" } as never, ctx) as Record<string, unknown>;
  assertEquals(out.found, false);
});
