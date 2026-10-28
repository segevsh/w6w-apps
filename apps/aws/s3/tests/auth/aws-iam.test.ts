import { assertEquals, assertMatch } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/aws-iam.ts";

const CREDENTIAL = {
  accessKeyId: "AKIDEXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  region: "us-east-1",
};

Deno.test("aws-iam: sign() adds a well-formed SigV4 Authorization header", async () => {
  const request = { url: "https://s3.us-east-1.amazonaws.com/", method: "GET", headers: {} };
  const signed = await auth.sign!({ request, credential: CREDENTIAL }, mockCtx().ctx);

  assertMatch(
    signed.headers["authorization"],
    /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/us-east-1\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/,
  );
  // GET with no body -> the well-known SHA-256 of the empty string.
  assertEquals(
    signed.headers["x-amz-content-sha256"],
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  assertMatch(signed.headers["x-amz-date"], /^\d{8}T\d{6}Z$/);
});

Deno.test("aws-iam: sign() never touches the network (no ctx.fetch call recorded)", async () => {
  const { ctx, calls } = mockCtx([]);
  const request = { url: "https://s3.us-east-1.amazonaws.com/", method: "GET", headers: {} };
  await auth.sign!({ request, credential: CREDENTIAL }, ctx);
  assertEquals(calls.length, 0);
});

Deno.test("aws-iam: test() calls ListBuckets on the credential's region host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: "<ListAllMyBucketsResult></ListAllMyBucketsResult>",
  }]);
  const result = await auth.test({ credential: CREDENTIAL }, ctx);

  assertEquals(calls[0].url, "https://s3.us-east-1.amazonaws.com/");
  assertEquals(result, { ok: true });
});

Deno.test("aws-iam: test() surfaces the S3 error message on failure", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      body: "<Error><Code>InvalidAccessKeyId</Code><Message>bad key</Message></Error>",
    },
  ]);
  const result = await auth.test({ credential: CREDENTIAL }, ctx);
  assertEquals(result.ok, false);
  assertMatch(result.message ?? "", /bad key/);
});

Deno.test("aws-iam: afterConnect echoes the region for actions to read", () => {
  const display = auth.afterConnect!({ credential: CREDENTIAL }, mockCtx().ctx);
  assertEquals(display, { region: "us-east-1" });
});
