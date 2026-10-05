import { assertEquals, assertRejects } from "@std/assert";
import projectCreate from "../../actions/project-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "name": "x-name",
  "projectDate": "2026-10-05",
  "projectEndDate": "2026-10-05",
  "projectTimeStart": "x-projectTimeStart",
  "projectTimeEnd": "x-projectTimeEnd",
  "projectTimezone": "x-projectTimezone",
  "projectLocation": "x-projectLocation",
  "projectDetails": "x-projectDetails",
  "guestCount": 5,
  "budget": 5,
  "availabilityType": "busy",
  "projectTypeId": "x-projectTypeId",
  "leadSourceId": "x-leadSourceId",
  "leadSourceOpenText": "x-leadSourceOpenText",
  "include": ["workspaces", "custom_fields"],
  "maxWorkspaces": 5,
  "maxCustomFields": 5,
};

Deno.test("project-create: sends POST /projects with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "r1", marker: "m" } }]);
  const out = await projectCreate.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "x-name",
    "project_date": "2026-10-05",
    "project_end_date": "2026-10-05",
    "project_time_start": "x-projectTimeStart",
    "project_time_end": "x-projectTimeEnd",
    "project_timezone": "x-projectTimezone",
    "project_location": "x-projectLocation",
    "project_details": "x-projectDetails",
    "guest_count": 5,
    "budget": 5,
    "availability_type": "busy",
    "project_type_id": "x-projectTypeId",
    "lead_source_id": "x-leadSourceId",
    "lead_source_open_text": "x-leadSourceOpenText",
    "include": ["workspaces", "custom_fields"],
    "max_workspaces": 5,
    "max_custom_fields": 5,
  });
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("project-create: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "r1", marker: "m" } }]);
  await projectCreate.execute({} as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("project-create: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await projectCreate.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
