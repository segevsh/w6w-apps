import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-delete.ts";

const device = {
  status: 200,
  body: {
    hostname: "old-runner",
    addresses: ["100.1.2.3"],
    tags: ["tag:ci"],
    isEphemeral: true,
  },
};
const ok = { status: 200, body: {} };

/** After the delete there is nothing left to report, so it reads first. */
Deno.test("device-delete: records what the device was before removing it", async () => {
  const { ctx, calls } = mockCtx([device, ok]);
  const result = await action.execute({ deviceId: "n5", confirm: true }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[1].method, "DELETE");
  assertEquals(new URL(calls[1].url).pathname, "/api/v2/device/n5");
  assertEquals(result.hostname, "old-runner");
  assertEquals(result.addresses, ["100.1.2.3"]);
  assertEquals(result.tags, ["tag:ci"]);
  assertEquals(result.wasEphemeral, true);
});

Deno.test("device-delete: refuses without confirmation and names the reversible option", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => await action.execute({ deviceId: "n5" }, ctx),
    Error,
  );
  assert(/no undelete/.test(err.message), err.message);
  assert(/device-authorize/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

/** Deleting does not stop Tailscale on the machine. */
Deno.test("device-delete: warns that a machine with a valid key can rejoin", async () => {
  const { ctx, logs } = mockCtx([device, ok]);
  await action.execute({ deviceId: "n5", confirm: true }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /still running on the machine/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("device-delete: is the one device action that is not idempotent", () => {
  assertEquals(action.idempotent, false);
  assert(/GONE, not archived/.test(action.description!), action.description);
});

Deno.test("device-delete: requires an id", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute({ confirm: true }, ctx), Error, "deviceId");
});
