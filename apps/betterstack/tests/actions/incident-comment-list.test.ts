import { assertEquals, assertRejects } from "@std/assert";
import incidentCommentList from "../../actions/incident-comment-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("incident-comment-list: GET /api/v2/incidents/{incident_id}/comments", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "123",
        "type": "incident_comment",
        "attributes": { "content": "posted from API" },
      }],
    },
  }]);
  const out = await incidentCommentList.execute({ "incident_id": "25" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/incidents/25/comments");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.count, 1);
  assertEquals((out.items as Array<Record<string, unknown>>)[0].content, "posted from API");
});

Deno.test("incident-comment-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{
        "id": "123",
        "type": "incident_comment",
        "attributes": { "content": "posted from API" },
      }],
    },
  }]);
  await incidentCommentList.execute({ "incident_id": "25" }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("incident-comment-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await incidentCommentList.execute({ "incident_id": "25" }, ctx)
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
