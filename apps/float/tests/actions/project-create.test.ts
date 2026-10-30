import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import projectCreate from "../../actions/project-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("project-create - POSTs /projects, joining tags and inverting billable", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { project_id: 10, name: "Website Redesign" },
  }]);
  const out = await projectCreate.execute(
    { name: "Website Redesign", tags: ["digital", "pitch"], billable: false },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v3/projects");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Website Redesign");
  assertEquals(body.tags, ["digital", "pitch"]);
  assertEquals(body.non_billable, 1);
  assertEquals(out, { project_id: 10, name: "Website Redesign" });
});

test("project-create - extraFields can set project_team without a typed param for it", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await projectCreate.execute(
    { name: "X", extraFields: { project_team: { add: [{ people_id: 1, role_id: 2 }] } } },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.project_team, { add: [{ people_id: 1, role_id: 2 }] });
});
