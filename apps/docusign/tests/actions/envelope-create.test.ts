import { assertEquals, assertThrows } from "@std/assert";
import { ACCOUNT_BASE, bodyOf, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/envelope-create.ts";

const DOCUMENTS =
  '[{"documentBase64":"QQ==","name":"NDA.pdf","fileExtension":"pdf","documentId":"1"}]';
const RECIPIENTS = '{"signers":[{"email":"a@b.com","name":"A B","recipientId":"1"}]}';

Deno.test("envelope-create: POSTs an envelopeDefinition to /envelopes", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { envelopeId: "e1", status: "created" } }]);
  const out = await action.execute({
    emailSubject: "Please sign",
    documents: DOCUMENTS,
    recipients: RECIPIENTS,
  }, ctx) as { envelopeId: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/envelopes`);
  assertEquals(bodyOf(calls[0]), {
    emailSubject: "Please sign",
    status: "created",
    documents: JSON.parse(DOCUMENTS),
    recipients: JSON.parse(RECIPIENTS),
  });
  assertEquals(out.envelopeId, "e1");
});

Deno.test("envelope-create: defaults to a draft, never sending unasked", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ emailSubject: "s", documents: DOCUMENTS, recipients: RECIPIENTS }, ctx);
  assertEquals(bodyOf(calls[0]).status, "created");
  assertEquals(action.params?.find((p) => p.key === "status")?.default, "created");
});

Deno.test("envelope-create: status `sent` goes out for signature immediately", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    emailSubject: "s",
    emailBlurb: "hello",
    status: "sent",
    documents: DOCUMENTS,
    recipients: RECIPIENTS,
  }, ctx);
  assertEquals(bodyOf(calls[0]).status, "sent");
  assertEquals(bodyOf(calls[0]).emailBlurb, "hello");
});

Deno.test("envelope-create: merges additionalFields but never lets them override the core fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    emailSubject: "real subject",
    documents: DOCUMENTS,
    recipients: RECIPIENTS,
    additionalFields: '{"brandId":"b1","emailSubject":"overridden"}',
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.brandId, "b1");
  assertEquals(body.emailSubject, "real subject");
});

Deno.test("envelope-create: rejects malformed documents/recipients with the param name", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () => action.execute({ emailSubject: "s", documents: "{}", recipients: RECIPIENTS }, ctx),
    Error,
    "`documents` must be a JSON array.",
  );
  assertThrows(
    () => action.execute({ emailSubject: "s", documents: DOCUMENTS, recipients: "[]" }, ctx),
    Error,
    "`recipients` must be a JSON object.",
  );
});

Deno.test("envelope-create: is a non-idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
