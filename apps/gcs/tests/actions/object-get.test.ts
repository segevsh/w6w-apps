import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-get.ts";

const object = (attributes: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    name: "logs/app.log",
    size: "1024",
    contentType: "text/plain",
    generation: "1700000000000001",
    md5Hash: "1B2M2Y8AsgTpgAmY7PhCfg==",
    crc32c: "AAAAAA==",
    storageClass: "STANDARD",
    updated: "2026-08-19T10:00:00Z",
    ...attributes,
  },
});

/** An unencoded slash addresses a URL that does not exist. */
Deno.test("object-get: encodes the object's slashes into the path", async () => {
  const { ctx, calls } = mockCtx([object()]);
  await action.execute({ bucket: "uploads", object: "logs/2026/app.log" }, ctx);
  assertEquals(
    calls[0].url,
    "https://storage.googleapis.com/storage/v1/b/uploads/o/logs%2F2026%2Fapp.log",
  );
});

/** The generation is the only concurrency control this API has. */
Deno.test("object-get: surfaces the generation, which makes a safe write possible", async () => {
  const { ctx } = mockCtx([object()]);
  const result = await action.execute(
    { bucket: "uploads", object: "logs/app.log" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.generation, "1700000000000001");
  assert(
    /`generation` is what makes a safe overwrite possible/.test(action.description!),
    action.description,
  );
});

/** `size` is a string in the API, because it can exceed a safe integer. */
Deno.test("object-get: converts the size to a number", async () => {
  const { ctx } = mockCtx([object({ size: "9007199254740993" })]);
  const result = await action.execute(
    { bucket: "uploads", object: "big.bin" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(typeof result.size, "number");
});

/** A composed object has a CRC32C and no MD5 at all. */
Deno.test("object-get: reports both checksums, and MD5 being absent is not an error", async () => {
  const plain = mockCtx([object()]);
  const normal = await action.execute(
    { bucket: "uploads", object: "a.txt" },
    plain.ctx,
  ) as Record<string, unknown>;
  assertEquals(normal.md5Hash, "1B2M2Y8AsgTpgAmY7PhCfg==");

  const composed = mockCtx([object({ md5Hash: undefined, componentCount: 4 })]);
  const built = await action.execute(
    { bucket: "uploads", object: "full.log" },
    composed.ctx,
  ) as Record<string, unknown>;
  assertEquals(built.md5Hash, undefined);
  assertEquals(built.crc32c, "AAAAAA==");
  assert(/composed object has none at all/.test(action.description!), action.description);
});

Deno.test("object-get: a generation reads a specific version", async () => {
  const { ctx, calls } = mockCtx([object()]);
  await action.execute(
    { bucket: "uploads", object: "a.txt", generation: "1700000000000001" },
    ctx,
  );
  assertEquals(
    new URL(calls[0].url).searchParams.get("generation"),
    "1700000000000001",
  );
});

Deno.test("object-get: reports what deleting an archived object still costs", async () => {
  const { ctx } = mockCtx([object({ storageClass: "COLDLINE" })]);
  const result = await action.execute(
    { bucket: "uploads", object: "a.txt" },
    ctx,
  ) as Record<string, unknown>;
  assert(/90 days/.test(String(result.minimumDurationNote)), String(result.minimumDurationNote));
});

Deno.test("object-get: an object name is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ bucket: "uploads" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/required/.test(message), message);
  assertEquals(calls.length, 0);
});
