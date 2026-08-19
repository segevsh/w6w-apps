import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_VERSION,
  decodeBase64,
  encodeBase64,
  rfc1123,
  sharedKeyAuthorization,
  stringToSign,
} from "../../lib/signing.ts";
import {
  EXPECTED_GET_SIGNATURE,
  EXPECTED_PUT_SIGNATURE,
  TEST_ACCOUNT,
  TEST_DATE,
  TEST_KEY,
} from "./_vector.ts";

const getInput = {
  account: TEST_ACCOUNT,
  key: TEST_KEY,
  method: "GET",
  path: "/mycontainer",
  query: { restype: "container", comp: "list", timeout: "20" },
  headers: { "x-ms-date": TEST_DATE, "x-ms-version": "2015-02-21" },
};

const putInput = {
  account: TEST_ACCOUNT,
  key: TEST_KEY,
  method: "PUT",
  path: "/mycontainer/hello.txt",
  query: {},
  headers: {
    "x-ms-date": TEST_DATE,
    "x-ms-version": "2021-12-02",
    "x-ms-blob-type": "BlockBlob",
  },
  contentLength: "11",
  contentType: "text/plain",
};

/** The known-answer test, against a signature this code did not produce. */
Deno.test("sharedKey: matches a signature computed by an independent implementation", async () => {
  assertEquals(
    await sharedKeyAuthorization(getInput),
    `SharedKey ${TEST_ACCOUNT}:${EXPECTED_GET_SIGNATURE}`,
  );
  assertEquals(
    await sharedKeyAuthorization(putInput),
    `SharedKey ${TEST_ACCOUNT}:${EXPECTED_PUT_SIGNATURE}`,
  );
});

/** Matches the worked example in Microsoft's own documentation. */
Deno.test("stringToSign: twelve lines, then the headers, then the resource", () => {
  assertEquals(
    stringToSign(getInput),
    "GET\n\n\n\n\n\n\n\n\n\n\n\n" +
      `x-ms-date:${TEST_DATE}\nx-ms-version:2015-02-21\n` +
      "/myaccount/mycontainer\ncomp:list\nrestype:container\ntimeout:20",
  );
});

/** Not "0" — the change that makes GETs work and writes fail. */
Deno.test("stringToSign: an empty body is an empty Content-Length line", () => {
  const lines = stringToSign(getInput).split("\n");
  assertEquals(lines[3], "", "Content-Length is the fourth line and must be empty");

  const withBody = stringToSign(putInput).split("\n");
  assertEquals(withBody[3], "11");
  assertEquals(withBody[5], "text/plain", "Content-Type is the sixth line");
});

/** `x-ms-date` supersedes `Date`, so the Date line stays empty. */
Deno.test("stringToSign: the Date line is blank while x-ms-date carries the value", () => {
  const signed = stringToSign(getInput);
  assertEquals(signed.split("\n")[6], "", "the Date line");
  assert(signed.includes(`x-ms-date:${TEST_DATE}`), signed);
});

/** Content-Type has its own line and must not appear twice. */
Deno.test("stringToSign: only x-ms-* headers are canonicalized", () => {
  const signed = stringToSign({
    ...putInput,
    headers: {
      ...putInput.headers,
      "content-type": "text/plain",
      authorization: "SharedKey should-not-appear",
      accept: "application/xml",
    },
  });
  assertEquals(signed.includes("should-not-appear"), false);
  assertEquals(signed.includes("accept:"), false);
  assertEquals(signed.split("content-type:").length, 1, "content-type appears only as a line");
});

Deno.test("stringToSign: headers are lowercased, trimmed and sorted", () => {
  const signed = stringToSign({
    ...getInput,
    headers: {
      "X-MS-Version": "  2021-12-02  ",
      "x-ms-date": TEST_DATE,
      "x-ms-blob-type": "BlockBlob",
    },
  });
  const block = signed.split("\n\n\n\n\n\n\n\n\n")[1] ?? signed;
  assert(
    block.indexOf("x-ms-blob-type:") < block.indexOf("x-ms-date:"),
    "blob-type sorts before date",
  );
  assert(signed.includes("x-ms-version:2021-12-02\n"), "trimmed and lowercased");
});

/** A signature over the encoded form fails on spaces and slashes. */
Deno.test("stringToSign: query values are the decoded ones, names lowercased and sorted", () => {
  const signed = stringToSign({
    ...getInput,
    query: { Prefix: "my folder/", comp: "list", restype: "container" },
  });
  assert(
    signed.endsWith("/myaccount/mycontainer\ncomp:list\nprefix:my folder/\nrestype:container"),
    signed,
  );
});

Deno.test("stringToSign: no query is just the account and the path", () => {
  assert(stringToSign(putInput).endsWith("/myaccount/mycontainer/hello.txt"));
});

/** Using the base64 text as the key never verifies. */
Deno.test("sharedKey: the key is decoded before being used", () => {
  const decoded = decodeBase64(TEST_KEY);
  assertEquals(decoded.length, 32);
  assertEquals(encodeBase64(decoded), TEST_KEY);
});

Deno.test("sharedKey: a key that is not base64 says where to get one that is", async () => {
  await assertRejects(
    () => sharedKeyAuthorization({ ...getInput, key: "not base64!!" }),
    Error,
    "Access keys blade",
  );
});

Deno.test("sharedKey: the header names the account, so Azure knows which key to check", async () => {
  const header = await sharedKeyAuthorization(getInput);
  assert(header.startsWith(`SharedKey ${TEST_ACCOUNT}:`), header);
});

/** RFC 1123 is the only format Azure accepts. */
Deno.test("rfc1123: formats the date the way Azure requires", () => {
  assertEquals(rfc1123(Date.UTC(2015, 5, 26, 23, 39, 12)), TEST_DATE);
});

Deno.test("the API version is recent enough for the empty-Content-Length rule", () => {
  assert(API_VERSION >= "2015-02-21", API_VERSION);
});
