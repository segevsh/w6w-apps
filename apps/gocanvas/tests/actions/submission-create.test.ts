import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/submission-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("submission-create: POST /api/v3/submissions with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 1 } }]);
  const out = await action.execute(
    {
      "formId": 346103,
      "guid": "G-1",
      "departmentId": 11942,
      "responses": [{ "entry_id": 1, "value": "Jane" }],
      "recipients": "a@b.co, c@d.co",
      "assignToUserId": 9,
    } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/submissions");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(bodyOf(calls[0]), {
    "guid": "G-1",
    "department_id": 11942,
    "form": { "id": 346103 },
    "responses": [{ "entry_id": 1, "value": "Jane" }],
    "recipients": ["a@b.co", "c@d.co"],
    "next_assigned_workflow_user_id": 9,
  });
  assertEquals(out, { "id": 1 });

  // The invocation id is the default guid, so a retried invocation is a duplicate to the vendor.
  const inv = mockCtx([{ body: { id: 2 } }], { invocationId: "inv-123" } as never);
  await action.execute({
    formGuid: "FG",
    formVersion: 4,
    responses: '[{"entry_guid":"e","value":"x"}]',
  }, inv.ctx);
  assertEquals(bodyOf(inv.calls[0]), {
    guid: "inv-123",
    form: { guid: "FG", version: 4 },
    responses: [{ entry_guid: "e", value: "x" }],
  });
  await assertRejects(
    async () => await action.execute({ responses: [{ entry_id: 1, value: "x" }] }, mockCtx().ctx),
    Error,
    "form id or a form GUID",
  );
  await assertRejects(
    async () => await action.execute({ formId: 1, responses: [] }, mockCtx().ctx),
    Error,
    "non-empty",
  );
  await assertRejects(
    async () => await action.execute({ formId: 1, responses: "{nope" }, mockCtx().ctx),
    Error,
    "not valid JSON",
  );
});
