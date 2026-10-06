import { assertEquals, assertRejects } from "@std/assert";
import formUpdate from "../../actions/form-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-update: PATCH sends only what was filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "f1" } }]);
  await formUpdate.execute({ formId: "f1", name: "Renamed", emailThreading: false }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/public/v1/forms/f1");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed", emailThreading: false });
});

Deno.test("form-update: clearFields sends null and wins over a value", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await formUpdate.execute({
    formId: "f1",
    webhookUrl: "https://x.example/hook",
    clearFields: ["webhookUrl", "spamProtection"],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { webhookUrl: null, spamProtection: null });
});

Deno.test("form-update: clearFields accepts a comma string, and refuses unknown fields", async () => {
  const ok = mockCtx([{ body: {} }]);
  await formUpdate.execute({ formId: "f1", clearFields: "description, slackChannel" }, ok.ctx);
  assertEquals(JSON.parse(ok.calls[0].body!), { description: null, slackChannel: null });
  const bad = mockCtx([]);
  await assertRejects(
    async () => await formUpdate.execute({ formId: "f1", clearFields: ["name"] }, bad.ctx),
    Error,
    "cannot be cleared",
  );
  assertEquals(bad.calls.length, 0);
});
