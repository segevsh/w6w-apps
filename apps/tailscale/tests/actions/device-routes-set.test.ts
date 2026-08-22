import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-routes-set.ts";

const current = (advertised: string[], enabled: string[]) => ({
  status: 200,
  body: { advertisedRoutes: advertised, enabledRoutes: enabled },
});

Deno.test("device-routes-set: replace posts exactly the routes asked for", async () => {
  const advertised = ["10.0.0.0/16", "192.168.1.0/24"];
  const { ctx, calls } = mockCtx([
    current(advertised, ["10.0.0.0/16"]),
    current(advertised, ["192.168.1.0/24"]),
  ]);
  const result = await action.execute(
    { deviceId: "n1", routes: "192.168.1.0/24" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[1].method, "POST");
  assertEquals(JSON.parse(calls[1].body!), { routes: ["192.168.1.0/24"] });
  assertEquals(result.withdrawn, ["10.0.0.0/16"]);
});

/** A naive replace takes a network segment dark with no error anywhere. */
Deno.test("device-routes-set: warns about the approvals a replace withdraws", async () => {
  const { ctx, logs } = mockCtx([
    current(["10.0.0.0/16", "192.168.1.0/24"], ["10.0.0.0/16"]),
    current(["10.0.0.0/16", "192.168.1.0/24"], ["192.168.1.0/24"]),
  ]);
  await action.execute({ deviceId: "n1", routes: "192.168.1.0/24" }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /traffic to them stops with no error/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("device-routes-set: add merges with what is already enabled", async () => {
  const advertised = ["10.0.0.0/16", "192.168.1.0/24"];
  const { ctx, calls } = mockCtx([
    current(advertised, ["10.0.0.0/16"]),
    current(advertised, advertised),
  ]);
  const result = await action.execute(
    { deviceId: "n1", routes: "192.168.1.0/24", mode: "add" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(JSON.parse(calls[1].body!), { routes: ["10.0.0.0/16", "192.168.1.0/24"] });
  assertEquals(result.withdrawn, []);
});

Deno.test("device-routes-set: remove withdraws only the named routes", async () => {
  const advertised = ["10.0.0.0/16", "192.168.1.0/24"];
  const { ctx, calls } = mockCtx([
    current(advertised, advertised),
    current(advertised, ["10.0.0.0/16"]),
  ]);
  await action.execute({ deviceId: "n1", routes: "192.168.1.0/24", mode: "remove" }, ctx);
  assertEquals(JSON.parse(calls[1].body!), { routes: ["10.0.0.0/16"] });
});

/** Approving all of the internet is not the same size of decision. */
Deno.test("device-routes-set: refuses to approve an exit node without acknowledgement", async () => {
  const { ctx, calls } = mockCtx([current(["0.0.0.0/0", "::/0"], [])]);
  const err = await assertRejects(
    async () => await action.execute({ deviceId: "n1", routes: "0.0.0.0/0, ::/0" }, ctx),
    Error,
  );
  assert(/EXIT NODE/.test(err.message), err.message);
  assertEquals(calls.length, 1, "it must not post before refusing");
});

Deno.test("device-routes-set: allowExitNode lets it through", async () => {
  const advertised = ["0.0.0.0/0", "::/0"];
  const { ctx, calls } = mockCtx([current(advertised, []), current(advertised, advertised)]);
  const result = await action.execute(
    { deviceId: "n1", routes: "0.0.0.0/0, ::/0", allowExitNode: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls.length, 2);
  assertEquals(result.isExitNode, true);
});

/** A device that already routes everything is not being made an exit node again. */
Deno.test("device-routes-set: no acknowledgement needed when it was already an exit node", async () => {
  const advertised = ["0.0.0.0/0", "::/0", "10.0.0.0/16"];
  const { ctx } = mockCtx([
    current(advertised, ["0.0.0.0/0", "::/0"]),
    current(advertised, ["0.0.0.0/0", "::/0", "10.0.0.0/16"]),
  ]);
  const result = await action.execute(
    { deviceId: "n1", routes: "10.0.0.0/16", mode: "add" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.isExitNode, true);
});

/** Advertising is set on the machine, not through the API. */
Deno.test("device-routes-set: warns about routes the device does not advertise", async () => {
  const { ctx, logs } = mockCtx([
    current(["10.0.0.0/16"], []),
    current(["10.0.0.0/16"], ["172.16.0.0/12"]),
  ]);
  const result = await action.execute({ deviceId: "n1", routes: "172.16.0.0/12" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.notAdvertised, ["172.16.0.0/12"]);
  assert(
    logs.some((l) => /tailscale up --advertise-routes/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("device-routes-set: refuses an empty list rather than emptying the router", async () => {
  const { ctx } = mockCtx([]);
  const err = await assertRejects(
    async () => await action.execute({ deviceId: "n1", routes: "" }, ctx),
    Error,
  );
  assert(/out of service/.test(err.message), err.message);
});
