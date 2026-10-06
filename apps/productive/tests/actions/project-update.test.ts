import { assertEquals, assertRejects } from "@std/assert";
import projectUpdate from "../../actions/project-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-update: PATCH /projects/{id} sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "projects", "attributes": { "name": "x" } } },
  }]);
  const out = await projectUpdate.execute({
    "id": "42",
    "name": "sample name",
    "projectTypeId": 1,
    "companyId": 7,
    "projectManagerId": 7,
    "workflowId": 7,
    "projectColorId": 7,
    "customFields": '{"1": "x"}',
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/projects/42");
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

Deno.test("project-update: only the fields set are sent", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "projects", "attributes": { "name": "x" } } },
  }]);
  await projectUpdate.execute({ id: "42", name: "sample name" }, ctx);
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: { type: "projects", attributes: { "name": "sample name" } },
  });
});

Deno.test("project-update: naming no field to change fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(projectUpdate.execute({ id: "42" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("at least one field"), true, err.message);
  assertEquals(calls.length, 0);
});

Deno.test("project-update: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("404", "not_found", "Not Found", "Resource not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(projectUpdate.execute({ id: "42", name: "sample name" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Resource not found"), true, err.message);
});

Deno.test("project-update: declares perform and idempotent=true", () => {
  assertEquals(projectUpdate.type, "perform");
  assertEquals(projectUpdate.idempotent, true);
  assertEquals(projectUpdate.key, "project-update");
});
