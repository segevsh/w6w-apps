import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import formCreate from "../../actions/form-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("form-create: POST /forms with workspaceId, name and only the fields given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "f9", name: "Contact" } }]);
  const out = await formCreate.execute({
    workspaceId: "w1",
    name: "Contact",
    notificationEmails: "a@x.com, b@x.com\nc@x.com",
    automaticSpamFilter: false,
    emailThreading: true,
    spamProtection: "TURNSTILE",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/public/v1/forms");
  assertEquals(JSON.parse(calls[0].body!), {
    workspaceId: "w1",
    name: "Contact",
    notificationEmails: ["a@x.com", "b@x.com", "c@x.com"],
    automaticSpamFilter: false,
    emailThreading: true,
    spamProtection: "TURNSTILE",
  });
  assertEquals(out, { id: "f9", name: "Contact" });
});

test("form-create: blank optional fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await formCreate.execute({ workspaceId: "w1", name: "N", description: "", webhookUrl: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { workspaceId: "w1", name: "N" });
});

test("form-create: non-idempotent, and a missing workspace is refused", async () => {
  assertEquals(formCreate.idempotent, false);
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await formCreate.execute({ workspaceId: "", name: "N" }, ctx));
  assertEquals(calls.length, 0);
});
