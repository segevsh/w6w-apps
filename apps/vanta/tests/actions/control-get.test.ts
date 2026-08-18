import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/control-get.ts";

Deno.test("control-get: fetches one control by id", async () => {
  const { ctx, calls } = mockCtx([one({ id: "c1", name: "Access reviewed" })], { display });
  const result = await action.execute!({ controlId: "c1" }, ctx) as { name: string };
  assertEquals(calls[0].url, "https://api.vanta.com/v1/controls/c1");
  assertEquals(result.name, "Access reviewed");
});

Deno.test("control-get: needs a control id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "controlId");
  assertEquals(calls.length, 0);
});

/** The auditor never asks whether a test is passing. */
Deno.test("control-get: frames the evidence mapping as the auditor's question", () => {
  assert(/auditor actually asks/.test(action.description!), action.description);
});
