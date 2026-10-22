import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { BASE, display, ok } from "./_shared.ts";
import action from "../../actions/model-pull.ts";

Deno.test("model-pull: posts to /api/pull with stream false", async () => {
  const { ctx, calls } = mockCtx([ok({ status: "success" })], { display });
  const result = await action.execute!({ model: "llama3.2:3b" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, `${BASE}/api/pull`);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { model: "llama3.2:3b", stream: false });
  assertEquals(result, { status: "success", success: true, model: "llama3.2:3b" });
});

Deno.test("model-pull: an error body inside a 200 is thrown, not returned as success", async () => {
  const { ctx } = mockCtx([ok({ error: "pull model manifest: file does not exist" })], {
    display,
  });
  const err = await assertRejects(async () => await action.execute!({ model: "nope" }, ctx));
  assert(/file does not exist/.test((err as Error).message));
});

Deno.test("model-pull: the description warns that it blocks until the download ends", () => {
  assert(/many minutes/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});

Deno.test("model-pull: requires a model", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ model: "" }, ctx),
    Error,
    "`model` is required",
  );
});
