import { assertEquals, assertRejects } from "@std/assert";
import projectCreate from "../../actions/project-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-create: POST /projects sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "projects", "attributes": { "name": "x" } } },
  }]);
  const out = await projectCreate.execute({
    "name": "sample name",
    "projectTypeId": 1,
    "companyId": 7,
    "projectManagerId": 7,
    "workflowId": 7,
    "projectColorId": 7,
    "customFields": '{"1": "x"}',
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/projects");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: {
      type: "projects",
      attributes: {
        "name": "sample name",
        "project_type_id": 1,
        "company_id": 7,
        "project_manager_id": 7,
        "workflow_id": 7,
        "project_color_id": 7,
        "custom_fields": { "1": "x" },
      },
    },
  });
  assertEquals((out as Record<string, unknown>).id, "42");
});

Deno.test("project-create: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("422", "unprocessable_entity", "Invalid", "is invalid"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(projectCreate.execute({ "name": "sample name" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("422"), true, err.message);
  assertEquals(err.message.includes("is invalid"), true, err.message);
});

Deno.test("project-create: declares perform and idempotent=false", () => {
  assertEquals(projectCreate.type, "perform");
  assertEquals(projectCreate.idempotent, false);
  assertEquals(projectCreate.key, "project-create");
});
