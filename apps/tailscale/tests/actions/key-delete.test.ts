import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/key-delete.ts";

const authKey = {
  status: 200,
  body: {
    keyType: "auth",
    description: "ci-runner",
    capabilities: { devices: { create: { ephemeral: false } } },
  },
};
const ephemeralKey = {
  status: 200,
  body: { keyType: "auth", capabilities: { devices: { create: { ephemeral: true } } } },
};
const apiToken = { status: 200, body: { keyType: "api", description: "prod token" } };
const ok = { status: 200, body: {} };

Deno.test("key-delete: revokes an auth key", async () => {
  const { ctx, calls } = mockCtx([authKey, ok]);
  const result = await action.execute({ keyId: "k1" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[1].url).pathname, "/api/v2/tailnet/-/keys/k1");
  assertEquals(calls[1].method, "DELETE");
  assertEquals(result.revoked, true);
  assertEquals(result.description, "ci-runner");
});

/** Machines already joined hold their own node keys. */
Deno.test("key-delete: says devices that already joined keep their access", async () => {
  const { ctx, logs } = mockCtx([authKey, ok]);
  const result = await action.execute({ keyId: "k1" }, ctx) as Record<string, unknown>;
  assertEquals(result.devicesStayJoined, true);
  assert(logs.some((l) => /keep their access/.test(l.message)), JSON.stringify(logs));
});

/** Ephemeral devices are tied to their key. */
Deno.test("key-delete: an ephemeral key's devices do not stay", async () => {
  const { ctx, logs } = mockCtx([ephemeralKey, ok]);
  const result = await action.execute({ keyId: "k2" }, ctx) as Record<string, unknown>;
  assertEquals(result.devicesStayJoined, false);
  assertEquals(logs.length, 0);
});

/** Revoking your own credential succeeds, then everything 401s. */
Deno.test("key-delete: refuses an API token without the acknowledgement", async () => {
  const { ctx, calls } = mockCtx([apiToken]);
  const err = await assertRejects(async () => await action.execute({ keyId: "k3" }, ctx), Error);
  assert(/looks like an outage/.test(err.message), err.message);
  assertEquals(calls.length, 1, "it must not delete before refusing");
});

Deno.test("key-delete: allowCredentialKey lets an API token through", async () => {
  const { ctx, calls } = mockCtx([apiToken, ok]);
  const result = await action.execute({ keyId: "k3", allowCredentialKey: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls.length, 2);
  assertEquals(result.keyType, "api");
  assertEquals(result.devicesStayJoined, false);
});

Deno.test("key-delete: requires an id", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`keyId` is required");
});
