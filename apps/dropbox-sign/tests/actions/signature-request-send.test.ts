import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/signature-request-send.ts";

const SIGNERS = '[{"email_address":"ada@example.com","name":"Ada Lovelace"}]';
const FILE = "https://example.com/contract.pdf";

Deno.test("send: POSTs signers and file URLs as JSON", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { signature_request: { is_complete: false } },
  }]);
  await action.execute!({ signers: SIGNERS, fileUrls: FILE }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/signature_request/send");
  assertEquals(calls[0].headers["content-type"], "application/json");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.signers, [{ email_address: "ada@example.com", name: "Ada Lovelace" }]);
  assertEquals(body.file_urls, [FILE]);
  // Documents go by URL — the multipart `files` field is never used.
  assertEquals(body.files, undefined);
});

/**
 * test_mode false means a real, legally binding request. It must reach the wire
 * explicitly rather than being dropped as a falsy value.
 */
Deno.test("send: test_mode is always sent, including when it is false", async () => {
  const off = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ signers: SIGNERS, fileUrls: FILE }, off.ctx);
  assertEquals(JSON.parse(off.calls[0].body!).test_mode, false);

  const on = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ signers: SIGNERS, fileUrls: FILE, testMode: true }, on.ctx);
  assertEquals(JSON.parse(on.calls[0].body!).test_mode, true);
});

/** "false" is a truthy string; a mis-coerced tick would send a real contract. */
Deno.test('send: the string "false" does not turn test mode on', async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ signers: SIGNERS, fileUrls: FILE, testMode: "false" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).test_mode, false);
});

/** Sequential signing is an `order` per signer, not a flag. */
Deno.test("send: sequential order stamps the signers in the order given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({
    signers: '[{"email_address":"a@x.com","name":"A"},{"email_address":"b@x.com","name":"B"}]',
    fileUrls: FILE,
    signingOrder: "sequential",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).signers.map((s: { order: number }) => s.order), [0, 1]);
});

Deno.test("send: parallel is the default and stamps no order", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ signers: SIGNERS, fileUrls: FILE }, ctx);
  assertEquals(JSON.parse(calls[0].body!).signers[0].order, undefined);
});

Deno.test("send: a signer's own order survives sequential mode", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({
    signers: '[{"email_address":"a@x.com","name":"A","order":5}]',
    fileUrls: FILE,
    signingOrder: "sequential",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).signers[0].order, 5);
});

Deno.test("send: CC addresses and metadata reach the wire in their own shapes", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({
    signers: SIGNERS,
    fileUrls: `${FILE}, https://example.com/b.pdf`,
    ccEmailAddresses: "legal@example.com, ap@example.com",
    metadata: '{"order_id":"1234"}',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.file_urls.length, 2);
  assertEquals(body.cc_email_addresses, ["legal@example.com", "ap@example.com"]);
  assertEquals(body.metadata, { order_id: "1234" });
});

/** A 200 can carry warnings; dropping them is how a partial failure hides. */
Deno.test("send: warnings on a successful response are returned and logged", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: {
      signature_request: { signature_request_id: "sr1" },
      warnings: [{ warning_name: "ignored_field", warning_msg: "nope" }],
    },
  }]);
  const result = await action.execute!({ signers: SIGNERS, fileUrls: FILE }, ctx) as {
    signature_request_id: string;
    warnings: unknown[];
  };
  assertEquals(result.signature_request_id, "sr1");
  assertEquals(result.warnings.length, 1);
  assert(logs.some((l) => l.level === "warn"), "the warning was not logged");
});

Deno.test("send: signers and a document are both required, before any request", async () => {
  const noSigners = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ fileUrls: FILE }, noSigners.ctx),
    Error,
    "`signers` is required",
  );
  const noFile = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ signers: SIGNERS }, noFile.ctx),
    Error,
    "`fileUrls` is required",
  );
  assertEquals(noSigners.calls.length + noFile.calls.length, 0);
});

Deno.test("send: is honestly non-idempotent", () => {
  assertEquals(action.idempotent, false);
});
