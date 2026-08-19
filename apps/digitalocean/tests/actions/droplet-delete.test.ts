import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/droplet-delete.ts";

const droplet = (volumes: string[]) => ({
  status: 200,
  body: { droplet: { id: 3164444, name: "web-1", volume_ids: volumes } },
});

Deno.test("droplet-delete: reads the droplet, then destroys it", async () => {
  const { ctx, calls } = mockCtx([droplet([]), { status: 204 }]);
  const result = await action.execute(
    { dropletId: "3164444", confirmName: "web-1" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[1].method, "DELETE");
  assertEquals(result.deleted, true);
  assertEquals(result.orphanedVolumeCount, 0);
});

/** The most common way a DigitalOcean bill grows without anybody adding. */
Deno.test("droplet-delete: attached volumes must be acknowledged, and are named", async () => {
  const { ctx, calls } = mockCtx([droplet(["vol-a", "vol-b"])]);
  let message = "";
  try {
    await action.execute({ dropletId: "3164444", confirmName: "web-1" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/has 2 volume\(s\) attached/.test(message), message);
  assert(/does NOT destroy them/.test(message), message);
  assert(/keep billing per gigabyte/.test(message), message);
  assertEquals(calls.length, 1, "nothing was destroyed");
});

Deno.test("droplet-delete: the acknowledgement must match exactly", async () => {
  const { ctx, calls } = mockCtx([droplet(["vol-a", "vol-b"]), { status: 204 }]);
  const result = await action.execute({
    dropletId: "3164444",
    confirmName: "web-1",
    acknowledgeOrphans: 2,
  }, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 2);
  assertEquals(result.orphanedVolumeIds, ["vol-a", "vol-b"]);
});

Deno.test("droplet-delete: the name must be typed back", async () => {
  for (const confirm of [undefined, "", "3164444", "WEB-1"]) {
    const { ctx, calls } = mockCtx([droplet([])]);
    let message = "";
    try {
      await action.execute({ dropletId: "3164444", confirmName: confirm }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/`confirmName` must match the droplet name/.test(message), `${confirm}: ${message}`);
    assertEquals(calls.length, 1);
  }
});

Deno.test("droplet-delete: warns when volumes survive", async () => {
  const { ctx, logs } = mockCtx([droplet(["vol-a"]), { status: 204 }]);
  await action.execute({
    dropletId: "3164444",
    confirmName: "web-1",
    acknowledgeOrphans: 1,
  }, ctx);
  assertEquals(logs[0].level, "warn");
  assert(/volumes survive and keep billing/.test(logs[0].message), logs[0].message);
});

Deno.test("droplet-delete: says what it does not destroy", () => {
  assert(
    /VOLUMES, SNAPSHOTS and RESERVED IP survive/.test(action.description!),
    action.description,
  );
});
