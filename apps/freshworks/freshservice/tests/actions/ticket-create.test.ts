import { assertEquals } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/ticket-create.ts";

Deno.test("ticket-create: POSTs /tickets and unwraps the `ticket` envelope", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { ticket: { id: 1 } } }]);
  const out = await action.execute({ subject: "Broken", description: "It broke" }, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/tickets");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { subject: "Broken", description: "It broke" });
  assertEquals(out, { id: 1 });
});

Deno.test("ticket-create: sends requesterEmail as email and requesterId as requester_id", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: {} }]);
  await action.execute({ subject: "s", description: "d", requesterEmail: "jo@acme.test" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).email, "jo@acme.test");

  const withId = mockFreshserviceCtx([{ body: {} }]);
  await action.execute({ subject: "s", description: "d", requesterId: 42 }, withId.ctx);
  assertEquals(JSON.parse(withId.calls[0].body!).requester_id, 42);
});

Deno.test("ticket-create: splits tags and ccEmails on commas", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: {} }]);
  await action.execute(
    { subject: "s", description: "d", tags: "vip, urgent", ccEmails: "a@b.c, d@e.f" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).tags, ["vip", "urgent"]);
  assertEquals(JSON.parse(calls[0].body!).cc_emails, ["a@b.c", "d@e.f"]);
});

Deno.test("ticket-create: carries the ITSM fields Freshdesk has no equivalent of", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: {} }]);
  await action.execute(
    { subject: "s", description: "d", urgency: 3, impact: 2, departmentId: 9, workspaceId: 3 },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.urgency, 3);
  assertEquals(body.impact, 2);
  assertEquals(body.department_id, 9);
  assertEquals(body.workspace_id, 3);
});

Deno.test("ticket-create: parses the custom-fields JSON param", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: {} }]);
  await action.execute(
    { subject: "s", description: "d", customFields: { custom_text: "v" } },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).custom_fields, { custom_text: "v" });
});

Deno.test("ticket-create: source options match Freshservice's own table, not Freshdesk's", () => {
  const source = action.params?.find((p) => p.key === "source");
  const byValue = Object.fromEntries(
    (source?.options as { value: number; label: string }[]).map((o) => [o.value, o.label]),
  );
  // 7 is AWS CloudWatch here; in Freshdesk 7 is Chat. Getting this wrong would
  // silently mislabel every ticket.
  assertEquals(byValue[7], "AWS CloudWatch");
  assertEquals(byValue[4], "Chat");
  assertEquals(byValue[15], "MS Teams");
});
