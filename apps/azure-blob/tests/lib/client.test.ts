import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  accountFromConnection,
  accountHost,
  accountName,
  BlobClient,
  blobName,
  compact,
  containerName,
  csv,
  describeError,
  HOST_SUFFIX,
  json,
  query,
  readBlobList,
} from "../../lib/client.ts";
import { parseXml } from "../../lib/xml.ts";

/** The account is DNS, which is why it is part of the credential. */
Deno.test("accountHost: the account is the first label of the hostname", () => {
  assertEquals(accountHost("mystorage"), `https://mystorage${HOST_SUFFIX}`);
  assertEquals(HOST_SUFFIX, ".blob.core.windows.net");
});

Deno.test("accountName: accepts a bare name and strips a pasted hostname", () => {
  assertEquals(accountName("mystorage"), "mystorage");
  assertEquals(accountName("MyStorage"), "mystorage");
  assertEquals(accountName("mystorage.blob.core.windows.net"), "mystorage");
  assertEquals(accountName("https://mystorage.blob.core.windows.net/container"), "mystorage");
});

Deno.test("accountName: refuses what Azure would refuse, before the request", () => {
  const bad = assertThrows(() => accountName("my-storage"), Error);
  assert(/3 to 24 lowercase letters and digits/.test(bad.message), bad.message);
  assertThrows(() => accountName("ab"), Error);
  assertThrows(() => accountName("a".repeat(25)), Error);
  assertThrows(() => accountName(""), Error, "required");
});

/** Azure rejects uppercase outright, which catches copied names. */
Deno.test("containerName: enforces Azure's naming rules with the reason", () => {
  assertEquals(containerName("uploads"), "uploads");
  assertEquals(containerName("my-container-1"), "my-container-1");
  const upper = assertThrows(() => containerName("Uploads"), Error);
  assert(/rejects uppercase outright/.test(upper.message), upper.message);
  assertThrows(() => containerName("ab"), Error);
  assertThrows(() => containerName("double--hyphen"), Error);
  assertThrows(() => containerName("-leading"), Error);
});

/** Slashes are ordinary characters in a blob name. */
Deno.test("blobName: keeps the slashes", () => {
  assertEquals(blobName("logs/2026/08/app.log"), "logs/2026/08/app.log");
  assertThrows(() => blobName(""), Error, "required");
});

Deno.test("accountFromConnection: reads the account, or says to reconnect", () => {
  const withAccount = mockCtx([], { display: { account: "mystorage" } });
  assertEquals(accountFromConnection(withAccount.ctx.connection), "mystorage");
  const without = mockCtx([], { display: {} });
  const err = assertThrows(() => accountFromConnection(without.ctx.connection), Error);
  assert(/the account name is the hostname/.test(err.message), err.message);
});

Deno.test("request: builds the URL from the account and parses the XML", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: "<EnumerationResults><Containers /></EnumerationResults>",
  }], { display: { account: "mystorage" } });
  const root = await new BlobClient(ctx).request("/", { query: { comp: "list" } });
  assertEquals(calls[0].url, "https://mystorage.blob.core.windows.net/?comp=list");
  assert(root.children["EnumerationResults"], "the XML was parsed");
});

/** The auth hook signs; the client must never carry a key. */
Deno.test("request: never sets an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "<A/>" }], {
    display: { account: "mystorage" },
  });
  await new BlobClient(ctx).request("/");
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** A HEAD's answer is entirely in the headers, and its body is empty. */
Deno.test("full: an empty body is an empty tree, not an error", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "",
    headers: { "x-ms-blob-type": "BlockBlob", "content-length": "1024" },
  }], { display: { account: "mystorage" } });
  const result = await new BlobClient(ctx).full("/c/b", { method: "HEAD" });
  assertEquals(result.headers["x-ms-blob-type"], "BlockBlob");
  assertEquals(result.data.children, {});
});

Deno.test("full: text mode returns the body verbatim", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "a,b,c" }], {
    display: { account: "mystorage" },
  });
  const result = await new BlobClient(ctx).full<string>("/c/b", { text: true });
  assertEquals(result.data, "a,b,c");
});

/** With a delimiter the folders are siblings of the blobs, not among them. */
Deno.test("readBlobList: reads blobs and BlobPrefix separately", () => {
  const root = parseXml(`<EnumerationResults><Blobs>
    <Blob><Name>logs/a.log</Name><Properties><Content-Length>10</Content-Length></Properties></Blob>
    <BlobPrefix><Name>logs/2026/</Name></BlobPrefix>
    <BlobPrefix><Name>logs/2025/</Name></BlobPrefix>
  </Blobs><NextMarker>tok</NextMarker></EnumerationResults>`);
  const { blobs, prefixes, nextMarker } = readBlobList(root);
  assertEquals(blobs.length, 1);
  assertEquals(blobs[0].name, "logs/a.log");
  assertEquals(blobs[0]["Content-Length"], "10");
  assertEquals(prefixes, ["logs/2026/", "logs/2025/"]);
  assertEquals(nextMarker, "tok");
});

/** `<NextMarker />` means the last page, and so does its absence. */
Deno.test("readBlobList: an empty marker is no marker", () => {
  const root = parseXml("<EnumerationResults><Blobs /><NextMarker /></EnumerationResults>");
  assertEquals(readBlobList(root).nextMarker, undefined);
  assertEquals(readBlobList(root).blobs, []);
  assertEquals(readBlobList(root).prefixes, []);
});

Deno.test("compact, csv, json and query behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [] }), { a: 1 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
  assertEquals(query({ a: "x", b: 2, c: "" }), { a: "x", b: 2 });
});

const errorBody = (code: string, message: string) =>
  `<?xml version="1.0" encoding="utf-8"?><Error><Code>${code}</Code><Message>${message}</Message></Error>`;

/** Azure echoes the string it built, which is the only way to debug this. */
Deno.test("describeError: an authentication failure names the two usual causes", () => {
  const message = describeError(
    403,
    errorBody("AuthenticationFailed", "Server failed to authenticate"),
    "AuthenticationFailed",
  );
  assert(/Content-Length of `0`/.test(message), message);
  assert(/base64-decoded/.test(message), message);
});

/** Nothing in Azure's 403 mentions time. */
Deno.test("describeError: a plain 403 names clock drift", () => {
  const message = describeError(
    403,
    errorBody("AuthorizationFailure", "no"),
    "AuthorizationFailure",
  );
  assert(/more than 15 minutes from its own clock/.test(message), message);
});

/** The header survives an empty body, which a failed HEAD always has. */
Deno.test("describeError: the code comes from the header when there is no body", () => {
  const message = describeError(404, "", "BlobNotFound");
  assert(/\[BlobNotFound\]/.test(message), message);
  assert(/slashes are ordinary characters/.test(message), message);
});

Deno.test("describeError: the container cases explain themselves", () => {
  assert(
    /must be lowercase/.test(
      describeError(404, errorBody("ContainerNotFound", "x"), "ContainerNotFound"),
    ),
  );
  const deleting = describeError(
    409,
    errorBody("ContainerBeingDeleted", "x"),
    "ContainerBeingDeleted",
  );
  assert(/at least 30 seconds/.test(deleting), deleting);
});

/** Azure's messages carry a RequestId and timestamp on later lines. */
Deno.test("describeError: only the first line of the message is kept", () => {
  const message = describeError(
    404,
    errorBody("BlobNotFound", "The specified blob does not exist.\nRequestId:abc\nTime:2026-08-19"),
    "BlobNotFound",
  );
  assertEquals(message.includes("RequestId"), false);
  assert(/The specified blob does not exist\./.test(message), message);
});

Deno.test("describeError: 412 and 429 explain themselves", () => {
  assert(/which means it worked/.test(describeError(412, "", "ConditionNotMet")));
  assert(/single blob supports far less throughput/.test(describeError(429, "", "ServerBusy")));
});

Deno.test("request: an error names the method, the path and the explanation", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("BlobNotFound", "The specified blob does not exist."),
    headers: { "content-type": "application/xml", "x-ms-error-code": "BlobNotFound" },
  }], { display: { account: "mystorage" } });
  let message = "";
  try {
    await new BlobClient(ctx).request("/c/b");
  } catch (err) {
    message = String(err);
  }
  assert(/404/.test(message), message);
  assert(/GET \/c\/b/.test(message), message);
  assert(/BlobNotFound/.test(message), message);
});
