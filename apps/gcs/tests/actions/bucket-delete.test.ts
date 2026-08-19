import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bucket-delete.ts";

const empty = { status: 200, body: { items: [] } };

Deno.test("bucket-delete: checks for hidden contents, then deletes", async () => {
  const { ctx, calls } = mockCtx([empty, empty, { status: 204 }]);
  const result = await action.execute(
    { bucket: "uploads", confirmName: "uploads" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).searchParams.get("versions"), "true");
  assertEquals(new URL(calls[1].url).searchParams.get("softDeleted"), "true");
  assertEquals(calls[2].method, "DELETE");
  assertEquals(result.deleted, true);
});

/** The usual reason a delete keeps failing: versions an ordinary listing hides. */
Deno.test("bucket-delete: non-current versions are reported as the blocker", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [{ name: "old" }] } }]);
  let message = "";
  try {
    await action.execute({ bucket: "uploads", confirmName: "uploads" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/including non-current versions/.test(message), message);
  assert(/`object-list` with `versions` on/.test(message), message);
  assertEquals(calls.length, 1, "the delete was not attempted");
});

Deno.test("bucket-delete: soft-deleted objects are reported separately", async () => {
  const { ctx, calls } = mockCtx([empty, { status: 200, body: { items: [{ name: "gone" }] } }]);
  let message = "";
  try {
    await action.execute({ bucket: "uploads", confirmName: "uploads" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/soft-deleted objects/.test(message), message);
  assert(/retention window elapses/.test(message), message);
  assertEquals(calls.length, 2);
});

Deno.test("bucket-delete: the name must be typed back", async () => {
  for (const confirm of [undefined, "", "UPLOADS", "uploads2"]) {
    const { ctx, calls } = mockCtx([]);
    let message = "";
    try {
      await action.execute({ bucket: "uploads", confirmName: confirm }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/`confirmName` must match/.test(message), `${confirm}: ${message}`);
    assertEquals(calls.length, 0);
  }
});

/** Deleting does not free the name for you. */
Deno.test("bucket-delete: warns that the name does not come back", async () => {
  const { ctx, logs } = mockCtx([empty, empty, { status: 204 }]);
  await action.execute({ bucket: "uploads", confirmName: "uploads" }, ctx);
  assertEquals(logs[0].level, "warn");
  assert(/not immediately reusable/.test(logs[0].message), logs[0].message);
});

Deno.test("bucket-delete: says what 'empty' actually includes", () => {
  assert(
    /non-current VERSIONS and SOFT-DELETED objects/.test(action.description!),
    action.description,
  );
  assertEquals(action.idempotent, true);
});
