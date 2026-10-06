import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/clean-location.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("clean-location: GETs /v5/location/clean", async () => {
  const { ctx, calls } = mockCtx([{
    body: { name: "portland, oregon, united states", geo: "45.52,-122.67" },
  }]);
  const out = await action.execute!({ location: "Portland OR" } as never, ctx) as Record<
    string,
    unknown
  >;
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v5/location/clean");
  assertEquals(Object.fromEntries(url.searchParams), { location: "Portland OR" });
  assertEquals(out.found, true);
  assertEquals(out.geo, "45.52,-122.67");
});

Deno.test("clean-location: location is required; 404 is found: false", async () => {
  await assertRejects(
    async () => await action.execute!({ location: " " } as never, mockCtx([]).ctx),
    Error,
    "location is required",
  );
  const { ctx } = mockCtx([{ status: 404, body: { status: 404, error: { type: ["not_found"] } } }]);
  assertEquals(
    ((await action.execute!({ location: "zz" }, ctx)) as Record<string, unknown>).found,
    false,
  );
});
