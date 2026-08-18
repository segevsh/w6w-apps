import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/system-erase.ts";

const display = { display: { region: "us" } };

/** The most destructive call this app can make, and it queues. */
Deno.test("system-erase: refuses to run without an explicit confirmation", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(
    async () => await action.execute!({ systemId: "s1" }, ctx),
    Error,
    "cannot be unqueued",
  );
  assertEquals(calls.length, 0);
});

Deno.test("system-erase: with confirmation it POSTs the erase builtin, logging at warn", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200 }], display);
  const result = await action.execute!({ systemId: "s1", confirm: true }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/systems/s1/command/builtin/erase");
  assertEquals(result, { systemId: "s1", erased: true });
  assertEquals(logs[0].level, "warn");
  // The log line may be the only record of who sent it.
  assertEquals((logs[0].data as { id: string }).id, "s1");
});

/** An erase aimed at an offline machine fires when it next comes online. */
Deno.test("system-erase: the queueing behaviour is stated, not buried", () => {
  assert(action.description!.includes("Queues"), action.description);
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "erased")!.label.includes("queued for later"));
  assertEquals(action.idempotent, false);
});

Deno.test("system-erase: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(
    async () => await action.execute!({ confirm: true }, ctx),
    Error,
    "`systemId`",
  );
  assertEquals(calls.length, 0);
});
