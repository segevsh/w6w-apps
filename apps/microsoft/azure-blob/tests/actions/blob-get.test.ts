import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/blob-get.ts";

const D = { display: { account: "myaccount" } };

const props = (headers: Record<string, string> = {}) => ({
  status: 200,
  body: "",
  headers: {
    "content-length": "1024",
    "content-type": "text/plain",
    etag: '"0x8D"',
    "last-modified": "Tue, 19 Aug 2026 10:00:00 GMT",
    "x-ms-blob-type": "BlockBlob",
    "x-ms-lease-state": "available",
    ...headers,
  },
});

/** The one call with nothing to parse — the body is empty by design. */
Deno.test("blob-get: HEADs the blob and reads everything from the headers", async () => {
  const { ctx, calls } = mockCtx([props()], D);
  const result = await action.execute(
    { container: "uploads", blob: "logs/a.log" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "HEAD");
  assertEquals(result.size, 1024);
  assertEquals(result.contentType, "text/plain");
  assertEquals(result.etag, '"0x8D"');
  assertEquals(result.blobType, "BlockBlob");
  assertEquals(result.leaseState, "available");
});

/** An unencoded slash addresses a different URL. */
Deno.test("blob-get: encodes the blob's slashes into the path", async () => {
  const { ctx, calls } = mockCtx([props()], D);
  await action.execute({ container: "uploads", blob: "logs/2026/a.log" }, ctx);
  assertEquals(
    calls[0].url,
    "https://myaccount.blob.core.windows.net/uploads/logs%2F2026%2Fa.log",
  );
});

/** Archive is not slow storage; it is offline. */
Deno.test("blob-get: an archived blob is reported as unreadable, and warned about", async () => {
  const { ctx, logs } = mockCtx([props({ "x-ms-access-tier": "Archive" })], D);
  const result = await action.execute(
    { container: "uploads", blob: "a.log" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.accessTier, "Archive");
  assertEquals(result.readable, false);
  assertEquals(logs[0].level, "warn");
  assert(/up to 15 hours/.test(logs[0].message), logs[0].message);
});

Deno.test("blob-get: any other tier is readable and does not warn", async () => {
  const { ctx, logs } = mockCtx([props({ "x-ms-access-tier": "Cool" })], D);
  const result = await action.execute(
    { container: "uploads", blob: "a.log" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.readable, true);
  assertEquals(logs.length, 0);
});

Deno.test("blob-get: a rehydration in progress is surfaced", async () => {
  const { ctx } = mockCtx([props({
    "x-ms-access-tier": "Archive",
    "x-ms-archive-status": "rehydrate-pending-to-hot",
  })], D);
  const result = await action.execute(
    { container: "uploads", blob: "a.log" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.rehydrationStatus, "rehydrate-pending-to-hot");
});

/** HTTP lowercases header names, so the metadata's case does not survive. */
Deno.test("blob-get: metadata comes back with the prefix stripped and lowercased", async () => {
  const { ctx } = mockCtx([props({ "x-ms-meta-uploadedby": "workflow" })], D);
  const result = await action.execute(
    { container: "uploads", blob: "a.log" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.metadata, { uploadedby: "workflow" });
  assert(/lowercased by HTTP/.test(
    (action.output as Array<{ key: string; label: string }>).find((o) => o.key === "metadata")!
      .label,
  ));
});

Deno.test("blob-get: a snapshot or version is passed as a query parameter", async () => {
  const { ctx, calls } = mockCtx([props()], D);
  await action.execute(
    { container: "uploads", blob: "a.log", snapshot: "2026-08-19T10:00:00.0000000Z" },
    ctx,
  );
  assertEquals(
    new URL(calls[0].url).searchParams.get("snapshot"),
    "2026-08-19T10:00:00.0000000Z",
  );
});
