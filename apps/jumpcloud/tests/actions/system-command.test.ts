import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/system-command.ts";

const display = { display: { region: "us" } };

Deno.test("system-command: POSTs the chosen builtin", async () => {
  for (const command of ["lock", "restart", "shutdown"]) {
    const { ctx, calls } = mockCtx([{ status: 200 }], display);
    const result = await action.execute!({ systemId: "s1", command }, ctx);
    assertEquals(calls[0].method, "POST");
    assertEquals(new URL(calls[0].url).pathname, `/api/systems/s1/command/builtin/${command}`);
    assertEquals(result, { systemId: "s1", command, queued: true });
  }
});

/** One wrong dropdown value must not be able to wipe a laptop. */
Deno.test("system-command: erase is not reachable from here", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(
    async () => await action.execute!({ systemId: "s1", command: "erase" }, ctx),
    Error,
    "`command` must be one of",
  );
  assertEquals(calls.length, 0);
});

/** Success means accepted; an offline device runs it whenever it returns. */
Deno.test("system-command: the output says queued, not done", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "queued")!.label.includes("later if not"));
  assertEquals(action.idempotent, false);
});

Deno.test("system-command: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`systemId`");
  assertEquals(calls.length, 0);
});
