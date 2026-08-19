import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-tag-set.ts";

const UUID = "a".repeat(32);
const device = { status: 200, body: { d: [{ id: 5 }] } };
const none = { status: 200, body: { d: [] } };
const existing = { status: 200, body: { d: [{ id: 10, value: "berlin" }] } };
const ok = { status: 200, body: {} };

Deno.test("device-tag-set: creates a tag that does not exist", async () => {
  const { ctx, calls } = mockCtx([device, none, ok]);
  const result = await action.execute({ uuid: UUID, key: "site", value: "berlin" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[2].method, "POST");
  assertEquals(JSON.parse(calls[2].body!), { device: 5, tag_key: "site", value: "berlin" });
  assertEquals(result.action, "created");
});

/** balena's composite key addresses the row without its numeric id. */
Deno.test("device-tag-set: updates through the (device, tag_key) path", async () => {
  const { ctx, calls } = mockCtx([device, existing, ok]);
  const result = await action.execute({ uuid: UUID, key: "site", value: "munich" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[2].method, "PATCH");
  assertEquals(new URL(calls[2].url).pathname, "/v7/device_tag(device=5,tag_key='site')");
  assertEquals(JSON.parse(calls[2].body!), { value: "munich" });
  assertEquals(result.previousValue, "berlin");
  assertEquals(result.action, "updated");
});

Deno.test("device-tag-set: setting the same value writes nothing", async () => {
  const { ctx, calls } = mockCtx([device, existing]);
  const result = await action.execute({ uuid: UUID, key: "site", value: "berlin" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.action, "unchanged");
  assertEquals(result.changed, false);
  assertEquals(calls.length, 2);
});

Deno.test("device-tag-set: removing deletes by id", async () => {
  const { ctx, calls } = mockCtx([device, existing, ok]);
  const result = await action.execute({ uuid: UUID, key: "site", remove: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[2].method, "DELETE");
  assertEquals(new URL(calls[2].url).pathname, "/v7/device_tag(10)");
  assertEquals(result.action, "removed");
});

Deno.test("device-tag-set: a value with a quote is escaped for OData", async () => {
  const { ctx, calls } = mockCtx([device, none, ok]);
  await action.execute({ uuid: UUID, key: "owner's", value: "x" }, ctx);
  assert(
    new URL(calls[1].url).searchParams.get("$filter")!.includes("tag_key eq 'owner''s'"),
    new URL(calls[1].url).searchParams.get("$filter")!,
  );
});

/** The practical difference from an environment variable. */
Deno.test("device-tag-set: says a tag restarts nothing and needs no online device", () => {
  assert(/RESTARTS NOTHING/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});

Deno.test("device-tag-set: requires a key", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute({ uuid: UUID }, ctx), Error, "`key`");
});
