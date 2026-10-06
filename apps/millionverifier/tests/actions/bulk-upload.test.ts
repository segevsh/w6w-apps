import { assert, assertEquals, assertRejects } from "@std/assert";
import bulkUpload from "../../actions/bulk-upload.ts";
import { mockCtx, run } from "../_helpers.ts";

const FILE = {
  file_id: "940",
  file_name: "emails.txt",
  status: "in_progress",
  unique_emails: 2,
  percent: 0,
  credit: 2,
  error: "",
};

Deno.test("bulk-upload: POSTs a multipart file_contents part to the bulk host", async () => {
  const { ctx, calls } = mockCtx([{ body: FILE }]);
  const out = await run(bulkUpload, { emails: "a@b.com, c@d.com\ne@f.com" }, ctx);
  const c = calls[0];
  assertEquals(c.method, "POST");
  const url = new URL(c.url);
  assertEquals(url.origin + url.pathname, "https://bulkapi.millionverifier.com/bulkapi/v2/upload");
  assertEquals(url.searchParams.has("key"), false);
  assert(c.headers["content-type"].startsWith("multipart/form-data; boundary="));
  assertEquals(out.fileId, "940");
  assertEquals(out.uniqueEmails, 2);
  assertEquals(out.error, undefined);
});

Deno.test("bulk-upload: the body is a well-formed multipart with the addresses one per line", async () => {
  let sent: Uint8Array | undefined;
  let ct = "";
  const { ctx } = mockCtx();
  ctx.fetch = ((_u: string, init: RequestInit) => {
    sent = new Uint8Array(init.body as ArrayBuffer);
    ct = (init.headers as Record<string, string>)["content-type"];
    return Promise.resolve(new Response(JSON.stringify(FILE)));
  }) as unknown as typeof fetch;
  await run(bulkUpload, { emails: "a@b.com\nc@d.com" }, ctx);
  const boundary = ct.split("boundary=")[1];
  const text = new TextDecoder().decode(sent);
  assert(
    text.startsWith(
      `--${boundary}\r\nContent-Disposition: form-data; name="file_contents"; filename="emails.txt"\r\nContent-Type: text/plain\r\n\r\n`,
    ),
  );
  assert(text.includes("\r\n\r\na@b.com\nc@d.com\n\r\n--"));
  assert(text.endsWith(`--${boundary}--\r\n`));
});

Deno.test("bulk-upload: a base64 file is sent with its own name and type", async () => {
  let sent = "";
  const { ctx } = mockCtx();
  ctx.fetch = ((_u: string, init: RequestInit) => {
    sent = new TextDecoder().decode(new Uint8Array(init.body as ArrayBuffer));
    return Promise.resolve(new Response(JSON.stringify(FILE)));
  }) as unknown as typeof fetch;
  await run(bulkUpload, {
    contentBase64: btoa("x@y.com\n"),
    filename: "list.csv",
    contentType: "text/csv",
  }, ctx);
  assert(sent.includes('filename="list.csv"'));
  assert(sent.includes("Content-Type: text/csv"));
  assert(sent.includes("x@y.com"));
});

Deno.test("bulk-upload: insufficient_credits on a HTTP 200 throws with the figures", async () => {
  const { ctx } = mockCtx([{
    body: { error: "insufficient_credits", unique_emails: 250000, credits: 500 },
  }]);
  const err = await assertRejects(() => run(bulkUpload, { emails: "a@b.com" }, ctx));
  assert((err as Error).message.includes("250000 unique emails"));
  assert((err as Error).message.includes("500 credits available"));
});

Deno.test("bulk-upload: needs emails or a file", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(() => run(bulkUpload, {}, ctx), Error, "provide emails");
  assertEquals(calls.length, 0);
});
