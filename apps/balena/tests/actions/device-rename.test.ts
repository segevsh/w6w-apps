import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-rename.ts";

const UUID = "a".repeat(32);
const device = {
  status: 200,
  body: {
    d: [{ id: 5, device_name: "winter-sunset", belongs_to__application: { __id: 1 } }],
  },
};
const noDuplicates = { status: 200, body: { d: [] } };
const ok = { status: 200, body: {} };

Deno.test("device-rename: patches the device by uuid", async () => {
  const { ctx, calls } = mockCtx([device, noDuplicates, ok]);
  const result = await action.execute({ uuid: UUID, name: "berlin-01" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[2].method, "PATCH");
  assertEquals(new URL(calls[2].url).pathname, `/v7/device(uuid='${UUID}')`);
  assertEquals(JSON.parse(calls[2].body!), { device_name: "berlin-01" });
  assertEquals(result.previousName, "winter-sunset");
  assertEquals(result.changed, true);
});

/** balena permits duplicates and every name lookup then returns both. */
Deno.test("device-rename: refuses a name already used in the same fleet", async () => {
  const { ctx, calls } = mockCtx([
    device,
    { status: 200, body: { d: [{ uuid: "b".repeat(32) }] } },
  ]);
  const err = await assertRejects(
    async () => await action.execute({ uuid: UUID, name: "berlin-01" }, ctx),
    Error,
  );
  assert(/every lookup by name then returns both/.test(err.message), err.message);
  assertEquals(calls.length, 2, "it must not patch before refusing");
});

Deno.test("device-rename: allowDuplicate lets it through and reports the clash", async () => {
  const other = "b".repeat(32);
  const { ctx } = mockCtx([device, { status: 200, body: { d: [{ uuid: other }] } }, ok]);
  const result = await action.execute(
    { uuid: UUID, name: "berlin-01", allowDuplicate: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.duplicateOf, [other]);
});

/** The device itself carrying the name is not a duplicate. */
Deno.test("device-rename: renaming a device to its own name is not a clash", async () => {
  const { ctx } = mockCtx([device, { status: 200, body: { d: [{ uuid: UUID }] } }, ok]);
  const result = await action.execute({ uuid: UUID, name: "winter-sunset" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.duplicateOf, []);
  assertEquals(result.changed, false);
});

Deno.test("device-rename: requires a name", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute({ uuid: UUID }, ctx), Error, "`name`");
});
