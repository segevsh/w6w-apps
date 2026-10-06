import { assertEquals, assertRejects } from "@std/assert";
import credentialCreate from "../../actions/credential-create.ts";
import { CREDENTIAL, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("credential-create: POSTs groupId, nested recipient, dates and custom attributes", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREDENTIAL }]);
  const out = await credentialCreate.execute({
    groupId: "g1",
    recipientName: "Ada Lovelace",
    recipientEmail: " ada@example.com ",
    issueDate: "2026-10-06",
    expiryDate: "2027-10-06",
    customAttributes: '{"course":"Math"}',
  }, ctx) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/credentials");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    groupId: "g1",
    recipient: { name: "Ada Lovelace", email: "ada@example.com" },
    issueDate: "2026-10-06",
    expiryDate: "2027-10-06",
    customAttributes: { course: "Math" },
  });
  assertEquals(out.id, "c1");
});

Deno.test("credential-create: optional fields are omitted, not sent empty", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREDENTIAL }]);
  await credentialCreate.execute({ groupId: "g1", recipientName: "A", recipientEmail: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { groupId: "g1", recipient: { name: "A" } });
});

Deno.test("credential-create: a bad date fails before any request; it is not idempotent", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await credentialCreate.execute(
        { groupId: "g", recipientName: "A", issueDate: "06/10/2026" },
        ctx,
      ),
    Error,
    "YYYY-MM-DD",
  );
  assertEquals(calls.length, 0);
  assertEquals(credentialCreate.idempotent, false);
});
