import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-bucket.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const xml = (...names: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><ListAllMyBucketsResult><Owner><ID>o</ID></Owner><Buckets>${
    names.map((n) =>
      `<Bucket><Name>${n}</Name><CreationDate>2026-01-01T00:00:00.000Z</CreationDate></Bucket>`
    )
      .join("")
  }</Buckets></ListAllMyBucketsResult>`;
const ctx = (...names: string[]) => mockCtx([{ body: xml(...names) }]);
const bucket = (name: string) => ({ name, creationDate: "2026-01-01T00:00:00.000Z" });

test("new-bucket seeds, emits only the new bucket, and retries identically", async () => {
  const seed = ctx("a", "b");
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://s3.us-east-1.amazonaws.com/");
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx("a", "b", "c").ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx("a", "b", "c").ctx);
  assertEquals(first.events, [bucket("c")]);
  assertEquals(retry, first);
});
