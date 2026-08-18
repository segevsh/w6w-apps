import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/model-list.ts";

const display = { projectId: "proj_1" };
const models = (stt: unknown[], tts: unknown[]) => ({ status: 200, body: { stt, tts } });

Deno.test("model-list: reads the project's models by default", async () => {
  const { ctx, calls } = mockCtx([models([{ name: "nova-3" }], [{ name: "aura-2-thalia-en" }])], {
    display,
  });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://api.deepgram.com/v1/projects/proj_1/models",
  );
  assertEquals(result.count, 2);
});

/** An enterprise contract can be narrower than the public catalogue. */
Deno.test("model-list: the public catalogue is a different path", async () => {
  const { ctx, calls } = mockCtx([models([], [])], { display });
  await action.execute!({ scope: "public" }, ctx);
  assertEquals(calls[0].url.split("?")[0], "https://api.deepgram.com/v1/models");
});

/** Needed to resolve the model named on an old request. */
Deno.test("model-list: outdated models are opt-in", async () => {
  const { ctx, calls } = mockCtx([models([], [])], { display });
  await action.execute!({ includeOutdated: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("include_outdated"), "true");
});

/** Deepgram names its voices as models too. */
Deno.test("model-list: says voices are models", () => {
  assert(/voices/.test(action.description!), action.description);
});
