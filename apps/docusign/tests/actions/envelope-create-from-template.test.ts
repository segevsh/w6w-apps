import { assertEquals, assertThrows } from "@std/assert";
import { ACCOUNT_BASE, bodyOf, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/envelope-create-from-template.ts";

const ROLES = '[{"roleName":"Signer","email":"a@b.com","name":"A B"}]';

Deno.test("envelope-create-from-template: POSTs templateId + templateRoles to /envelopes", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { envelopeId: "e1" } }]);
  await action.execute({ templateId: "t1", templateRoles: ROLES }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/envelopes`);
  assertEquals(bodyOf(calls[0]), {
    templateId: "t1",
    status: "created",
    templateRoles: JSON.parse(ROLES),
  });
});

Deno.test("envelope-create-from-template: emailSubject is optional — the template supplies one", () => {
  const subject = action.params?.find((p) => p.key === "emailSubject");
  assertEquals(subject?.required, undefined);
  assertEquals(action.params?.find((p) => p.key === "templateId")?.required, true);
  assertEquals(action.params?.find((p) => p.key === "templateRoles")?.required, true);
});

Deno.test("envelope-create-from-template: sends the overrides when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    templateId: "t1",
    templateRoles: ROLES,
    emailSubject: "Override",
    emailBlurb: "note",
    status: "sent",
    additionalFields: '{"customFields":{"textCustomFields":[]}}',
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.emailSubject, "Override");
  assertEquals(body.emailBlurb, "note");
  assertEquals(body.status, "sent");
  assertEquals(body.customFields, { textCustomFields: [] });
});

Deno.test("envelope-create-from-template: rejects a non-array templateRoles", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () => action.execute({ templateId: "t1", templateRoles: "{}" }, ctx),
    Error,
    "`templateRoles` must be a JSON array.",
  );
});

Deno.test("envelope-create-from-template: is a non-idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
