import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/shared-key.ts";
import { API_VERSION } from "../../lib/signing.ts";
import { TEST_KEY } from "../lib/_vector.ts";

const cred = { account: "myaccount", key: TEST_KEY };

const signRequest = async (request: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}) => await auth.sign!({ request, credential: cred } as never, mockCtx([]).ctx) as typeof request;

/** The only scheme in this pack that signs entirely inside the hook. */
Deno.test("shared-key: stamps the version, the date and the signature", async () => {
  const signed = await signRequest({
    url: "https://myaccount.blob.core.windows.net/?comp=list",
    method: "GET",
    headers: {},
  });
  assertEquals(signed.headers["x-ms-version"], API_VERSION);
  assert(signed.headers["x-ms-date"], "an x-ms-date is set");
  assert(
    signed.headers["authorization"].startsWith("SharedKey myaccount:"),
    signed.headers["authorization"],
  );
});

/** The signature covers the query, so it has to be read off the URL. */
Deno.test("shared-key: signs the query as actually sent", async () => {
  const withQuery = await signRequest({
    url: "https://myaccount.blob.core.windows.net/c?restype=container&comp=list",
    method: "GET",
    headers: {},
  });
  const without = await signRequest({
    url: "https://myaccount.blob.core.windows.net/c",
    method: "GET",
    headers: {},
  });
  assert(
    withQuery.headers["authorization"] !== without.headers["authorization"],
    "the query is part of what is signed",
  );
});

/** URLSearchParams decodes on read, which is what the canonical form wants. */
Deno.test("shared-key: an encoded query value is signed decoded", async () => {
  const signed = await signRequest({
    url: "https://myaccount.blob.core.windows.net/c?prefix=my%20folder%2F&restype=container",
    method: "GET",
    headers: {},
  });
  assert(signed.headers["authorization"], "it signed without throwing on the encoding");
});

/** Empty string, not "0" — the line that makes reads work and writes fail. */
Deno.test("shared-key: a body contributes a byte count and an empty one does not", async () => {
  const empty = await signRequest({
    url: "https://myaccount.blob.core.windows.net/c/b",
    method: "PUT",
    headers: { "x-ms-blob-type": "BlockBlob" },
  });
  const withBody = await signRequest({
    url: "https://myaccount.blob.core.windows.net/c/b",
    method: "PUT",
    headers: { "x-ms-blob-type": "BlockBlob", "content-type": "text/plain" },
    body: "hello world",
  });
  assert(
    empty.headers["authorization"] !== withBody.headers["authorization"],
    "the content length is part of what is signed",
  );
});

/**
 * Bytes, not characters. `"aaé"` is three characters and FOUR bytes, so it
 * must sign identically to four ASCII characters and differently from three —
 * which is what `String.length` would have got wrong.
 */
Deno.test("shared-key: the content length is measured in bytes, not characters", async () => {
  const put = (body: string) =>
    signRequest({
      url: "https://myaccount.blob.core.windows.net/c/b",
      method: "PUT",
      headers: {},
      body,
    });

  const fourBytes = await put("aaaa");
  const threeCharsFourBytes = await put("aaé");
  const threeBytes = await put("aaa");

  assertEquals(
    threeCharsFourBytes.headers["authorization"],
    fourBytes.headers["authorization"],
    "three characters that are four bytes sign as four",
  );
  assert(
    threeBytes.headers["authorization"] !== fourBytes.headers["authorization"],
    "and three bytes signs differently",
  );
});

/** The method is signed, so a GET signature does not authorize a DELETE. */
Deno.test("shared-key: the method is part of the signature", async () => {
  const read = await signRequest({
    url: "https://myaccount.blob.core.windows.net/c/b",
    method: "GET",
    headers: {},
  });
  const remove = await signRequest({
    url: "https://myaccount.blob.core.windows.net/c/b",
    method: "DELETE",
    headers: {},
  });
  assert(read.headers["authorization"] !== remove.headers["authorization"]);
});

/** The x-ms-* headers the caller set are canonicalized too. */
Deno.test("shared-key: extra x-ms headers change the signature", async () => {
  const plain = await signRequest({
    url: "https://myaccount.blob.core.windows.net/c/b",
    method: "PUT",
    headers: {},
  });
  const tagged = await signRequest({
    url: "https://myaccount.blob.core.windows.net/c/b",
    method: "PUT",
    headers: { "x-ms-meta-owner": "jane" },
  });
  assert(plain.headers["authorization"] !== tagged.headers["authorization"]);
  assertEquals(tagged.headers["x-ms-meta-owner"], "jane", "the header survives signing");
});

Deno.test("shared-key: the test lists containers and reports the account", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "<EnumerationResults/>" }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assert(
    calls[0].url.startsWith("https://myaccount.blob.core.windows.net/?comp=list"),
    calls[0].url,
  );
  assert(calls[0].headers["authorization"].startsWith("SharedKey myaccount:"));
  assertEquals(result.ok, true);
  assert(/myaccount storage account/.test(result.message!), result.message);
});

/** A storage account is DNS: a wrong name does not resolve. */
Deno.test("shared-key: an unresolvable account says so rather than blaming the key", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns error")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/fails to resolve rather than answering 404/.test(result.message!), result.message);
});

Deno.test("shared-key: a rejected signature surfaces Azure's explanation", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body:
      "<Error><Code>AuthenticationFailed</Code><Message>Server failed to authenticate</Message></Error>",
    headers: { "content-type": "application/xml", "x-ms-error-code": "AuthenticationFailed" },
  }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/base64-decoded/.test(result.message!), result.message);
});

Deno.test("shared-key: missing fields and a bad account name fail before any request", async () => {
  const none = mockCtx([]);
  assertEquals((await auth.test!({ credential: {} } as never, none.ctx)).ok, false);
  assertEquals((await auth.test!({ credential: { account: "a" } } as never, none.ctx)).ok, false);
  const bad = mockCtx([]);
  const result = await auth.test!(
    { credential: { account: "my-account", key: TEST_KEY } } as never,
    bad.ctx,
  );
  assertEquals(result.ok, false);
  assert(/3 to 24 lowercase/.test(result.message!), result.message);
  assertEquals(bad.calls.length, 0);
});

/** The account is the hostname, so every action needs it recorded. */
Deno.test("shared-key: afterConnect records the account and never the key", () => {
  const display = auth.afterConnect!(
    { credential: cred },
    mockCtx([]).ctx,
  ) as Record<string, unknown>;
  assertEquals(display.account, "myaccount");
  assertEquals("key" in display, false);
});

/** The key is the whole account, not a scoped credential. */
Deno.test("shared-key: says what the key actually grants", () => {
  assert(/FULL control of the entire account/.test(auth.description!), auth.description);
  assertEquals(auth.fields!.find((f) => f.key === "key")!.type, "secret");
  assert(/closer to a root password/.test(auth.fields!.find((f) => f.key === "key")!.hint!));
});
