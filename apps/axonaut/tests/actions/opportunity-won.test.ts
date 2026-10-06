import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import opportunityWon from "../../actions/opportunity-won.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "opportunityId": 42, "date": "2026-10-06T09:00:00+02:00" };

Deno.test("opportunity-won: PATCH /api/v2/opportunities/42/won with the documented query, header and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1 } }]);
  const out = await opportunityWon.execute(INPUT as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/opportunities/42/won");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["page"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "date": "2026-10-06T09:00:00+02:00",
  });
  assertEquals(
    calls[0].headers["userapikey"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { id: 1 });
});

Deno.test("opportunity-won: an Axonaut error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden access") }]);
  const err = await assertRejects(async () => await opportunityWon.execute(INPUT as never, ctx));
  assertStringIncludes((err as Error).message, "Axonaut 403: Forbidden access");
});
