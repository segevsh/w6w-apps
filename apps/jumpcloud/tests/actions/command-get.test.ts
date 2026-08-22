import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/command-get.ts";

const display = { display: { region: "us" } };

Deno.test("command-get: reads one command by id", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _id: "c1", command: "echo hi" } }],
    display,
  );
  const result = await action.execute!({ commandId: "c1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://console.jumpcloud.com/api/commands/c1");
  assertEquals(result.command, "echo hi");
});

/** The bindings are what a run with no explicit device list fans out to. */
Deno.test("command-get: surfaces the bindings, and says what they mean", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "systems")!.label.includes("what a run with no list"));
  assert(outputs.some((o) => o.key === "systemgroups"));
});

Deno.test("command-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`commandId`");
  assertEquals(calls.length, 0);
});
