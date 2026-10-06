import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/state-list.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("state-list: sends GET /acculynx/countries/1/states and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { items: [{ id: 23, name: "Michigan", abbreviation: "MI" }] },
  }]);
  const out = await action.execute({ countryId: "1" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/acculynx/countries/1/states");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { items: [{ id: 23, name: "Michigan", abbreviation: "MI" }] });
});

Deno.test("state-list: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () => await action.execute({ countryId: "1" } as never, ctx),
    Error,
    "AccuLynx 404",
  );
});
