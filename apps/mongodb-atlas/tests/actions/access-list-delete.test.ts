import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/access-list-delete.ts";

/** A CIDR slash unencoded is a different path, and a 404 for a live entry. */
Deno.test("access-list-delete: encodes the CIDR slash into the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", value: "10.0.0.0/8", confirmValue: "10.0.0.0/8" },
    ctx,
  );
  assertEquals(
    calls[0].url,
    "https://cloud.mongodb.com/api/atlas/v2/groups/5f8d0d55b54eff0f2b2c3d4e/accessList/10.0.0.0%2F8",
  );
  assertEquals(calls[0].method, "DELETE");
});

Deno.test("access-list-delete: a bare address needs no encoding and still works", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", value: "198.51.100.7", confirmValue: "198.51.100.7" },
    ctx,
  ) as Record<string, unknown>;
  assert(calls[0].url.endsWith("/accessList/198.51.100.7"), calls[0].url);
  assertEquals(result.deleted, true);
});

/** The symptom is a timeout that names no cause. */
Deno.test("access-list-delete: the value must be typed back", async () => {
  for (const confirm of [undefined, "", "10.0.0.0/16"]) {
    const { ctx, calls } = mockCtx([]);
    let message = "";
    try {
      await action.execute(
        { projectId: "5f8d0d55b54eff0f2b2c3d4e", value: "10.0.0.0/8", confirmValue: confirm },
        ctx,
      );
    } catch (err) {
      message = String(err);
    }
    assert(/`confirmValue` must match/.test(message), `${confirm}: ${message}`);
    assert(/timeout that names no\s+cause/.test(message), message);
    assertEquals(calls.length, 0);
  }
});

Deno.test("access-list-delete: warns, and reports what went", async () => {
  const { ctx, logs } = mockCtx([{ status: 204 }]);
  const result = await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", value: "10.0.0.0/8", confirmValue: "10.0.0.0/8" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(logs[0].level, "warn");
  assertEquals(result.value, "10.0.0.0/8");
});

/** Unlike revoking a user, this applies to new connections at once. */
Deno.test("access-list-delete: says it takes effect immediately", () => {
  assert(/effective for new connections at once/.test(action.description!), action.description);
});

Deno.test("access-list-delete: a value is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e", confirmValue: "x" }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
  assertEquals(calls.length, 0);
});
