import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bucket-list.ts";

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ListAllMyBucketsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Owner><ID>owner-id-123</ID><DisplayName>me</DisplayName></Owner>
  <Buckets>
    <Bucket><Name>bucket-a</Name><CreationDate>2024-01-01T00:00:00.000Z</CreationDate></Bucket>
    <Bucket><Name>bucket-b</Name><CreationDate>2024-02-02T00:00:00.000Z</CreationDate></Bucket>
  </Buckets>
</ListAllMyBucketsResult>`;

Deno.test("bucket-list: GETs the region host root and parses buckets", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: SAMPLE_XML,
    headers: { "content-type": "application/xml" },
  }]);
  const result = await action.execute!({}, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://s3.us-east-1.amazonaws.com/");
  assertEquals(calls[0].method, "GET");

  assertEquals(result, {
    buckets: [
      { name: "bucket-a", creationDate: "2024-01-01T00:00:00.000Z" },
      { name: "bucket-b", creationDate: "2024-02-02T00:00:00.000Z" },
    ],
    ownerId: "owner-id-123",
    ownerDisplayName: "me",
  });
});

Deno.test("bucket-list: propagates an S3 error as a descriptive Error", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      body: "<Error><Code>AccessDenied</Code><Message>Access Denied</Message></Error>",
    },
  ]);
  await assertRejects(() => Promise.resolve(action.execute!({}, ctx)), Error, "Access Denied");
});
