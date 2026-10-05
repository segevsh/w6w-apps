import { assertEquals, assertRejects } from "@std/assert";
import projectDateUpdate from "../../actions/project-date-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "projectId": "x-projectId",
  "dateId": "x-dateId",
  "dateLabel": "x-dateLabel",
  "projectDate": "2026-10-05",
  "projectEndDate": "2026-10-05",
  "projectTimeStart": "x-projectTimeStart",
  "projectTimeEnd": "x-projectTimeEnd",
  "location": "x-location",
  "locationLabel": "x-locationLabel",
  "availabilityType": "busy",
};

Deno.test("project-date-update: sends PATCH /projects/{id}/dates/{date_id} with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await projectDateUpdate.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects/x-projectId/dates/x-dateId");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "date_label": "x-dateLabel",
    "project_date": "2026-10-05",
    "project_end_date": "2026-10-05",
    "project_time_start": "x-projectTimeStart",
    "project_time_end": "x-projectTimeEnd",
    "location": "x-location",
    "location_label": "x-locationLabel",
    "availability_type": "busy",
  });
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("project-date-update: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await projectDateUpdate.execute(
    { "projectId": "x-projectId", "dateId": "x-dateId" } as never,
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("project-date-update: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await projectDateUpdate.execute({ ...INPUT, ...{ "projectId": "a/b", "dateId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("project-date-update: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await projectDateUpdate.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
