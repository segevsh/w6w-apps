import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display } from "./_shared.ts";
import action from "../../actions/instance-info.ts";

/**
 * The root endpoint answers without the `{time, status, result}` envelope
 * every other endpoint uses — the client returns the body as-is when there is
 * no `result` key.
 */
Deno.test("instance-info: reads the unenveloped root response", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { title: "qdrant - vector search engine", version: "1.12.4", commit: "abc123" },
    },
  ], { display });
  const result = await action.execute!({}, ctx) as { version: string };
  assertEquals(calls[0].url, "https://xyz.cloud.qdrant.io:6333/");
  assertEquals(calls[0].method, "GET");
  assertEquals(result.version, "1.12.4");
});

/** Version drift is real on a self-hosted database. */
Deno.test("instance-info: says why the version matters", () => {
  assert(/points\/query/.test(action.description!), action.description);
  assertEquals(action.params?.length ?? 0, 0);
});

Deno.test("instance-info: a rejected key still fails rather than reading as an old version", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { status: { error: "Invalid api key" } } }], {
    display,
  });
  const error = await assertRejects(async () => await action.execute!({}, ctx), Error);
  assert(/read-only/.test(error.message), error.message);
});

Deno.test("instance-info: needs a connection carrying a URL", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "no Qdrant URL recorded");
});
