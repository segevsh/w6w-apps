import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/credential-update.ts";
import { CREDENTIAL, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("credential-update: PATCH sends only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ body: CREDENTIAL }]);
  await action.execute({
    credentialId: "c1",
    recipientId: "r1",
    recipientName: "Ada B",
    issueDate: "2026-11-01",
    customAttributes: { a: "b" },
  }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v1/credentials/c1");
  assertEquals(JSON.parse(calls[0].body!), {
    recipient: { id: "r1", name: "Ada B" },
    issueDate: "2026-11-01",
    customAttributes: { a: "b" },
  });
});

Deno.test("credential-update: clearExpiryDate sends an explicit null and wins over expiryDate", async () => {
  const { ctx, calls } = mockCtx([{ body: CREDENTIAL }]);
  await action.execute(
    { credentialId: "c1", clearExpiryDate: true, expiryDate: "2030-01-01" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { expiryDate: null });
});

Deno.test("credential-update: refuses an empty update and a recipient change missing id or name", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ credentialId: "c1" }, ctx),
    Error,
    "nothing to update",
  );
  await assertRejects(
    async () => await action.execute({ credentialId: "c1", recipientEmail: "x@y.z" }, ctx),
    Error,
    "recipientId and recipientName",
  );
  assertEquals(calls.length, 0);
});
