import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-list.ts";

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>my-bucket</Name>
  <Prefix>docs/</Prefix>
  <KeyCount>2</KeyCount>
  <MaxKeys>1000</MaxKeys>
  <IsTruncated>true</IsTruncated>
  <NextContinuationToken>token-abc</NextContinuationToken>
  <Contents>
    <Key>docs/a.txt</Key>
    <LastModified>2024-01-01T00:00:00.000Z</LastModified>
    <ETag>"etag-a"</ETag>
    <Size>10</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
  <Contents>
    <Key>docs/b.txt</Key>
    <LastModified>2024-01-02T00:00:00.000Z</LastModified>
    <ETag>"etag-b"</ETag>
    <Size>20</Size>
    <StorageClass>STANDARD</StorageClass>
  </Contents>
</ListBucketResult>`;

Deno.test("object-list: builds list-type=2 query and parses Contents", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: SAMPLE_XML }]);
  const result = await action.execute!({ bucket: "my-bucket", prefix: "docs/" }, ctx);

  assertEquals(
    calls[0].url,
    "https://s3.us-east-1.amazonaws.com/my-bucket?list-type=2&prefix=docs%2F&max-keys=1000",
  );
  assertEquals(result.objects.length, 2);
  assertEquals(result.objects[0], {
    key: "docs/a.txt",
    size: 10,
    lastModified: "2024-01-01T00:00:00.000Z",
    etag: '"etag-a"',
    storageClass: "STANDARD",
  });
  assertEquals(result.isTruncated, true);
  assertEquals(result.nextContinuationToken, "token-abc");
  assertEquals(result.keyCount, 2);
});

Deno.test("object-list: forwards continuationToken and delimiter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "<ListBucketResult></ListBucketResult>" }]);
  await action.execute!(
    { bucket: "my-bucket", continuationToken: "tok", delimiter: "/", maxKeys: 5 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("continuation-token"), "tok");
  assertEquals(url.searchParams.get("delimiter"), "/");
  assertEquals(url.searchParams.get("max-keys"), "5");
});

Deno.test("object-list: parses CommonPrefixes when a delimiter groups keys", async () => {
  const xml =
    `<ListBucketResult><CommonPrefixes><Prefix>docs/</Prefix></CommonPrefixes><CommonPrefixes><Prefix>img/</Prefix></CommonPrefixes></ListBucketResult>`;
  const { ctx } = mockCtx([{ status: 200, body: xml }]);
  const result = await action.execute!({ bucket: "my-bucket", delimiter: "/" }, ctx);
  assertEquals(result.commonPrefixes, ["docs/", "img/"]);
});

Deno.test("object-list: missing bucket rejects", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(action.execute!({ bucket: "" }, ctx)), Error, "bucket");
});
