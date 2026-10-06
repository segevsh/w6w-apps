import { assert, assertEquals, assertRejects } from "@std/assert";
import jobCreate from "../../actions/job-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-create: sends POST /v2/projects/project%201%2Fx/jobs", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "n" } }]);
  const input = {
    "projectId": "project 1/x",
    "name": "v_name",
    "branch": "v_branch",
    "sourceLocaleId": "v_sourceLocaleId",
    "briefing": "v_briefing",
    "dueDate": "2026-01-01T00:00:00Z",
    "ticketUrl": "v_ticketUrl",
    "tags": "a,b",
    "translationKeyIds": "a,b",
    "targetLocaleIds": "a,b",
    "jobTemplateId": "v_jobTemplateId",
  };
  const out = await jobCreate.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/projects/project%201%2Fx/jobs");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "name": "v_name",
    "branch": "v_branch",
    "source_locale_id": "v_sourceLocaleId",
    "briefing": "v_briefing",
    "due_date": "2026-01-01T00:00:00Z",
    "ticket_url": "v_ticketUrl",
    "tags": ["a", "b"],
    "translation_key_ids": ["a", "b"],
    "target_locale_ids": ["a", "b"],
    "job_template_id": "v_jobTemplateId",
  });
  assertEquals(out.id, "x1");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("job-create: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await jobCreate.execute({
      "projectId": "project 1/x",
      "name": "v_name",
      "branch": "v_branch",
      "sourceLocaleId": "v_sourceLocaleId",
      "briefing": "v_briefing",
      "dueDate": "2026-01-01T00:00:00Z",
      "ticketUrl": "v_ticketUrl",
      "tags": "a,b",
      "translationKeyIds": "a,b",
      "targetLocaleIds": "a,b",
      "jobTemplateId": "v_jobTemplateId",
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("job-create: declares key, type and every param it reads", () => {
  assertEquals(jobCreate.key, "job-create");
  assertEquals(jobCreate.type, "perform");
  const declared = new Set((jobCreate.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
      "name": "v_name",
      "branch": "v_branch",
      "sourceLocaleId": "v_sourceLocaleId",
      "briefing": "v_briefing",
      "dueDate": "2026-01-01T00:00:00Z",
      "ticketUrl": "v_ticketUrl",
      "tags": "a,b",
      "translationKeyIds": "a,b",
      "targetLocaleIds": "a,b",
      "jobTemplateId": "v_jobTemplateId",
    })
  ) assert(declared.has(k), `missing param ${k}`);
});
