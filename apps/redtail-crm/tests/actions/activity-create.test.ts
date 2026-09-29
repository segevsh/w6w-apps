import { assert, assertEquals } from "@std/assert";
import activityCreate from "../../actions/activity-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("activity-create: POSTs /activities and links a contact via linked_contacts", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { activity: { id: 231, subject: "Call" } },
  }]);
  const out = await activityCreate.execute({
    subject: "Call",
    startDate: "2020-11-05T21:15:00Z",
    contactId: 42,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/activities");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.subject, "Call");
  assertEquals(body.linked_contacts, [{ contact_id: 42 }]);
  assertEquals(out.activity.id, 231);
});

Deno.test("activity-create: omits linked_contacts when no contact is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { activity: { id: 1 } } }]);
  await activityCreate.execute({ subject: "Task" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assert(!("linked_contacts" in body));
});
