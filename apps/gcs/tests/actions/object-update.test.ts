import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-update.ts";

const patched = {
  status: 200,
  body: { name: "a.txt", generation: "1700000000000001", metageneration: "3" },
};

Deno.test("object-update: PATCHes the object's metadata", async () => {
  const { ctx, calls } = mockCtx([patched]);
  const result = await action.execute(
    { bucket: "uploads", object: "a.txt", contentType: "text/csv" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!).contentType, "text/csv");
  assertEquals(result.changed, ["contentType"]);
});

/** Metadata edits bump the metageneration; the bytes did not move. */
Deno.test("object-update: the generation is unchanged and the metageneration is not", async () => {
  const { ctx } = mockCtx([patched]);
  const result = await action.execute(
    { bucket: "uploads", object: "a.txt", cacheControl: "no-store" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.generation, "1700000000000001");
  assertEquals(result.metageneration, "3");
});

/** Sending one key leaves the object with only that key. */
Deno.test("object-update: custom metadata replaces the whole map, and says so", async () => {
  const { ctx, logs } = mockCtx([patched]);
  await action.execute(
    { bucket: "uploads", object: "a.txt", metadata: '{"owner":"jane"}' },
    ctx,
  );
  assert(/any key not in this call is now gone/.test(logs[0].message), logs[0].message);
  assertEquals(logs[0].data, { name: "a.txt", keyCount: 1 });
  assert(/REPLACES the whole map/.test(action.description!), action.description);
});

/** An empty object is how the map is cleared, and must survive compaction. */
Deno.test("object-update: an empty metadata object clears it rather than being dropped", async () => {
  const { ctx, calls } = mockCtx([patched]);
  await action.execute({ bucket: "uploads", object: "a.txt", metadata: "{}" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assert("metadata" in body, "the empty map was sent");
  assertEquals(body.metadata, {});
});

Deno.test("object-update: metadata must be an object, not a list", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ bucket: "uploads", object: "a.txt", metadata: '["a"]' }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/must be an object/.test(message), message);
  assertEquals(calls.length, 0);
});

/** Metadata edits bump the metageneration, not the generation. */
Deno.test("object-update: the precondition is on the metageneration, and says so", async () => {
  const { ctx, calls } = mockCtx([patched]);
  await action.execute({
    bucket: "uploads",
    object: "a.txt",
    contentType: "text/csv",
    ifMetagenerationMatch: "2",
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("ifMetagenerationMatch"), "2");
  const param = action.params!.find((p) => p.key === "ifMetagenerationMatch")!;
  assert(/METAgeneration, not a generation/.test(param.hint!), param.hint);
});

/** A colder class starts its minimum billed duration afresh. */
Deno.test("object-update: the storage class options name their minimums", () => {
  const options = action.params!.find((p) => p.key === "storageClass")!.options as Array<
    { value: string; label: string }
  >;
  assert(options.some((o) => /365-day minimum/.test(o.label)), JSON.stringify(options));
  assert(/restarts its minimum billed duration/.test(action.description!), action.description);
});

Deno.test("object-update: a PATCH with nothing in it is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ bucket: "uploads", object: "a.txt" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/nothing to change/.test(message), message);
  assertEquals(calls.length, 0);
});
