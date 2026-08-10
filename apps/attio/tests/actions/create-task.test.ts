import { assertEquals } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import createTask, { assigneeRefs, TASK_CONTENT_MAX } from "../../actions/create-task.ts";

/**
 * Every one of the six data fields is `required` in Attio's schema, including
 * the ones a user leaves blank. Omitting them is a 400, so blanks become
 * explicit neutral values — this is why `compact()` is not used here.
 */
Deno.test("create-task: sends ALL six required fields, filling blanks with neutral values", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: { task_id: "t1" } } } }]);
  await createTask.execute({ content: "Follow up on current software solutions" }, ctx);

  assertEquals(calls[0].url, "https://api.attio.com/v2/tasks");
  assertEquals(JSON.parse(calls[0].body!), {
    data: {
      content: "Follow up on current software solutions",
      format: "plaintext",
      deadline_at: null,
      is_completed: false,
      linked_records: [],
      assignees: [],
    },
  });
});

Deno.test("create-task: format is not a param — the enum has one member", () => {
  assertEquals((createTask.params ?? []).some((p) => p.key === "format"), false);
});

Deno.test("create-task: enforces the documented 2000-character content limit", () => {
  assertEquals(TASK_CONTENT_MAX, 2000);
  assertEquals(param(createTask, "content").validation?.maxLength, 2000);
});

Deno.test("create-task: passes linked_records through in Attio's shorthand string form", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: {} } }]);
  await createTask.execute({
    content: "Chase",
    linkedRecords: ["person@company.com", "fundstack.com"],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).data.linked_records, [
    "person@company.com",
    "fundstack.com",
  ]);
});

Deno.test("assigneeRefs: an email becomes workspace_member_email_address", () => {
  assertEquals(assigneeRefs(["alice@attio.com"]), [
    { workspace_member_email_address: "alice@attio.com" },
  ]);
});

Deno.test("assigneeRefs: a UUID becomes the explicit actor reference", () => {
  assertEquals(assigneeRefs(["50cf242c-7fa3-4cad-87d0-75b1af71c57b"]), [
    {
      referenced_actor_type: "workspace-member",
      referenced_actor_id: "50cf242c-7fa3-4cad-87d0-75b1af71c57b",
    },
  ]);
});

Deno.test("assigneeRefs: a mixed list produces the right shape per entry", () => {
  assertEquals(assigneeRefs(["a@x.com", "id-1"]).length, 2);
  assertEquals(assigneeRefs(undefined), []);
});
