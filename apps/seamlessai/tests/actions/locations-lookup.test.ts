import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/locations-lookup.ts";

const RESPONSE = { "data": [{ "location": "Austin, Texas, United States" }] };

Deno.test("locations-lookup: calls GET /api/client/v2/search/locations and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!(
    { "q": "Aust", "limit": 5, "types": ["city-state-country", "postcode"] },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/search/locations");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    "q": "Aust",
    "limit": "5",
    "types": "city-state-country,postcode",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("locations-lookup: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({ "q": "Aust" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), { "q": "Aust" });
  assertEquals(calls[0].body, null);
});

Deno.test("locations-lookup: refuses a missing q before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({} as never, ctx));
  assertEquals(calls.length, 0);
});

Deno.test("locations-lookup: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "q": "Aust",
        "limit": 5,
        "types": ["city-state-country", "postcode"],
      }, ctx),
    Error,
    "insufficientCredits",
  );
});
