import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/blob-list.ts";

const D = { display: { account: "myaccount" } };

const listing = {
  status: 200,
  body: `<EnumerationResults><Blobs>
    <Blob><Name>logs/a.log</Name><Properties><Content-Length>1024</Content-Length></Properties></Blob>
    <Blob><Name>logs/b.log</Name><Properties><Content-Length>2048</Content-Length></Properties></Blob>
    <BlobPrefix><Name>logs/2026/</Name></BlobPrefix>
  </Blobs><NextMarker>tok</NextMarker></EnumerationResults>`,
};

Deno.test("blob-list: lists a container's blobs", async () => {
  const { ctx, calls } = mockCtx([listing], D);
  const result = await action.execute({ container: "uploads" }, ctx) as Record<string, unknown>;
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/uploads");
  assertEquals(url.searchParams.get("restype"), "container");
  assertEquals(url.searchParams.get("comp"), "list");
  assertEquals(result.names, ["logs/a.log", "logs/b.log"]);
  assertEquals(result.nextMarker, "tok");
});

/**
 * The mistake this guards: a reader walking `Blob` elements sees an empty
 * folder and no error, because the subfolders are `BlobPrefix` siblings.
 */
Deno.test("blob-list: returns the synthetic folders separately, and counts them", async () => {
  const { ctx, calls, logs } = mockCtx([listing], D);
  const result = await action.execute(
    { container: "uploads", prefix: "logs/", delimiter: "/" },
    ctx,
  ) as Record<string, unknown>;
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("prefix"), "logs/");
  assertEquals(url.searchParams.get("delimiter"), "/");
  assertEquals(result.prefixes, ["logs/2026/"]);
  assertEquals(result.prefixCount, 1);
  assertEquals(logs[0].data, { count: 2, prefixCount: 1 });
});

/** XML has no numbers; Content-Length arrives as text. */
Deno.test("blob-list: sums the sizes, converting from the XML's strings", async () => {
  const { ctx } = mockCtx([listing], D);
  const result = await action.execute({ container: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(result.totalBytes, 3072);
  const blobs = result.blobs as Array<Record<string, unknown>>;
  assertEquals(blobs[0]["Content-Length"], "1024", "the raw value stays a string");
});

/** All four are billed and all four are hidden by default. */
Deno.test("blob-list: the include list is passed through comma-joined", async () => {
  const { ctx, calls } = mockCtx([listing], D);
  await action.execute(
    { container: "uploads", include: "snapshots, versions, deleted, uncommittedblobs" },
    ctx,
  );
  assertEquals(
    new URL(calls[0].url).searchParams.get("include"),
    "snapshots,versions,deleted,uncommittedblobs",
  );
});

/** The one that explains a container billing for more than it appears to hold. */
Deno.test("blob-list: names uncommitted blobs in its own description", () => {
  assert(/UNCOMMITTED/.test(action.description!), action.description);
  const include = action.params!.find((p) => p.key === "include")!;
  assert(/billing for more than it appears to hold/.test(include.hint!), include.hint);
});

Deno.test("blob-list: an empty container is not an error", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<EnumerationResults><Blobs /><NextMarker /></EnumerationResults>",
  }], D);
  const result = await action.execute({ container: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.prefixes, []);
  assertEquals(result.totalBytes, 0);
  assertEquals(result.nextMarker, undefined);
});
