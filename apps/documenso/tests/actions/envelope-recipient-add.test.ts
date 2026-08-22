import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/envelope-recipient-add.ts";

const conn = { display: {} };

Deno.test("envelope-recipient-add: POSTs the recipients under `data`", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { recipients: [] } }], conn);
  await action.execute!({
    envelopeId: "e1",
    recipients: '[{"email":"ada@example.com","name":"Ada","role":"SIGNER","signingOrder":1}]',
  }, ctx);
  assertEquals(calls[0].url, "https://app.documenso.com/api/v2/envelope/recipient/create-many");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.envelopeId, "e1");
  assertEquals(body.data[0].signingOrder, 1);
});

Deno.test("envelope-recipient-add: a recipient without an email is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ envelopeId: "e1", recipients: '[{"name":"Ada"}]' }, ctx),
    Error,
    "recipient 0 has no `email`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("envelope-recipient-add: adds the people twice on a retry, and says so", () => {
  assertEquals(action.idempotent, false);
});
