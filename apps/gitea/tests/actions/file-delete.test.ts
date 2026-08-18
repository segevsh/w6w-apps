import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-delete.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

Deno.test("file-delete: refuses to run without an explicit confirmation", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ repo: "web", path: "a.txt" }, ctx),
    Error,
    "`confirm` must be true",
  );
  assertEquals(calls.length, 0);
});

/** The sha stops a stale workflow deleting a file somebody has since changed. */
Deno.test("file-delete: reads the sha first, then DELETEs with it", async () => {
  const { ctx, calls, logs } = mockCtx([
    { status: 200, body: { sha: "abc123" } },
    { status: 200, body: { commit: { sha: "def" } } },
  ], conn);
  const result = await action.execute!({
    repo: "web",
    path: "a.txt",
    confirm: true,
    message: "Remove",
  }, ctx) as { deleted: boolean };
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[1].method, "DELETE");
  assertEquals(JSON.parse(calls[1].body!), { sha: "abc123", message: "Remove" });
  assertEquals(result.deleted, true);
  assertEquals(logs[0].level, "warn");
});

Deno.test("file-delete: a directory has no sha, and says so", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [{ path: "a.txt" }] }], conn);
  await assertRejects(
    async () => await action.execute!({ repo: "web", path: "src", confirm: true }, ctx),
    Error,
    "a directory has no sha",
  );
});

Deno.test("file-delete: a blank path fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ repo: "web", confirm: true }, ctx),
    Error,
    "`path`",
  );
  assertEquals(calls.length, 0);
  assert(action.type === "perform");
});
