import { assertEquals } from "@std/assert";
import { ACCOUNT_BASE, bodyOf, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/recipient-view-create.ts";

const INPUT = {
  envelopeId: "e1",
  returnUrl: "https://app.example.com/signed",
  email: "a@b.com",
  userName: "A B",
  clientUserId: "user-42",
};

Deno.test("recipient-view-create: POSTs a recipientViewRequest and returns the URL", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { url: "https://na4.docusign.net/Signing/x" },
  }]);
  const out = await action.execute(INPUT, ctx) as { url: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/envelopes/e1/views/recipient`);
  assertEquals(bodyOf(calls[0]), {
    returnUrl: "https://app.example.com/signed",
    email: "a@b.com",
    userName: "A B",
    clientUserId: "user-42",
    authenticationMethod: "none",
  });
  assertEquals(out.url, "https://na4.docusign.net/Signing/x");
});

Deno.test("recipient-view-create: clientUserId is required — it is what makes a recipient embedded", () => {
  assertEquals(action.params?.find((p) => p.key === "clientUserId")?.required, true);
  assertEquals(action.params?.find((p) => p.key === "returnUrl")?.required, true);
  assertEquals(action.params?.find((p) => p.key === "email")?.required, true);
  assertEquals(action.params?.find((p) => p.key === "userName")?.required, true);
});

Deno.test("recipient-view-create: merges focus-view fields from additionalFields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    ...INPUT,
    recipientId: "1",
    authenticationMethod: "email",
    additionalFields:
      '{"frameAncestors":["https://my.site.com"],"messageOrigins":["https://apps.docusign.com"]}',
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.frameAncestors, ["https://my.site.com"]);
  assertEquals(body.messageOrigins, ["https://apps.docusign.com"]);
  assertEquals(body.recipientId, "1");
  assertEquals(body.authenticationMethod, "email");
});

Deno.test("recipient-view-create: additionalFields cannot override the explicit params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ ...INPUT, additionalFields: '{"email":"spoof@evil.com"}' }, ctx);
  assertEquals(bodyOf(calls[0]).email, "a@b.com");
});

Deno.test("recipient-view-create: is a non-idempotent perform — every call mints a new URL", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
