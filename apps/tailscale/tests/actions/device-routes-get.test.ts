import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-routes-get.ts";

/** Traffic flows only where advertised and enabled overlap. */
Deno.test("device-routes-get: returns the overlap and both differences", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      advertisedRoutes: ["10.0.0.0/16", "192.168.1.0/24"],
      enabledRoutes: ["10.0.0.0/16", "172.16.0.0/12"],
    },
  }]);
  const result = await action.execute({ deviceId: "n1" }, ctx) as Record<string, unknown>;

  assertEquals(new URL(calls[0].url).pathname, "/api/v2/device/n1/routes");
  assertEquals(result.active, ["10.0.0.0/16"]);
  assertEquals(result.advertisedNotEnabled, ["192.168.1.0/24"], "offered and never approved");
  assertEquals(result.enabledNotAdvertised, ["172.16.0.0/12"], "approved for nothing on offer");
});

/** The same field shape, a completely different decision. */
Deno.test("device-routes-get: an exit node needs the route both advertised and enabled", async () => {
  const both = mockCtx([{
    status: 200,
    body: { advertisedRoutes: ["0.0.0.0/0", "::/0"], enabledRoutes: ["0.0.0.0/0", "::/0"] },
  }]);
  const live = await action.execute({ deviceId: "n1" }, both.ctx) as Record<string, unknown>;
  assertEquals(live.isExitNode, true);

  const offered = mockCtx([{
    status: 200,
    body: { advertisedRoutes: ["0.0.0.0/0"], enabledRoutes: [] },
  }]);
  const waiting = await action.execute({ deviceId: "n1" }, offered.ctx) as Record<string, unknown>;
  assertEquals(waiting.isExitNode, false);
  assertEquals(waiting.advertisesExitNode, true, "offering is not the same as carrying");
});

Deno.test("device-routes-get: a device with no routes is empty rather than undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute({ deviceId: "n1" }, ctx) as Record<string, unknown>;
  assertEquals(result.advertised, []);
  assertEquals(result.enabled, []);
  assertEquals(result.isExitNode, false);
});

Deno.test("device-routes-get: requires an id", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`deviceId` is required");
});

Deno.test("device-routes-get: says a half-configured subnet router carries nothing", () => {
  assert(/silently carries nothing/.test(action.description!), action.description);
});
