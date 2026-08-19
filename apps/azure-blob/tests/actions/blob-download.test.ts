import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/blob-download.ts";

const D = { display: { account: "myaccount" } };

/** GET is the contents and HEAD is the properties, at the same URL. */
Deno.test("blob-download: a plain GET returns the bytes, with no extra parameter", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: "a,b,c",
    headers: { "content-type": "text/csv", etag: '"0x8D"' },
  }], D);
  const result = await action.execute(
    { container: "uploads", blob: "data/rows.csv" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).search, "", "no alt=media equivalent is needed");
  assertEquals(result.content, "a,b,c");
  assertEquals(result.contentType, "text/csv");
  assertEquals(result.etag, '"0x8D"');
  assertEquals(result.size, 5);
});

Deno.test("blob-download: JSON is parsed as well as returned verbatim", async () => {
  const { ctx } = mockCtx([{ status: 200, body: '{"ok":true}' }], D);
  const result = await action.execute(
    { container: "uploads", blob: "config.json" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.json, { ok: true });
});

Deno.test("blob-download: a non-JSON blob comes back as text with no json field", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "plain" }], D);
  const result = await action.execute(
    { container: "uploads", blob: "notes.txt" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.json, undefined);
});

/** An archived blob is a 409, not a slow read. */
Deno.test("blob-download: an archived blob surfaces the conflict", async () => {
  const { ctx } = mockCtx([{
    status: 409,
    body:
      "<Error><Code>BlobArchived</Code><Message>This operation is not permitted on an archived blob.</Message></Error>",
    headers: { "content-type": "application/xml", "x-ms-error-code": "BlobArchived" },
  }], D);
  let message = "";
  try {
    await action.execute({ container: "uploads", blob: "old.log" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/BlobArchived/.test(message), message);
  assert(/ARCHIVE-tier blob answers 409/.test(action.description!), action.description);
});

Deno.test("blob-download: a blob over the ceiling is refused", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "x".repeat(4_000_001) }], D);
  let message = "";
  try {
    await action.execute({ container: "uploads", blob: "big.bin" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/4000001 bytes/.test(message), message);
});

Deno.test("blob-download: logs the name and size, never the contents", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: "secret-ish" }], D);
  await action.execute({ container: "uploads", blob: "notes.txt" }, ctx);
  assertEquals(logs[0].data, { name: "notes.txt", size: 10 });
  assertEquals(JSON.stringify(logs[0]).includes("secret-ish"), false);
});

Deno.test("blob-download: a version id pins what is read", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "old" }], D);
  await action.execute(
    { container: "uploads", blob: "a.txt", versionId: "2026-08-19T10:00:00.0000000Z" },
    ctx,
  );
  assertEquals(
    new URL(calls[0].url).searchParams.get("versionid"),
    "2026-08-19T10:00:00.0000000Z",
  );
});
