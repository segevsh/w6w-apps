import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/send-email.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("send-email: posts the vendor body to /emails on the Email API", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      success: true,
      message: "The email has been scheduled for delivery.",
      data: { reference_id: "c843204e3af03193bd14f339" },
    },
  }]);
  const out = await run(action, {
    fromAddress: "me@d.com",
    fromName: "Me",
    to: "Jane <j@x.com>, k@x.com",
    cc: "c@x.com",
    subject: "Hi",
    html: "<p>Hi</p>",
    tracking: true,
    tags: { campaign: "w" },
    attachments: [{ file_name: "a.txt", content: "QQ==" }],
    scheduledAt: "in 2 hours",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://smtp.maileroo.com/api/v2/emails");
  assertEquals(JSON.parse(calls[0].body!), {
    from: { address: "me@d.com", display_name: "Me" },
    to: [{ address: "j@x.com", display_name: "Jane" }, { address: "k@x.com" }],
    cc: [{ address: "c@x.com" }],
    subject: "Hi",
    html: "<p>Hi</p>",
    tracking: true,
    tags: { campaign: "w" },
    attachments: [{ file_name: "a.txt", content: "QQ==" }],
    scheduled_at: "in 2 hours",
  });
  assertEquals(out, {
    referenceId: "c843204e3af03193bd14f339",
    message: "The email has been scheduled for delivery.",
  });
});

Deno.test("send-email: a plain-text-only email sends plain and no html", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { reference_id: "a".repeat(24) } },
  }]);
  await run(action, { fromAddress: "m@d.com", to: "a@x.com", subject: "s", plain: "hello" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.plain, "hello");
  assertEquals(sent.html, undefined);
});

Deno.test("send-email: needs a body, validates locally, and surfaces success:false", async () => {
  const { ctx, calls } = mockCtx([{
    status: 400,
    body: { success: false, message: "domain not verified" },
  }]);
  await assertRejects(
    () => run(action, { fromAddress: "m@d.com", to: "a@x.com", subject: "s" }, ctx),
    Error,
    "html or plain",
  );
  await assertRejects(
    () => run(action, { fromAddress: "m@d.com", to: "", subject: "s", html: "x" }, ctx),
    Error,
    "to is required",
  );
  assertEquals(calls.length, 0);
  await assertRejects(
    () => run(action, { fromAddress: "m@d.com", to: "a@x.com", subject: "s", html: "x" }, ctx),
    Error,
    "domain not verified",
  );
});
