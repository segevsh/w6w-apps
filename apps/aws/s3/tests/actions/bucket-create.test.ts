import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockConnection, mockCtx } from "../_helpers.ts";
import action from "../../actions/bucket-create.ts";

test("bucket-create: us-east-1 sends no LocationConstraint body", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, headers: { location: "/my-bucket" } }],
    mockConnection({ region: "us-east-1" }),
  );
  const result = await action.execute!({ bucket: "my-bucket" }, ctx);

  assertEquals(calls[0].url, "https://s3.us-east-1.amazonaws.com/my-bucket");
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].body, null);
  assertEquals(result, { bucket: "my-bucket", location: "/my-bucket" });
});

test("bucket-create: other regions send a LocationConstraint body", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200 }],
    mockConnection({ region: "eu-west-1" }),
  );
  await action.execute!({ bucket: "my-bucket" }, ctx);

  assertEquals(calls[0].url, "https://s3.eu-west-1.amazonaws.com/my-bucket");
  const body = calls[0].body ?? "";
  if (!body.includes("<LocationConstraint>eu-west-1</LocationConstraint>")) {
    throw new Error(`expected LocationConstraint in body, got: ${body}`);
  }
});

test("bucket-create: sets x-amz-acl when provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }], mockConnection({ region: "us-east-1" }));
  await action.execute!({ bucket: "my-bucket", acl: "public-read" }, ctx);
  assertEquals(calls[0].headers["x-amz-acl"], "public-read");
});

test("bucket-create: missing bucket rejects", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute!({ bucket: "" }, ctx)), Error, "bucket");
});

test("bucket-create: propagates S3 errors", async () => {
  const { ctx } = mockCtx(
    [{
      status: 409,
      body: "<Error><Code>BucketAlreadyExists</Code><Message>taken</Message></Error>",
    }],
  );
  await assertRejects(
    () => Promise.resolve(action.execute!({ bucket: "taken" }, ctx)),
    Error,
    "taken",
  );
});
