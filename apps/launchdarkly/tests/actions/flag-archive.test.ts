import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/flag-archive.ts";

const conn = { display: { projectKey: "default" } };

Deno.test("flag-archive: archives and restores with the matching instruction", async () => {
  const archive = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ flagKey: "f", action: "archive" }, archive.ctx);
  assertEquals(JSON.parse(archive.calls[0].body!).instructions, [{ kind: "archiveFlag" }]);

  const restore = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ flagKey: "f", action: "restore" }, restore.ctx);
  assertEquals(JSON.parse(restore.calls[0].body!).instructions, [{ kind: "restoreFlag" }]);
});

Deno.test("flag-archive: an unknown action is refused before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ flagKey: "f", action: "delete" }, ctx),
    Error,
    "`action` must be",
  );
  assertEquals(calls.length, 0);
});

/** Archived flags stop evaluating, so code still calling them gets a fallback. */
Deno.test("flag-archive: says what archiving does to running code", () => {
  const options = (action.params as Array<{ key: string; options?: unknown }>)
    .find((p) => p.key === "action")!.options as Array<{ label: string }>;
  assert(options[0].label.includes("SDK fallback"), options[0].label);
  assert(action.description!.includes("reversible"), action.description);
});
