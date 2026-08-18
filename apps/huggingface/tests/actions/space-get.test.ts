import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/space-get.ts";

Deno.test("space-get: reads one Space", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "a/demo", runtime: { stage: "RUNNING" }, sdk: "gradio" },
  }]);
  const result = await action.execute({ id: "a/demo" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://huggingface.co/api/spaces/a/demo");
  assertEquals((result.space as Record<string, unknown>).sdk, "gradio");
});

/** A Space that "does not work" is usually one that is merely asleep. */
Deno.test("space-get: the runtime stage distinguishes asleep from broken", async () => {
  for (const stage of ["RUNNING", "SLEEPING", "BUILDING", "RUNTIME_ERROR"]) {
    const { ctx } = mockCtx([{ status: 200, body: { id: "a/demo", runtime: { stage } } }]);
    const result = await action.execute({ id: "a/demo" }, ctx) as Record<string, unknown>;
    const space = result.space as { runtime?: { stage?: string } };
    assertEquals(space.runtime?.stage, stage);
  }
  assert(/SLEEPING/.test(action.description!), action.description);
});

Deno.test("space-get: a private Space is reported as private", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "a/demo", private: true } }]);
  const result = await action.execute({ id: "a/demo" }, ctx) as Record<string, unknown>;
  assertEquals(result.private, true);
});

Deno.test("space-get: an id is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({}, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/required/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("space-get: the output is keyed by its kind", () => {
  const outputs = action.output as Array<{ key: string }>;
  assertEquals(outputs.some((entry) => entry.key === "space"), true);
});
