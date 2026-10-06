import { assertEquals, assertRejects } from "@std/assert";
import statusPageGet from "../../actions/status-page-get.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("status-page-get: GET /api/v2/status-pages/{status_page_id}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": {
        "id": "123456789",
        "type": "status_page",
        "attributes": {
          "company_name": "Best company",
          "aggregate_state": "operational",
          "published": true,
        },
      },
    },
  }]);
  const out = await statusPageGet.execute({ "status_page_id": "123456789" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/status-pages/123456789");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.aggregate_state, "operational");
});

Deno.test("status-page-get: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": {
        "id": "123456789",
        "type": "status_page",
        "attributes": {
          "company_name": "Best company",
          "aggregate_state": "operational",
          "published": true,
        },
      },
    },
  }]);
  await statusPageGet.execute({ "status_page_id": "123456789" }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("status-page-get: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await statusPageGet.execute({ "status_page_id": "123456789" }, ctx)
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
