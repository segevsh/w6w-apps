import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/droplet-resize.ts";

const droplet = (status: string) => ({
  status: 200,
  body: { droplet: { status, size_slug: "s-1vcpu-1gb" } },
});
const accepted = { status: 201, body: { action: { id: 7654321, status: "in-progress" } } };

Deno.test("droplet-resize: checks the droplet is off, then posts the resize", async () => {
  const { ctx, calls } = mockCtx([droplet("off"), accepted]);
  const result = await action.execute(
    { dropletId: "3164444", size: "s-2vcpu-4gb" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(JSON.parse(calls[1].body!), {
    type: "resize",
    size: "s-2vcpu-4gb",
    disk: false,
  });
  assertEquals(result.previousSize, "s-1vcpu-1gb");
  assertEquals(result.reversible, true);
});

/** The two forms differ by one boolean and only one is reversible. */
Deno.test("droplet-resize: resizing the disk needs an acknowledgement", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute(
      { dropletId: "3164444", size: "s-2vcpu-4gb", resizeDisk: true },
      ctx,
    );
  } catch (err) {
    message = String(err);
  }
  assert(/set `confirmPermanent`/.test(message), message);
  assert(/can never be made smaller/.test(message), message);
  assert(/CPU and RAM only, which can be undone/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("droplet-resize: an acknowledged disk resize is marked irreversible", async () => {
  const { ctx, logs } = mockCtx([droplet("off"), accepted]);
  const result = await action.execute({
    dropletId: "3164444",
    size: "s-2vcpu-4gb",
    resizeDisk: true,
    confirmPermanent: true,
  }, ctx) as Record<string, unknown>;
  assertEquals(result.diskResized, true);
  assertEquals(result.reversible, false);
  assertEquals(logs[0].level, "warn");
  assert(/cannot be undone/.test(logs[0].message), logs[0].message);
});

/** Not a formality — the droplet is unavailable for the whole operation. */
Deno.test("droplet-resize: a running droplet is refused with the reason", async () => {
  const { ctx, calls } = mockCtx([droplet("active")]);
  let message = "";
  try {
    await action.execute({ dropletId: "3164444", size: "s-2vcpu-4gb" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/is `active` and a resize needs it powered off/.test(message), message);
  assert(/tens of minutes/.test(message), message);
  assert(/`droplet-power` with `shutdown`/.test(message), message);
  assertEquals(calls.length, 1);
});

/** Something has to power it back on. */
Deno.test("droplet-resize: reports that the droplet stays off", async () => {
  const { ctx } = mockCtx([droplet("off"), accepted]);
  const result = await action.execute(
    { dropletId: "3164444", size: "s-2vcpu-4gb" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.willStayOff, true);
});

Deno.test("droplet-resize: a size is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ dropletId: "3164444" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`size` is required/.test(message), message);
  assertEquals(calls.length, 0);
});
