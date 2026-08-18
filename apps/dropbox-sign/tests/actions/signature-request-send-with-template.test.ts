import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/signature-request-send-with-template.ts";

const SIGNERS = '[{"role":"Client","email_address":"ada@example.com","name":"Ada"}]';

Deno.test("send-with-template: POSTs template ids and role-bearing signers", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { signature_request: {} } }]);
  await action.execute!({ templateIds: "t1, t2", signers: SIGNERS }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.hellosign.com/v3/signature_request/send_with_template",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.template_ids, ["t1", "t2"]);
  assertEquals(body.signers[0].role, "Client");
});

/**
 * A template matches signers by role. A role-less signer is not a 400 waiting to
 * happen — it is a request that can land on the wrong role — so it is refused
 * locally.
 */
Deno.test("send-with-template: a signer without a role never reaches the wire", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!({
        templateIds: "t1",
        signers: '[{"email_address":"ada@example.com","name":"Ada"}]',
      }, ctx),
    Error,
    "signer 0 has no `role`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-with-template: test_mode is sent explicitly either way", async () => {
  const off = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ templateIds: "t1", signers: SIGNERS }, off.ctx);
  assertEquals(JSON.parse(off.calls[0].body!).test_mode, false);

  const on = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ templateIds: "t1", signers: SIGNERS, testMode: true }, on.ctx);
  assertEquals(JSON.parse(on.calls[0].body!).test_mode, true);
});

Deno.test("send-with-template: CC roles and custom fields pass through as given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({
    templateIds: "t1",
    signers: SIGNERS,
    ccs: '[{"role":"Accounting","email_address":"ap@example.com"}]',
    customFields: '[{"name":"Cost","value":"$20,000"}]',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.ccs[0].role, "Accounting");
  assertEquals(body.custom_fields[0].name, "Cost");
});

Deno.test("send-with-template: a template id is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ signers: SIGNERS }, ctx),
    Error,
    "`templateIds` is required",
  );
  assertEquals(calls.length, 0);
});
