import { assertEquals, assertRejects } from "@std/assert";
import incidentTimelineGet from "../../actions/incident-timeline-get.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("incident-timeline-get: GET /api/v3/incidents/{incident_id}/timeline", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "23",
        "type": "timeline_item",
        "attributes": {
          "item_type": "comment",
          "at": "2026-10-06T00:00:00.000Z",
          "data": { "title": null },
        },
      }],
    },
  }]);
  const out = await incidentTimelineGet.execute({ "incident_id": "25" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/incidents/25/timeline");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.count, 1);
  assertEquals(out.hasMore, false);
  assertEquals((out.items as Array<Record<string, unknown>>)[0].item_type, "comment");
});

Deno.test("incident-timeline-get: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "23",
        "type": "timeline_item",
        "attributes": {
          "item_type": "comment",
          "at": "2026-10-06T00:00:00.000Z",
          "data": { "title": null },
        },
      }],
    },
  }]);
  await incidentTimelineGet.execute({ "incident_id": "25" }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("incident-timeline-get: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await incidentTimelineGet.execute({ "incident_id": "25" }, ctx)
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
