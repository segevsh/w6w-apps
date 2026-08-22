import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-tags-set.ts";

const tagged = { status: 200, body: { tags: ["tag:web", "tag:prod"], user: "amelie@example.com" } };
const untagged = { status: 200, body: { user: "amelie@example.com" } };
const ok = { status: 200, body: {} };

/** There is no add-a-tag endpoint; Tailscale replaces the list. */
Deno.test("device-tags-set: replace sends exactly what was asked for", async () => {
  const { ctx, calls } = mockCtx([tagged, ok]);
  const result = await action.execute({ deviceId: "n1", tags: "tag:web" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(new URL(calls[1].url).pathname, "/api/v2/device/n1/tags");
  assertEquals(JSON.parse(calls[1].body!), { tags: ["tag:web"] });
  assertEquals(result.removed, ["tag:prod"]);
});

/** The whole point of the mode: a naive replace drops rules silently. */
Deno.test("device-tags-set: add merges with the tags already there", async () => {
  const { ctx, calls } = mockCtx([tagged, ok]);
  const result = await action.execute(
    { deviceId: "n1", tags: "tag:canary", mode: "add" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(JSON.parse(calls[1].body!), { tags: ["tag:web", "tag:prod", "tag:canary"] });
  assertEquals(result.added, ["tag:canary"]);
  assertEquals(result.removed, []);
});

Deno.test("device-tags-set: remove takes only the named tags off", async () => {
  const { ctx, calls } = mockCtx([tagged, ok]);
  const result = await action.execute(
    { deviceId: "n1", tags: "tag:prod", mode: "remove" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(JSON.parse(calls[1].body!), { tags: ["tag:web"] });
  assertEquals(result.changed, true);
});

/** Removing a tag removes every ACL rule written against it. */
Deno.test("device-tags-set: warns when tags are taken away", async () => {
  const { ctx, logs } = mockCtx([tagged, ok]);
  await action.execute({ deviceId: "n1", tags: "tag:web" }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /every ACL rule written against them/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** Tagging transfers ownership and stops the key expiring. */
Deno.test("device-tags-set: notes the ownership transfer on a first tagging", async () => {
  const { ctx, logs } = mockCtx([untagged, ok]);
  const result = await action.execute({ deviceId: "n2", tags: "tag:prod" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.nowOwnedByTag, true);
  assert(
    logs.some((l) => /owned by its tags/.test(l.message) && /stop expiring/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** A bare name reads as a missing tag definition. */
Deno.test("device-tags-set: refuses unprefixed tags before sending anything", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => await action.execute({ deviceId: "n1", tags: "prod" }, ctx),
    Error,
  );
  assert(/tag:name/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("device-tags-set: refuses an empty list rather than untagging by accident", async () => {
  const { ctx } = mockCtx([]);
  const err = await assertRejects(
    async () => await action.execute({ deviceId: "n1", tags: "" }, ctx),
    Error,
  );
  assert(/hand the device back to nobody/.test(err.message), err.message);
});

Deno.test("device-tags-set: duplicate tags collapse", async () => {
  const { ctx, calls } = mockCtx([untagged, ok]);
  await action.execute({ deviceId: "n2", tags: "tag:a, tag:a, tag:b" }, ctx);
  assertEquals(JSON.parse(calls[1].body!), { tags: ["tag:a", "tag:b"] });
});
