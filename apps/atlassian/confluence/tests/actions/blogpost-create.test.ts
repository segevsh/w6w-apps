import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/blogpost-create.ts";

const display = { site: "acme" };

Deno.test("blogpost-create: POSTs the body as a {representation, value} object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "b1" } }], { display });
  await action.execute!({ spaceId: "101", title: "Launch", body: "<p>ship</p>" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/wiki/api/v2/blogposts");
  assertEquals(JSON.parse(calls[0].body!), {
    spaceId: "101",
    status: "current",
    title: "Launch",
    body: { representation: "storage", value: "<p>ship</p>" },
  });
});

Deno.test("blogpost-create: a title is required unless the post is a draft", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ spaceId: "101" }, ctx),
    Error,
    "`title` is required",
  );
  assertEquals(calls.length, 0);
});
