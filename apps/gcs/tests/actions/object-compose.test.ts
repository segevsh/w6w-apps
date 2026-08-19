import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-compose.ts";

const composed = {
  status: 200,
  body: { name: "full.log", size: "3072", componentCount: 3, crc32c: "AAAAAA==" },
};

const base = {
  bucket: "uploads",
  sources: "part-000, part-001, part-002",
  destination: "full.log",
};

Deno.test("object-compose: posts the sources in order to the destination's compose path", async () => {
  const { ctx, calls } = mockCtx([composed]);
  const result = await action.execute(base, ctx) as Record<string, unknown>;
  assertEquals(
    new URL(calls[0].url).pathname,
    "/storage/v1/b/uploads/o/full.log/compose",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.sourceObjects, [
    { name: "part-000" },
    { name: "part-001" },
    { name: "part-002" },
  ]);
  assertEquals(result.componentCount, 3);
});

/** Compose in rounds; the error says so rather than reporting a count. */
Deno.test("object-compose: refuses more than 32 sources, saying how to do it anyway", async () => {
  const many = Array.from({ length: 33 }, (_, i) => `part-${i}`).join(",");
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ ...base, sources: many }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/names 33 objects and Cloud Storage composes at most 32/.test(message), message);
  assert(/Compose in rounds/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("object-compose: exactly 32 is allowed", async () => {
  const thirtyTwo = Array.from({ length: 32 }, (_, i) => `part-${i}`).join(",");
  const { ctx, calls } = mockCtx([composed]);
  await action.execute({ ...base, sources: thirtyTwo }, ctx);
  assertEquals(JSON.parse(calls[0].body!).sourceObjects.length, 32);
});

Deno.test("object-compose: at least one source is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ ...base, sources: "" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/at least one object/.test(message), message);
  assertEquals(calls.length, 0);
});

/** The type is not inherited from the sources. */
Deno.test("object-compose: the content type is set explicitly or left unset", async () => {
  const typed = mockCtx([composed]);
  await action.execute({ ...base, contentType: "text/plain" }, typed.ctx);
  assertEquals(JSON.parse(typed.calls[0].body!).destination, { contentType: "text/plain" });

  const untyped = mockCtx([composed]);
  await action.execute(base, untyped.ctx);
  assertEquals(JSON.parse(untyped.calls[0].body!).destination, {});
});

/** Essential when appending to the destination itself. */
Deno.test("object-compose: a generation precondition is passed through", async () => {
  const { ctx, calls } = mockCtx([composed]);
  await action.execute({ ...base, ifGenerationMatch: "1700000000000001" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("ifGenerationMatch"),
    "1700000000000001",
  );
});

/** A pipeline verifying by MD5 breaks on objects it assembled itself. */
Deno.test("object-compose: reports CRC32C, and says there is no MD5", async () => {
  const { ctx } = mockCtx([composed]);
  const result = await action.execute(base, ctx) as Record<string, unknown>;
  assertEquals(result.crc32c, "AAAAAA==");
  const outputs = (action.output as Array<{ key: string }>).map((o) => o.key);
  assertEquals(outputs.includes("md5Hash"), false);
  assert(/NO MD5/.test(action.description!), action.description);
});

/** The only way to append in a store whose objects are immutable. */
Deno.test("object-compose: says what it is for", () => {
  assert(/the only way to append/.test(action.description!), action.description);
});
