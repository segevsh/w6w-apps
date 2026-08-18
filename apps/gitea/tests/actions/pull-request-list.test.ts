import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pull-request-list.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

/** Unlike issue-list, this returns pull requests only. */
Deno.test("pull-request-list: reads the pulls collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ number: 4 }] }], conn);
  assertEquals(await action.execute!({ repo: "web" }, ctx), [{ number: 4 }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/repos/acme/web/pulls");
  assertEquals(new URL(calls[0].url).searchParams.get("state"), "open");
  assert(action.description!.includes("pull requests"), action.description);
});

Deno.test("pull-request-list: the sort option reaches the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], conn);
  await action.execute!({ repo: "web", state: "all", sort: "recentupdate" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("state"), "all");
  assertEquals(q.get("sort"), "recentupdate");
});
