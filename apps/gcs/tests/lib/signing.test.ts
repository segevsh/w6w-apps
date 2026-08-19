import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  base64ToHex,
  basicIsoTimestamp,
  encodeBase64,
  encodePath,
  MAX_EXPIRY_SECONDS,
  signedUrl,
  signWithIam,
} from "../../lib/signing.ts";
import { encodeHex, importPrivateKey, signRs256 } from "../../lib/crypto.ts";
import { EXPECTED_SIGNATURE, TEST_CLIENT_EMAIL, TEST_NOW, TEST_PRIVATE_KEY } from "./_vector.ts";

/**
 * The local stand-in for IAM Credentials: signs with the test key so the
 * canonical construction can be compared against the reference vector. In the
 * app this is `signWithIam`, and the key never comes near the process.
 */
const localSigner = async (stringToSign: string) => {
  const key = await importPrivateKey(TEST_PRIVATE_KEY);
  return encodeHex(await signRs256(key, stringToSign));
};

const base = {
  bucket: "example-bucket",
  object: "cat pics/tabby.jpeg",
  method: "GET",
  expiresInSeconds: 3600,
  clientEmail: TEST_CLIENT_EMAIL,
  now: TEST_NOW,
  sign: localSigner,
};

/**
 * The known-answer test. The expected signature was computed independently in
 * Python from Google's documented format — so this checks the implementation
 * against the specification, not against itself.
 */
Deno.test("signedUrl: matches a signature computed by an independent implementation", async () => {
  const result = await signedUrl(base);
  const signature = new URL(result.url).searchParams.get("X-Goog-Signature");
  assertEquals(signature, EXPECTED_SIGNATURE);
});

Deno.test("signedUrl: the URL carries every parameter Cloud Storage requires", async () => {
  const { url } = await signedUrl(base);
  const parsed = new URL(url);
  assertEquals(parsed.host, "storage.googleapis.com");
  assertEquals(parsed.searchParams.get("X-Goog-Algorithm"), "GOOG4-RSA-SHA256");
  assertEquals(
    parsed.searchParams.get("X-Goog-Credential"),
    `${TEST_CLIENT_EMAIL}/20260819/auto/storage/goog4_request`,
  );
  assertEquals(parsed.searchParams.get("X-Goog-Date"), "20260819T120000Z");
  assertEquals(parsed.searchParams.get("X-Goog-Expires"), "3600");
  assertEquals(parsed.searchParams.get("X-Goog-SignedHeaders"), "host");
});

/** A signature over no headers verifies against nothing. */
Deno.test("signedUrl: host is always signed, and extra headers join it in order", async () => {
  const plain = await signedUrl(base);
  assertEquals(plain.signedHeaders, ["host"]);

  const withHeaders = await signedUrl({
    ...base,
    headers: { "x-goog-meta-owner": "jane", "content-type": "text/plain" },
  });
  assertEquals(withHeaders.signedHeaders, ["content-type", "host", "x-goog-meta-owner"]);
  assertEquals(
    new URL(withHeaders.url).searchParams.get("X-Goog-SignedHeaders"),
    "content-type;host;x-goog-meta-owner",
  );
});

/** Adding a header changes what the signature covers. */
Deno.test("signedUrl: a different header set produces a different signature", async () => {
  const plain = await signedUrl(base);
  const extra = await signedUrl({ ...base, headers: { "content-type": "text/plain" } });
  assert(
    new URL(plain.url).searchParams.get("X-Goog-Signature") !==
      new URL(extra.url).searchParams.get("X-Goog-Signature"),
  );
});

/** The path separators stay separators; everything else is encoded. */
Deno.test("encodePath: encodes each segment but leaves the slashes alone", () => {
  assertEquals(encodePath("cat pics/tabby.jpeg"), "cat%20pics/tabby.jpeg");
  assertEquals(encodePath("a/b/c.txt"), "a/b/c.txt");
  assertEquals(encodePath("a+b&c=d.txt"), "a%2Bb%26c%3Dd.txt");
  // encodeURIComponent leaves these alone; Google's list requires them encoded.
  assertEquals(encodePath("hi!'()*.txt"), "hi%21%27%28%29%2A.txt");
  assertEquals(encodePath("~keep-._.txt"), "~keep-._.txt");
});

Deno.test("basicIsoTimestamp: the only format V4 accepts", () => {
  assertEquals(basicIsoTimestamp(Date.UTC(2026, 7, 19, 12, 0, 0)), "20260819T120000Z");
  assertEquals(basicIsoTimestamp(Date.UTC(2019, 11, 1, 19, 8, 59)), "20191201T190859Z");
});

/** A longer URL signs fine and is refused when somebody uses it. */
Deno.test("signedUrl: refuses an expiry beyond Google's seven-day maximum", async () => {
  assertEquals(MAX_EXPIRY_SECONDS, 604800);
  await assertRejects(
    () => signedUrl({ ...base, expiresInSeconds: MAX_EXPIRY_SECONDS + 1 }),
    Error,
    "maximum for a V4 signed URL",
  );
  // Exactly the maximum is allowed.
  const edge = await signedUrl({ ...base, expiresInSeconds: MAX_EXPIRY_SECONDS });
  assertEquals(new URL(edge.url).searchParams.get("X-Goog-Expires"), "604800");
});

Deno.test("signedUrl: refuses a zero or negative lifetime", async () => {
  for (const seconds of [0, -1, Number.NaN]) {
    await assertRejects(() => signedUrl({ ...base, expiresInSeconds: seconds }), Error);
  }
});

Deno.test("signedUrl: reports when the URL stops working", async () => {
  const result = await signedUrl(base);
  assertEquals(result.expiresAt, new Date(TEST_NOW + 3600_000).toISOString());
});

/** A PUT signature does not work for a GET, which is what scopes it. */
Deno.test("signedUrl: the method is part of what is signed", async () => {
  const get = await signedUrl(base);
  const put = await signedUrl({ ...base, method: "PUT" });
  assert(
    new URL(get.url).searchParams.get("X-Goog-Signature") !==
      new URL(put.url).searchParams.get("X-Goog-Signature"),
  );
});

/** No secret enters the URL builder; the signer is where the key is used. */
Deno.test("signedUrl: the builder never receives a key", async () => {
  const result = await signedUrl(base);
  assert(result.url.startsWith("https://storage.googleapis.com/example-bucket/"));
  assertEquals("privateKey" in base, false);
});

/**
 * signBlob takes base64 and returns base64; a V4 signature travels as hex.
 * Getting this wrong produces a URL that looks right and never verifies.
 */
Deno.test("signWithIam: posts base64 to signBlob and converts the answer to hex", async () => {
  const calls: Array<{ url: string; body: string }> = [];
  const fetchImpl = (url: string, init: RequestInit) => {
    calls.push({ url, body: String(init.body) });
    // 0xde 0xad 0xbe 0xef
    return Promise.resolve(
      new Response(JSON.stringify({ signedBlob: "3q2+7w==" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  };
  const signature = await signWithIam(fetchImpl, TEST_CLIENT_EMAIL)("string-to-sign");

  assertEquals(
    calls[0].url,
    "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" +
      "signer%40test-project.iam.gserviceaccount.com:signBlob",
  );
  assertEquals(JSON.parse(calls[0].body).payload, encodeBase64("string-to-sign"));
  assertEquals(signature, "deadbeef");
});

/** No Cloud Storage role grants this permission. */
Deno.test("signWithIam: a 403 says which role is missing", async () => {
  const fetchImpl = () =>
    Promise.resolve(
      new Response(JSON.stringify({ error: { message: "Permission denied" } }), { status: 403 }),
    );
  await assertRejects(
    () => signWithIam(fetchImpl, TEST_CLIENT_EMAIL)("x"),
    Error,
    "Service Account Token Creator",
  );
});

Deno.test("signWithIam: a response with no signature is an error, not an empty URL", async () => {
  const fetchImpl = () => Promise.resolve(new Response("{}", { status: 200 }));
  await assertRejects(() => signWithIam(fetchImpl, TEST_CLIENT_EMAIL)("x"), Error, "no signature");
});

Deno.test("base64ToHex and encodeBase64 round-trip the way signBlob expects", () => {
  assertEquals(base64ToHex("3q2+7w=="), "deadbeef");
  assertEquals(base64ToHex(encodeBase64("A")), "41");
  // signBlob answers with standard base64; the url-safe alphabet is tolerated.
  assertEquals(base64ToHex("3q2-7w=="), "deadbeef");
});
