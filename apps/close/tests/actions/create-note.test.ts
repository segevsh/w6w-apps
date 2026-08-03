import { assert, assertEquals } from "@std/assert";
import { description, mockCtx } from "../_helpers.ts";
import action from "../../actions/create-note.ts";

Deno.test("create-note: POSTs /activity/note/ with the lead id Close requires", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "acti_1" } }]);
  await action.execute({ leadId: "lead_1", note: "Spoke with the CFO." }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/activity/note/");
  assertEquals(JSON.parse(calls[0].body!), { lead_id: "lead_1", note: "Spoke with the CFO." });
  assertEquals(action.params?.find((p) => p.key === "leadId")?.required, true);
});

Deno.test("create-note: sends note_html when the HTML form is used", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ leadId: "lead_1", noteHtml: "<body><p>hi</p></body>" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).note_html, "<body><p>hi</p></body>");
});

Deno.test("create-note: warns when both note and noteHtml are supplied", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ leadId: "lead_1", note: "a", noteHtml: "<p>b</p>" }, ctx);
  assertEquals(logs[0].level, "warn");
});

Deno.test("create-note: carries attribution and backdating fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({
    leadId: "lead_1",
    note: "x",
    contactId: "cont_1",
    userId: "user_1",
    activityAt: "2026-01-05T10:00:00+00:00",
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.contact_id, "cont_1");
  assertEquals(sent.user_id, "user_1");
  assertEquals(sent.activity_at, "2026-01-05T10:00:00+00:00");
});

Deno.test("create-note: is not idempotent and says it sends nothing to anyone", () => {
  assertEquals(action.idempotent, false);
  assert(/does not send/i.test(description(action)));
});
