import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/commit-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("commit-get: GETs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { commit: { hash: "abc123" } } }]);
  const out = await action.execute!({ project: "w6w", hash: "abc123" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.wakatime.com/api/v1/users/current/projects/w6w/commits/abc123",
  );
  assertEquals(out, { commit: { hash: "abc123" } });
});

Deno.test("commit-get: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () => await action.execute!({ project: "w6w", hash: "abc123" }, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
