import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_BASE,
  API_HOST,
  bucketName,
  compact,
  csv,
  DEFAULT_SCOPE,
  describeError,
  earlyDeletionNote,
  emptyToUndefined,
  json,
  MINIMUM_DURATION_DAYS,
  objectName,
  query,
  StorageClient,
  UPLOAD_BASE,
} from "../../lib/client.ts";

/** Content and metadata live at different paths on the same host. */
Deno.test("the metadata base and the upload base differ", () => {
  assertEquals(API_BASE, "https://storage.googleapis.com/storage/v1");
  assertEquals(UPLOAD_BASE, "https://storage.googleapis.com/upload/storage/v1");
  assertEquals(API_HOST, "https://storage.googleapis.com");
});

/** A scope is an identifier shaped like a URL; nothing fetches it. */
Deno.test("the OAuth scope is the full-control storage scope", () => {
  assertEquals(DEFAULT_SCOPE, "https://www.googleapis.com/auth/devstorage.full_control");
});

Deno.test("request: defaults to the metadata base and can be pointed at the upload one", async () => {
  const meta = mockCtx([{ status: 200, body: {} }]);
  await new StorageClient(meta.ctx).request("/b/x/o");
  assertEquals(meta.calls[0].url, "https://storage.googleapis.com/storage/v1/b/x/o");

  const upload = mockCtx([{ status: 200, body: {} }]);
  await new StorageClient(upload.ctx).request("/b/x/o", {
    base: UPLOAD_BASE,
    method: "POST",
    raw: { body: "hi", contentType: "text/plain" },
  });
  assertEquals(upload.calls[0].url, "https://storage.googleapis.com/upload/storage/v1/b/x/o");
  assertEquals(upload.calls[0].headers["content-type"], "text/plain");
  assertEquals(upload.calls[0].body, "hi");
});

/** The auth hook signs; the client must never carry a token itself. */
Deno.test("request: never sets an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new StorageClient(ctx).request("/b");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("request: text mode returns the body verbatim", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "a,b,c" }]);
  const result = await new StorageClient(ctx).request<string>("/b/x/o/y", { text: true });
  assertEquals(result, "a,b,c");
  assertEquals(calls[0].headers["accept"], "*/*");
});

Deno.test("request: a 204 returns undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new StorageClient(ctx).request("/b/x"), undefined);
});

/** A gs:// URI is what people have to hand; the path wants a bare name. */
Deno.test("bucketName: strips a gs:// prefix and refuses a path", () => {
  assertEquals(bucketName("my-bucket"), "my-bucket");
  assertEquals(bucketName("gs://my-bucket"), "my-bucket");
  const withPath = assertThrows(() => bucketName("gs://my-bucket/a/b.txt"), Error);
  assert(/give the bucket name \("my-bucket"\)/.test(withPath.message), withPath.message);
  const path = assertThrows(() => bucketName("my-bucket/a"), Error);
  assert(/must be a bucket name, not a path/.test(path.message), path.message);
  assertThrows(() => bucketName(""), Error, "required");
});

/** An object name is a whole name; slashes are just characters in it. */
Deno.test("objectName: keeps the slashes and refuses a URI", () => {
  assertEquals(objectName("logs/2026/08/app.log"), "logs/2026/08/app.log");
  const uri = assertThrows(() => objectName("gs://b/logs/app.log"), Error);
  assert(/slashes included/.test(uri.message), uri.message);
  assertThrows(() => objectName(""), Error, "required");
});

/** A cold class costs more than STANDARD for anything short-lived. */
Deno.test("earlyDeletionNote: names the minimum billed duration, or says nothing", () => {
  assertEquals(MINIMUM_DURATION_DAYS.ARCHIVE, 365);
  assert(/365 days/.test(earlyDeletionNote("ARCHIVE")!));
  assert(/30 days/.test(earlyDeletionNote("NEARLINE")!));
  assert(/90 days/.test(earlyDeletionNote("coldline")!), "the class is matched case-insensitively");
  assertEquals(earlyDeletionNote("STANDARD"), undefined);
  assertEquals(earlyDeletionNote(undefined), undefined);
});

Deno.test("compact, emptyToUndefined, csv, json and query behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [] }), { a: 1 });
  assertEquals(emptyToUndefined({ a: "", b: undefined }), undefined);
  assertEquals(emptyToUndefined({ a: 1 }), { a: 1 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
  assertEquals(query({ a: "x", b: 2, c: "" }), { a: "x", b: 2 });
});

/** Measured live: the project is validated before the credential. */
Deno.test("describeError: a 400 explains the project-before-credential ordering", () => {
  const message = describeError(
    400,
    JSON.stringify({ error: { message: "Project id: 0 is invalid or not found" } }),
  );
  assert(/validates the PROJECT before the credential/.test(message), message);
});

Deno.test("describeError: a 403 says creating a key grants nothing", () => {
  const message = describeError(
    403,
    JSON.stringify({
      error: {
        message: "does not have storage.objects.list access",
        errors: [{ reason: "forbidden" }],
      },
    }),
  );
  assert(/creating the key grants nothing by itself/.test(message), message);
  assert(/\[forbidden\]/.test(message), message);
});

/** An unencoded slash addresses a different URL entirely. */
Deno.test("describeError: a 404 names the encoding trap", () => {
  assert(/percent-encoded into the path/.test(describeError(404, "{}")));
});

/** A 412 means the safe-write mechanism worked. */
Deno.test("describeError: a 412 says the precondition doing its job is not a failure", () => {
  const message = describeError(412, "{}");
  assert(/which means it worked/.test(message), message);
  assert(/refusing to overwrite/.test(message), message);
});

Deno.test("describeError: 409 and 429 name their real causes", () => {
  const conflict = describeError(409, "{}");
  assert(/globally unique/.test(conflict), conflict);
  assert(/until it is empty/.test(conflict), conflict);
  assert(/ONE WRITE PER SECOND/.test(describeError(429, "{}")));
});

Deno.test("request: an error names the method, the path and the explanation", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: { message: "Not Found" } } }]);
  let message = "";
  try {
    await new StorageClient(ctx).request("/b/x/o/y");
  } catch (err) {
    message = String(err);
  }
  assert(/404/.test(message), message);
  assert(/GET \/storage\/v1\/b\/x\/o\/y/.test(message), message);
});

Deno.test("request: a non-JSON body fails with what came back", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html/>" }]);
  let message = "";
  try {
    await new StorageClient(ctx).request("/b");
  } catch (err) {
    message = String(err);
  }
  assert(/did not return JSON/.test(message), message);
});
