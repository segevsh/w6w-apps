import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-create.ts";

Deno.test("project-create: POSTs to /2.0/pr_project with mapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, name: "Relaunch" } }]);
  const result = await action.execute!({
    contactId: 14,
    name: "Relaunch",
    projectTypeId: 1,
    stateId: 1,
    userId: 1,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/pr_project");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.contact_id, 14);
  assertEquals(body.name, "Relaunch");
  assertEquals(body.pr_project_type_id, 1);
  assertEquals(body.pr_state_id, 1);
  assertEquals(body.user_id, 1);
  assertEquals(result, { id: 1, name: "Relaunch" });
});
