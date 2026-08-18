import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/intent-handle.ts";

const handled = ok({
  speech: { plain: { speech: "Turned on the kitchen light" } },
  response_type: "action_done",
  data: { success: [{ id: "light.kitchen", name: "Kitchen light" }], failed: [] },
});

/** Home Assistant resolves "kitchen light" the way the voice assistant does. */
Deno.test("intent-handle: posts the intent and its slots, and lifts the speech out", async () => {
  const { ctx, calls } = mockCtx([handled], { display });
  const result = await action.execute!({
    name: "HassTurnOn",
    data: '{"name":"kitchen light"}',
  }, ctx) as { speech: string; matched: unknown[] };
  assertEquals(calls[0].url, "https://abc.ui.nabu.casa/api/intent/handle");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "HassTurnOn",
    data: { name: "kitchen light" },
  });
  assertEquals(result.speech, "Turned on the kitchen light");
  assertEquals(result.matched.length, 1);
});

Deno.test("intent-handle: things it could not resolve come back separately", async () => {
  const { ctx } = mockCtx([
    ok({ data: { success: [], failed: [{ name: "kitchen lgiht" }] } }),
  ], { display });
  const result = await action.execute!({ name: "HassTurnOn" }, ctx) as {
    matched: unknown[];
    unmatched: unknown[];
  };
  assertEquals(result.matched.length, 0);
  assertEquals(result.unmatched.length, 1);
});

Deno.test("intent-handle: no slots still posts an object", async () => {
  const { ctx, calls } = mockCtx([handled], { display });
  await action.execute!({ name: "HassGetState" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).data, {});
});

Deno.test("intent-handle: needs an intent name", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`name` is required");
  assertEquals(calls.length, 0);
});

Deno.test("intent-handle: logs the intent and match count, never the slots", async () => {
  const { ctx, logs } = mockCtx([handled], { display });
  await action.execute!({ name: "HassTurnOn", data: '{"name":"bedroom light"}' }, ctx);
  assert(!JSON.stringify(logs).includes("bedroom"), JSON.stringify(logs));
  assertEquals(logs[0].data, { name: "HassTurnOn", matched: 1, responseType: "action_done" });
});

/** Right for human input, wrong when the entity is already known. */
Deno.test("intent-handle: says when to use it and when not to", () => {
  assert(
    /Right for human input, wrong when the entity is known/.test(action.description!),
    action.description,
  );
});
