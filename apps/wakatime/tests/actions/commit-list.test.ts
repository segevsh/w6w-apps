import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/commit-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("commit-list: GETs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { commits: [], page: 2, next_page: null } }]);
  const out = await action.execute!({ project: "my proj", branch: "main", page: 2 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.wakatime.com/api/v1/users/current/projects/my%20proj/commits?branch=main&page=2",
  );
  assertEquals(out, { commits: [], page: 2, next_page: null });
});

Deno.test("commit-list: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () => await action.execute!({ project: "my proj", branch: "main", page: 2 }, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
