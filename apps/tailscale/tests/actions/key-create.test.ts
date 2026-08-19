import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/key-create.ts";

const created = {
  status: 200,
  body: { key: "tskey-auth-SECRET", id: "k9", expires: "2026-09-18T00:00:00Z" },
};

/** The careful end of every choice, because the other end is easy to ask for. */
Deno.test("key-create: defaults to single-use, ephemeral and not preauthorized", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute({ description: "ci-runner", tags: "tag:ci" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/api/v2/tailnet/-/keys");
  const body = JSON.parse(calls[0].body!) as Record<string, never>;
  assertEquals(body.keyType, "auth");
  assertEquals(body.expirySeconds, 30 * 86_400);
  assertEquals(body.capabilities, {
    devices: {
      create: { reusable: false, ephemeral: true, preauthorized: false, tags: ["tag:ci"] },
    },
  });
});

/** The secret is returned once and never again. */
Deno.test("key-create: returns the key and never logs it", async () => {
  const { ctx, logs } = mockCtx([created]);
  const result = await action.execute({ description: "ci", tags: "tag:ci" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.authKey, "tskey-auth-SECRET");
  assertEquals(result.id, "k9");
  const logged = JSON.stringify(logs);
  assert(!/tskey-auth-SECRET/.test(logged), logged);
  assert(/k9/.test(logged), logged);
});

Deno.test("key-create: warns when a key is both reusable and preauthorized", async () => {
  const { ctx, logs } = mockCtx([created]);
  await action.execute(
    { description: "shared", tags: "tag:ci", reusable: true, preauthorized: true },
    ctx,
  );
  assert(
    logs.some((l) => l.level === "warn" && /without device approval/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** A key with no tags creates devices owned by the person who made it. */
Deno.test("key-create: notes an untagged key, and omits the tags field entirely", async () => {
  const { ctx, calls, logs } = mockCtx([created]);
  await action.execute({ description: "untagged" }, ctx);
  const create = (JSON.parse(calls[0].body!) as {
    capabilities: { devices: { create: Record<string, unknown> } };
  }).capabilities.devices.create;
  assertEquals("tags" in create, false);
  assert(logs.some((l) => /ACL rules written against a tag will not apply/.test(l.message)));
});

Deno.test("key-create: enforces Tailscale's 90-day cap and its 50-character description", async () => {
  const { ctx, calls } = mockCtx([]);
  const long = await assertRejects(
    async () => await action.execute({ description: "x".repeat(51) }, ctx),
    Error,
  );
  assert(/at most 50 characters/.test(long.message), long.message);

  const far = await assertRejects(
    async () => await action.execute({ description: "ci", expiryDays: 365 }, ctx),
    Error,
  );
  assert(/caps auth key expiry at 90 days/.test(far.message), far.message);
  assertEquals(calls.length, 0);
});

Deno.test("key-create: requires a description, since it is the only audit label", async () => {
  const { ctx } = mockCtx([]);
  const err = await assertRejects(async () => await action.execute({}, ctx), Error);
  assert(/only label anyone auditing/.test(err.message), err.message);
});

Deno.test("key-create: refuses unprefixed tags", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ description: "ci", tags: "ci" }, ctx),
    Error,
    "tag:name",
  );
});

/** Each call mints a new secret. */
Deno.test("key-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
  assert(/RETURNED ONCE/.test(action.description!), action.description);
});
