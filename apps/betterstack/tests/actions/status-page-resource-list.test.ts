import { assertEquals, assertRejects } from "@std/assert";
import statusPageResourceList from "../../actions/status-page-resource-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("status-page-resource-list: GET /api/v2/status-pages/{status_page_id}/resources", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "12345",
        "type": "status_page_resource",
        "attributes": {
          "public_name": "https://uptime.betterstack.com/",
          "status": "operational",
          "availability": 0.99963,
        },
      }],
      "pagination": {
        "first": "https://incidents.betterstack.com/api/v2/status-pages/123456/resources?page=1",
        "last": "https://incidents.betterstack.com/api/v2/status-pages/123456/resources?page=3",
        "prev": null,
        "next": "https://incidents.betterstack.com/api/v2/status-pages/123456/resources?page=2",
      },
    },
  }]);
  const out = await statusPageResourceList.execute(
    { "status_page_id": "123456", "per_page": 50 },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/status-pages/123456/resources");
  assertEquals(queryOf(calls[0].url), { "per_page": "50" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.count, 1);
  assertEquals((out.items as Array<Record<string, unknown>>)[0].status, "operational");
});

Deno.test("status-page-resource-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "12345",
        "type": "status_page_resource",
        "attributes": {
          "public_name": "https://uptime.betterstack.com/",
          "status": "operational",
          "availability": 0.99963,
        },
      }],
      "pagination": {
        "first": "https://incidents.betterstack.com/api/v2/status-pages/123456/resources?page=1",
        "last": "https://incidents.betterstack.com/api/v2/status-pages/123456/resources?page=3",
        "prev": null,
        "next": "https://incidents.betterstack.com/api/v2/status-pages/123456/resources?page=2",
      },
    },
  }]);
  await statusPageResourceList.execute({ "status_page_id": "123456", "per_page": 50 }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("status-page-resource-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await statusPageResourceList.execute({ "status_page_id": "123456", "per_page": 50 }, ctx)
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
