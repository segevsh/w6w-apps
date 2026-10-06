import { assertEquals, assertRejects } from "@std/assert";
import projectReport from "../../actions/project-report.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-report: GET /dashboards/projects with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ "id": 1 }, { "id": 2 }] }]);
  const out = await projectReport.execute({
    "dateGte": "2020-01-01",
    "dateLte": "2021-01-01",
    "projectId": "as:1",
    "clientId": 12345,
    "memberId": 7890,
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/dashboards/projects");
  assertEquals(queryOf(calls[0].url), {
    "date.gte": "2020-01-01",
    "date.lte": "2021-01-01",
    "projectId": "as:1",
    "clientId": "12345",
    "memberId": "7890",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "items": [{ "id": 1 }, { "id": 2 }], "count": 2, "nextPage": null });
});

Deno.test("project-report: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        projectReport.execute({
          "dateGte": "2020-01-01",
          "dateLte": "2021-01-01",
          "projectId": "as:1",
          "clientId": 12345,
          "memberId": 7890,
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("project-report: declares search", () => {
  assertEquals(projectReport.type, "search");
});
