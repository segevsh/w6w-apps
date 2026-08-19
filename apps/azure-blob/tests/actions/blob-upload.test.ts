import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/blob-upload.ts";

const D = { display: { account: "myaccount" } };
const written = { status: 201, body: "", headers: { etag: '"0x8D"' } };
const base = { container: "uploads", blob: "reports/q3.json", content: '{"ok":true}' };

/** Omitting the type header is a 400 — there is no default. */
Deno.test("blob-upload: always sends the blob type", async () => {
  const { ctx, calls } = mockCtx([written], D);
  const result = await action.execute(base, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].headers["x-ms-blob-type"], "BlockBlob");
  assertEquals(calls[0].body, '{"ok":true}');
  assertEquals(result.etag, '"0x8D"');
  assertEquals(result.size, 11);
});

Deno.test("blob-upload: the content type is set as both the wire and blob type", async () => {
  const { ctx, calls } = mockCtx([written], D);
  await action.execute({ ...base, contentType: "application/json" }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["x-ms-blob-content-type"], "application/json");
});

/** Without a precondition, a write replaces what is there and returns 201. */
Deno.test("blob-upload: ifNotExists becomes If-None-Match", async () => {
  const { ctx, calls } = mockCtx([written], D);
  await action.execute({ ...base, ifNotExists: true }, ctx);
  assertEquals(calls[0].headers["if-none-match"], "*");

  const plain = mockCtx([written], D);
  await action.execute(base, plain.ctx);
  assertEquals(plain.calls[0].headers["if-none-match"], undefined);
});

Deno.test("blob-upload: an ETag becomes If-Match, the compare-and-swap", async () => {
  const { ctx, calls } = mockCtx([written], D);
  await action.execute({ ...base, ifMatch: '"0x8C"' }, ctx);
  assertEquals(calls[0].headers["if-match"], '"0x8C"');
});

Deno.test("blob-upload: the two preconditions are mutually exclusive", async () => {
  const { ctx, calls } = mockCtx([], D);
  let message = "";
  try {
    await action.execute({ ...base, ifNotExists: true, ifMatch: '"x"' }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/not both/.test(message), message);
  assertEquals(calls.length, 0);
});

/** A 412 means the safety worked. */
Deno.test("blob-upload: a conflicting write explains the 412", async () => {
  const { ctx } = mockCtx([{
    status: 412,
    body:
      "<Error><Code>ConditionNotMet</Code><Message>The condition specified was not met.</Message></Error>",
    headers: { "content-type": "application/xml", "x-ms-error-code": "ConditionNotMet" },
  }], D);
  let message = "";
  try {
    await action.execute({ ...base, ifNotExists: true }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/which means it worked/.test(message), message);
});

/** Azure's minimums differ from every other vendor's. */
Deno.test("blob-upload: a cold tier reports what it commits you to", async () => {
  const { ctx, calls } = mockCtx([written], D);
  const result = await action.execute({ ...base, accessTier: "Archive" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].headers["x-ms-access-tier"], "Archive");
  assert(/180 days/.test(String(result.minimumDurationNote)), String(result.minimumDurationNote));
  assert(/cannot be read at all/.test(String(result.minimumDurationNote)));

  const hot = mockCtx([written], D);
  const plain = await action.execute(base, hot.ctx) as Record<string, unknown>;
  assertEquals(plain.minimumDurationNote, undefined);
});

Deno.test("blob-upload: a body over the ceiling is refused, pointing elsewhere", async () => {
  const { ctx, calls } = mockCtx([], D);
  let message = "";
  try {
    await action.execute({ ...base, content: "x".repeat(4_000_001) }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/4000001 bytes/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("blob-upload: metadata names are validated before sending", async () => {
  const { ctx, calls } = mockCtx([], D);
  let message = "";
  try {
    await action.execute({ ...base, metadata: '{"uploaded-by":"x"}' }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/not a valid C# identifier/.test(message), message);
  assertEquals(calls.length, 0);
});

/** The contents are the caller's. */
Deno.test("blob-upload: logs the name and size, never the content", async () => {
  const { ctx, logs } = mockCtx([written], D);
  await action.execute({ ...base, content: "secret-ish" }, ctx);
  assertEquals(logs[0].data, { name: "reports/q3.json", size: 10 });
  assertEquals(JSON.stringify(logs[0]).includes("secret-ish"), false);
});

Deno.test("blob-upload: says a blob's type is fixed at creation", () => {
  assert(/TYPE is fixed at creation/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
