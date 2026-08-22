import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/command-run.ts";

const display = { display: { region: "us" } };

Deno.test("command-run: POSTs the command id and the named devices", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { queueIds: ["q1"] } }], display);
  const result = await action.execute!({ commandId: "c1", systemIds: "s1, s2" }, ctx) as {
    queueIds: string[];
    queued: boolean;
  };
  assertEquals(new URL(calls[0].url).pathname, "/api/runCommand");
  assertEquals(JSON.parse(calls[0].body!), { _id: "c1", systemIds: ["s1", "s2"] });
  assertEquals(result.queueIds, ["q1"]);
  assertEquals(result.queued, true);
});

/**
 * Omitting systemIds does not mean "nowhere" — JumpCloud runs on every device
 * bound to the command, which can be the fleet. So it must be chosen, not
 * defaulted into.
 */
Deno.test("command-run: refuses a call with no target at all", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(
    async () => await action.execute!({ commandId: "c1" }, ctx),
    Error,
    "no target",
  );
  assertEquals(calls.length, 0);
});

Deno.test("command-run: the fan-out is available, but only as an explicit choice", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], display);
  await action.execute!({ commandId: "c1", useCommandBindings: true }, ctx);
  // No systemIds on the wire is what makes JumpCloud use the command's bindings.
  assertEquals(JSON.parse(calls[0].body!), { _id: "c1" });
});

Deno.test("command-run: naming devices AND asking for the bindings is refused", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(
    async () =>
      await action.execute!({ commandId: "c1", systemIds: "s1", useCommandBindings: true }, ctx),
    Error,
    "pick one target",
  );
  assertEquals(calls.length, 0);
});

/** The response is a queue receipt, not a result. */
Deno.test("command-run: the output says queued, and points nowhere near success", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "queued")!.label.includes("NOT a statement"));
  assertEquals(action.idempotent, false);
});

Deno.test("command-run: a blank command id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(
    async () => await action.execute!({ systemIds: "s1" }, ctx),
    Error,
    "`commandId`",
  );
  assertEquals(calls.length, 0);
});
