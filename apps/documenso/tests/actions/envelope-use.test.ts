import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/envelope-use.ts";

const conn = { display: {} };
const RECIPIENTS = '[{"id":1,"email":"ada@example.com","name":"Ada Lovelace"}]';

/** The multipart request goes out without a hand-written content-type. */
Deno.test("envelope-use: POSTs a form payload to the use endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "e1", status: "DRAFT" } }], conn);
  await action.execute!({ envelopeId: "tpl1", recipients: RECIPIENTS }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.documenso.com/api/v2/envelope/use");
  assertEquals(calls[0].headers["content-type"], undefined);
});

/** A template maps its placeholders by numeric id, not name or position. */
Deno.test("envelope-use: a recipient without an id is refused before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const err = await assertRejects(
    async () =>
      await action.execute!({
        envelopeId: "tpl1",
        recipients: '[{"email":"ada@example.com","name":"Ada"}]',
      }, ctx),
    Error,
  );
  assert(err.message.includes("maps its placeholders by numeric id"), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("envelope-use: a recipient without an email is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ envelopeId: "tpl1", recipients: '[{"id":1}]' }, ctx),
    Error,
    "recipient 0 has no `email`",
  );
  assertEquals(calls.length, 0);
});

/** Sending immediately is the difference between a draft and a contract sent. */
Deno.test("envelope-use: sending immediately is opt-in and logged at warn", async () => {
  const draft = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ envelopeId: "tpl1", recipients: RECIPIENTS }, draft.ctx);
  assertEquals(draft.logs[0].level, "info");

  const sent = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({
    envelopeId: "tpl1",
    recipients: RECIPIENTS,
    distributeDocument: true,
  }, sent.ctx);
  assertEquals(sent.logs[0].level, "warn");
  assertEquals((sent.logs[0].data as { sending: boolean }).sending, true);
});

Deno.test("envelope-use: an empty or non-array recipients value is refused", async () => {
  for (const recipients of ["[]", '{"id":1}']) {
    const { ctx, calls } = mockCtx([], conn);
    await assertRejects(
      async () => await action.execute!({ envelopeId: "tpl1", recipients }, ctx),
      Error,
      "`recipients` is required",
    );
    assertEquals(calls.length, 0);
  }
});

Deno.test("envelope-use: a template id is required, and it creates a new envelope each time", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ recipients: RECIPIENTS }, ctx),
    Error,
    "`envelopeId` is required",
  );
  assertEquals(calls.length, 0);
  assertEquals(action.idempotent, false);
});
