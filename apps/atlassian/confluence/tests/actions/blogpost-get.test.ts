import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/blogpost-get.ts";

const display = { site: "acme" };

Deno.test("blogpost-get: fetches one blog post, body in storage format by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "b1" } }], { display });
  await action.execute!({ blogpostId: "b1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/wiki/api/v2/blogposts/b1");
  assertEquals(new URL(calls[0].url).searchParams.get("body-format"), "storage");
});

Deno.test("blogpost-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`blogpostId`");
  assertEquals(calls.length, 0);
});
