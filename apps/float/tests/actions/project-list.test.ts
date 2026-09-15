import { assertEquals } from "@std/assert";
import projectList from "../../actions/project-list.ts";
import { asListResult, mockCtx, paginationHeaders, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-list - GETs /projects and inverts billable into non_billable", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ project_id: 1 }],
    headers: paginationHeaders(),
  }]);
  const out = asListResult(await projectList.execute({ billable: "false" }, ctx));
  assertEquals(pathOf(calls[0].url), "/v3/projects");
  assertEquals(queryOf(calls[0].url).non_billable, "1");
  assertEquals(out.items, [{ project_id: 1 }]);
});

Deno.test("project-list - billable:true maps to non_billable=0", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [], headers: paginationHeaders() }]);
  await projectList.execute({ billable: "true" }, ctx);
  assertEquals(queryOf(calls[0].url).non_billable, "0");
});

Deno.test("project-list - omitting billable omits non_billable entirely", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [], headers: paginationHeaders() }]);
  await projectList.execute({}, ctx);
  assertEquals("non_billable" in queryOf(calls[0].url), false);
});
