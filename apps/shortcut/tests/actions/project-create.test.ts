import { assertEquals } from "@std/assert";
import projectCreate from "../../actions/project-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * `teamId` is required and must go over the wire as the legacy `team_id`
 * field name — it is a different id space from a Group's `group_id` UUID.
 */
Deno.test("project-create: posts name and team_id, dropping unset fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await projectCreate.execute({ name: "Website", teamId: 7 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3/projects");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Website", team_id: 7 });
});

Deno.test("project-create: forwards optional fields under their wire names", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await projectCreate.execute(
    { name: "Website", teamId: 7, color: "#6515dd", iterationLength: 14 },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!), {
    name: "Website",
    team_id: 7,
    color: "#6515dd",
    iteration_length: 14,
  });
});
