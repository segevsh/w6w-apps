import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/send-bulk-emails.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("send-bulk-emails: shapes messages (camelCase or vendor form) and returns reference ids", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, message: "ok", data: { reference_ids: ["r1", "r2"] } },
  }]);
  const out = await run(action, {
    subject: "Hi {{ first_name }}",
    html: "<p>{{ first_name }}</p>",
    tracking: false,
    messages: [
      { fromAddress: "m@d.com", fromName: "Me", to: "a@x.com", templateData: { first_name: "A" } },
      {
        from: { address: "o@d.com", display_name: "Offers" },
        to: ["b@x.com"],
        referenceId: "5f2b4c9d8a7e4f3b2c1d9e8f",
      },
    ],
  }, ctx);
  assertEquals(calls[0].url, "https://smtp.maileroo.com/api/v2/emails/bulk");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.messages[0], {
    from: { address: "m@d.com", display_name: "Me" },
    to: [{ address: "a@x.com" }],
    template_data: { first_name: "A" },
  });
  assertEquals(sent.messages[1].from, { address: "o@d.com", display_name: "Offers" });
  assertEquals(sent.messages[1].reference_id, "5f2b4c9d8a7e4f3b2c1d9e8f");
  assertEquals(sent.tracking, false);
  assertEquals(out.referenceIds, ["r1", "r2"]);
});

Deno.test("send-bulk-emails: validates locally (no messages, >500, no body source, bad template)", async () => {
  const { ctx, calls } = mockCtx();
  const m = { fromAddress: "m@d.com", to: "a@x.com" };
  await assertRejects(
    () => run(action, { subject: "s", html: "x", messages: [] }, ctx),
    Error,
    "messages is required",
  );
  await assertRejects(
    () => run(action, { subject: "s", html: "x", messages: Array(501).fill(m) }, ctx),
    Error,
    "500",
  );
  await assertRejects(
    () => run(action, { subject: "s", messages: [m] }, ctx),
    Error,
    "templateId, html or plain",
  );
  await assertRejects(
    () => run(action, { subject: "s", templateId: 1.5, messages: [m] }, ctx),
    Error,
    "templateId",
  );
  assertEquals(calls.length, 0);
});
