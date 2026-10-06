import { assertEquals, assertRejects } from "@std/assert";
import statusReportList from "../../actions/status-report-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("status-report-list: GET /api/v2/status-pages/{status_page_id}/status-reports", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "12345",
        "type": "status_report",
        "attributes": {
          "title": "Status report title",
          "report_type": "manual",
          "aggregate_state": "downtime",
        },
      }],
      "pagination": {
        "first":
          "https://incidents.betterstack.com/api/v2/status-pages/123456/status-reports?page=1",
        "last":
          "https://incidents.betterstack.com/api/v2/status-pages/123456/status-reports?page=3",
        "prev": null,
        "next":
          "https://incidents.betterstack.com/api/v2/status-pages/123456/status-reports?page=2",
      },
    },
  }]);
  const out = await statusReportList.execute(
    { "status_page_id": "123456", "page": 1 },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/status-pages/123456/status-reports");
  assertEquals(queryOf(calls[0].url), { "page": "1" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.count, 1);
  assertEquals(out.nextPage, 2);
  assertEquals((out.items as Array<Record<string, unknown>>)[0].title, "Status report title");
});

Deno.test("status-report-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "12345",
        "type": "status_report",
        "attributes": {
          "title": "Status report title",
          "report_type": "manual",
          "aggregate_state": "downtime",
        },
      }],
      "pagination": {
        "first":
          "https://incidents.betterstack.com/api/v2/status-pages/123456/status-reports?page=1",
        "last":
          "https://incidents.betterstack.com/api/v2/status-pages/123456/status-reports?page=3",
        "prev": null,
        "next":
          "https://incidents.betterstack.com/api/v2/status-pages/123456/status-reports?page=2",
      },
    },
  }]);
  await statusReportList.execute({ "status_page_id": "123456", "page": 1 }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("status-report-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await statusReportList.execute({ "status_page_id": "123456", "page": 1 }, ctx)
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
