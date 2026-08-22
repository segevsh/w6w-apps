import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/repo-delete.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

/**
 * A bare name plus a stale connection default is exactly how the wrong
 * repository gets deleted, so this one refuses to resolve the owner.
 */
Deno.test("repo-delete: refuses a bare name even with a default owner", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ repo: "web", confirm: true }, ctx),
    Error,
    "must not depend on the connection's default owner",
  );
  assertEquals(calls.length, 0);
});

Deno.test("repo-delete: refuses to run without an explicit confirmation", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ repo: "acme/web" }, ctx),
    Error,
    "cannot be undone",
  );
  assertEquals(calls.length, 0);
});

Deno.test("repo-delete: with owner/name and confirmation it DELETEs, at warn", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 204 }], conn);
  const result = await action.execute!({ repo: "acme/web", confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://git.example.com/api/v1/repos/acme/web");
  assertEquals(result, { repository: "acme/web", deleted: true });
  assertEquals(logs[0].level, "warn");
});

Deno.test("repo-delete: an explicit owner param also satisfies the guard", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], conn);
  await action.execute!({ repo: "web", owner: "them", confirm: true }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/repos/them/web");
  assert(action.description!.includes("issues, pull requests and releases"), action.description);
});
