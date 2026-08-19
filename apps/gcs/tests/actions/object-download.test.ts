import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-download.ts";

/** One query parameter between the file and a description of the file. */
Deno.test("object-download: sends alt=media, which is what returns the contents", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "a,b,c" }]);
  const result = await action.execute(
    { bucket: "uploads", object: "data/rows.csv" },
    ctx,
  ) as Record<string, unknown>;
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/storage/v1/b/uploads/o/data%2Frows.csv");
  assertEquals(url.searchParams.get("alt"), "media");
  assertEquals(result.content, "a,b,c");
  assertEquals(result.size, 5);
});

Deno.test("object-download: JSON is parsed as well as returned verbatim", async () => {
  const { ctx } = mockCtx([{ status: 200, body: '{"ok":true}' }]);
  const result = await action.execute(
    { bucket: "uploads", object: "config.json" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.json, { ok: true });
  assertEquals(result.content, '{"ok":true}');
});

/** Most objects are not JSON, which is not an error. */
Deno.test("object-download: a non-JSON object comes back as text with no json field", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "plain text" }]);
  const result = await action.execute(
    { bucket: "uploads", object: "notes.txt" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.json, undefined);
});

/** Moving a file through workflow data holds it in memory and stores it. */
Deno.test("object-download: an object over the ceiling is refused, pointing at signed URLs", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "x".repeat(2_000_001) }]);
  let message = "";
  try {
    await action.execute({ bucket: "uploads", object: "big.bin" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/2000001 bytes/.test(message), message);
  assert(/`object-signed-url`/.test(message), message);
});

Deno.test("object-download: a generation pins the version read", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "old" }]);
  await action.execute(
    { bucket: "uploads", object: "a.txt", generation: "1700000000000001" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).searchParams.get("generation"), "1700000000000001");
});

/** The contents are the caller's; the log records the name and the size. */
Deno.test("object-download: logs the name and size, never the contents", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: "secret-ish" }]);
  await action.execute({ bucket: "uploads", object: "notes.txt" }, ctx);
  assertEquals(logs[0].data, { name: "notes.txt", size: 10 });
  assertEquals(JSON.stringify(logs[0]).includes("secret-ish"), false);
});

Deno.test("object-download: says what alt=media separates", () => {
  assert(
    /`alt=media` is what separates the CONTENTS from the metadata/.test(action.description!),
    action.description,
  );
});
