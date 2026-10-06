import { assertEquals } from "@std/assert";
import action from "../../actions/identify-person.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("identify-person: GETs /v5/person/identify and returns the candidates", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: 200, matches: [{ match_score: 90, data: { id: "a" } }] },
  }]);
  const out = await action.execute!(
    {
      first_name: "sean",
      last_name: "thorne",
      company: "people data labs",
      include_if_matched: true,
    } as never,
    ctx,
  ) as { found: boolean; matches: unknown[] };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v5/person/identify");
  assertEquals(Object.fromEntries(url.searchParams), {
    first_name: "sean",
    last_name: "thorne",
    company: "people data labs",
    include_if_matched: "true",
  });
  assertEquals(out.found, true);
  assertEquals(out.matches.length, 1);
});

Deno.test("identify-person: 404 is found: false with no matches", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { status: 404, error: { type: ["not_found"] } } }]);
  const out = await action.execute!({ name: "zz" } as never, ctx) as Record<string, unknown>;
  assertEquals(out.found, false);
  assertEquals(out.matches, []);
});
