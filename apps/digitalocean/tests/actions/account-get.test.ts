import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-get.ts";

const account = (attributes: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    account: {
      email: "ops@example.com",
      status: "active",
      droplet_limit: 25,
      volume_limit: 100,
      reserved_ip_limit: 3,
      email_verified: true,
      ...attributes,
    },
  },
});

/** Hitting a limit is a 422 that reads as a bad size or region. */
Deno.test("account-get: surfaces the resource limits", async () => {
  const { ctx, calls } = mockCtx([account()]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.digitalocean.com/v2/account");
  assertEquals(result.dropletLimit, 25);
  assertEquals(result.volumeLimit, 100);
  assertEquals(result.reservedIpLimit, 3);
  assert(
    /reads as a bad size or region rather than as a quota/.test(action.description!),
    action.description,
  );
});

/** A locked account authenticates normally and refuses everything else. */
Deno.test("account-get: an inactive account is warned about", async () => {
  const { ctx, logs } = mockCtx([account({ status: "locked" })]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.status, "locked");
  assertEquals(logs[0].level, "warn");
  assert(/every operation on resources will be refused/.test(logs[0].message), logs[0].message);

  const active = mockCtx([account()]);
  await action.execute({}, active.ctx);
  assertEquals(active.logs.length, 0);
});

Deno.test("account-get: takes no parameters", () => {
  assertEquals(action.params, []);
  assertEquals(action.type, "read");
});

Deno.test("account-get: a sparse response does not throw", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.dropletLimit, undefined);
  assertEquals(result.emailVerified, false);
});
