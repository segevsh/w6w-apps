import { assertEquals, assertRejects } from "@std/assert";
import statusPageList from "../../actions/status-page-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("status-page-list: GET /api/v2/status-pages", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "101",
        "type": "status_page",
        "attributes": {
          "company_name": "Best company",
          "subdomain": "best-company",
          "aggregate_state": "operational",
        },
      }],
      "pagination": {
        "first": "https://incidents.betterstack.com/api/v2/status-pages?page=1",
        "last": "https://incidents.betterstack.com/api/v2/status-pages?page=3",
        "prev": null,
        "next": "https://incidents.betterstack.com/api/v2/status-pages?page=2",
      },
    },
  }]);
  const out = await statusPageList.execute({}, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/status-pages");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.count, 1);
  assertEquals(out.hasMore, true);
  assertEquals(out.nextPage, 2);
  assertEquals((out.items as Array<Record<string, unknown>>)[0].id, "101");
  assertEquals((out.items as Array<Record<string, unknown>>)[0].company_name, "Best company");
});

Deno.test("status-page-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "101",
        "type": "status_page",
        "attributes": {
          "company_name": "Best company",
          "subdomain": "best-company",
          "aggregate_state": "operational",
        },
      }],
      "pagination": {
        "first": "https://incidents.betterstack.com/api/v2/status-pages?page=1",
        "last": "https://incidents.betterstack.com/api/v2/status-pages?page=3",
        "prev": null,
        "next": "https://incidents.betterstack.com/api/v2/status-pages?page=2",
      },
    },
  }]);
  await statusPageList.execute({}, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("status-page-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () => await statusPageList.execute({}, ctx)) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
