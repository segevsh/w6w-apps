import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-upload.ts";

const written = (attributes: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    name: "reports/summary.json",
    generation: "1700000000000001",
    size: "11",
    metageneration: "1",
    ...attributes,
  },
});

const base = { bucket: "uploads", name: "reports/summary.json", content: '{"ok":true}' };

/**
 * The most common reason a hand-built upload fails: content goes to
 * /upload/storage/v1, not /storage/v1.
 */
Deno.test("object-upload: posts to the upload path, not the metadata one", async () => {
  const { ctx, calls } = mockCtx([written()]);
  await action.execute(base, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/upload/storage/v1/b/uploads/o");
  assertEquals(url.searchParams.get("uploadType"), "media");
  assertEquals(calls[0].method, "POST");
});

/** On upload the object does not exist, so the name is a parameter. */
Deno.test("object-upload: the name goes in the query, not the path", async () => {
  const { ctx, calls } = mockCtx([written()]);
  await action.execute(base, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("name"), "reports/summary.json");
  assertEquals(calls[0].body, '{"ok":true}');
});

Deno.test("object-upload: the content type is the object's, not JSON", async () => {
  const { ctx, calls } = mockCtx([written()]);
  await action.execute({ ...base, contentType: "application/json" }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/json");

  const plain = mockCtx([written()]);
  await action.execute(base, plain.ctx);
  assertEquals(plain.calls[0].headers["content-type"], "text/plain");
});

/** Without a precondition, an upload replaces what is there and returns 200. */
Deno.test("object-upload: ifNotExists sends generation zero", async () => {
  const { ctx, calls } = mockCtx([written()]);
  await action.execute({ ...base, ifNotExists: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("ifGenerationMatch"), "0");

  const plain = mockCtx([written()]);
  await action.execute(base, plain.ctx);
  assertEquals(new URL(plain.calls[0].url).searchParams.get("ifGenerationMatch"), null);
});

Deno.test("object-upload: a generation is the compare-and-swap form", async () => {
  const { ctx, calls } = mockCtx([written()]);
  await action.execute({ ...base, ifGenerationMatch: "1700000000000001" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("ifGenerationMatch"),
    "1700000000000001",
  );
});

/** They mean different things and cannot both be sent. */
Deno.test("object-upload: the two preconditions are mutually exclusive", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ ...base, ifNotExists: true, ifGenerationMatch: "1" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/not both/.test(message), message);
  assertEquals(calls.length, 0);
});

/** A 412 means the safety worked. */
Deno.test("object-upload: a conflicting write explains the 412", async () => {
  const { ctx } = mockCtx([{ status: 412, body: { error: { message: "Precondition Failed" } } }]);
  let message = "";
  try {
    await action.execute({ ...base, ifNotExists: true }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/which means it worked/.test(message), message);
});

/** A media upload carries content only, so metadata is a second call. */
Deno.test("object-upload: metadata and cache control are PATCHed afterwards", async () => {
  const { ctx, calls } = mockCtx([written(), written()]);
  await action.execute(
    { ...base, metadata: '{"owner":"jane"}', cacheControl: "no-store" },
    ctx,
  );
  assertEquals(calls.length, 2);
  assertEquals(calls[1].method, "PATCH");
  const body = JSON.parse(calls[1].body!);
  assertEquals(body.metadata, { owner: "jane" });
  assertEquals(body.cacheControl, "no-store");

  const plain = mockCtx([written()]);
  await action.execute(base, plain.ctx);
  assertEquals(plain.calls.length, 1, "no second call when there is nothing to set");
});

Deno.test("object-upload: reports whether something was replaced", async () => {
  const fresh = mockCtx([written({ metageneration: "1" })]);
  const first = await action.execute(base, fresh.ctx) as Record<string, unknown>;
  assertEquals(first.overwroteExisting, false);

  const replaced = mockCtx([written({ metageneration: "3" })]);
  const again = await action.execute(base, replaced.ctx) as Record<string, unknown>;
  assertEquals(again.overwroteExisting, true);
});

/** The contents are the caller's. */
Deno.test("object-upload: logs the name and size, never the content", async () => {
  const { ctx, logs } = mockCtx([written()]);
  await action.execute({ ...base, content: "secret-ish" }, ctx);
  assertEquals(logs[0].data, { name: "reports/summary.json", size: 10 });
  assertEquals(JSON.stringify(logs[0]).includes("secret-ish"), false);
});

Deno.test("object-upload: says it overwrites by default", () => {
  assert(
    /This OVERWRITES an existing name and returns 200/.test(action.description!),
    action.description,
  );
  assertEquals(action.idempotent, true);
});
