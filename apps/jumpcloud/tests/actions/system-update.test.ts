import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/system-update.ts";

const display = { display: { region: "us" } };

test("system-update: PUTs only what was set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _id: "s1" } }], display);
  await action.execute!({ systemId: "s1", displayName: "Ada's laptop", tags: "eng, laptop" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/systems/s1");
  assertEquals(JSON.parse(calls[0].body!), {
    displayName: "Ada's laptop",
    tags: ["eng", "laptop"],
  });
});

/**
 * The SSH policy fields are tri-state: blank means "leave unchanged", so a
 * rename cannot silently rewrite how a machine can be logged into.
 */
test("system-update: an unset SSH policy field is not sent at all", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], display);
  await action.execute!({ systemId: "s1", displayName: "x", allowSshRootLogin: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { displayName: "x" });
});

/** `false` is a real setting here and must survive to the wire. */
test("system-update: denying an SSH policy sends an explicit false", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], display);
  await action.execute!({
    systemId: "s1",
    allowSshRootLogin: "false",
    allowSshPasswordAuthentication: "true",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    allowSshRootLogin: false,
    allowSshPasswordAuthentication: true,
  });
});

test("system-update: an update with nothing set is refused, not sent", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(
    async () => await action.execute!({ systemId: "s1" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});
