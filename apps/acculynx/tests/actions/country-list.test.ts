import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/country-list.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("country-list: sends GET /acculynx/countries and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { items: [{ id: 1, name: "United States", abbreviation: "US" }] },
  }]);
  const out = await action.execute({ includes: "states" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/acculynx/countries");
  assertEquals(queryOf(calls[0].url), { includes: "states" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { items: [{ id: 1, name: "United States", abbreviation: "US" }] });
});

Deno.test("country-list: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () => await action.execute({ includes: "states" } as never, ctx),
    Error,
    "AccuLynx 404",
  );
});
