import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/repo-search.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

/** The one endpoint that wraps its results — everything else is a bare array. */
Deno.test("repo-search: unwraps Gitea's {ok, data} envelope", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { ok: true, data: [{ full_name: "acme/web" }] },
  }], conn);
  assertEquals(await action.execute!({ q: "web" }, ctx), [{ full_name: "acme/web" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/repos/search");
  assertEquals(new URL(calls[0].url).searchParams.get("q"), "web");
});

Deno.test("repo-search: returnAll walks pages until a short one", async () => {
  const full = Array.from({ length: 50 }, (_, i) => ({ id: i }));
  const { ctx, calls } = mockCtx([
    { status: 200, body: { ok: true, data: full } },
    { status: 200, body: { ok: true, data: [{ id: 99 }] } },
  ], conn);
  assertEquals((await action.execute!({ returnAll: true }, ctx) as unknown[]).length, 51);
  assertEquals(new URL(calls[1].url).searchParams.get("page"), "2");
});

Deno.test("repo-search: the topic and private switches reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], conn);
  await action.execute!({ q: "x", topic: true, private: false }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("topic"), "true");
  assertEquals(q.get("private"), "false");
  assert(action.type === "read");
});
