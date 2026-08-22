import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/system-get.ts";

const display = { display: { region: "us" } };

Deno.test("system-get: reads one device by id", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _id: "s1", hostname: "ada-mbp" } }],
    display,
  );
  const result = await action.execute!({ systemId: "s1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://console.jumpcloud.com/api/systems/s1");
  assertEquals(result.hostname, "ada-mbp");
});

/** `active` is about agent check-in, not whether the machine is powered on. */
Deno.test("system-get: the output says what `active` actually means", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "active")!.label.includes("not 'powered on now'"));
});

Deno.test("system-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`systemId`");
  assertEquals(calls.length, 0);
});
