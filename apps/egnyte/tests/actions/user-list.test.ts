import { assertEquals, assertRejects } from "@std/assert";
import { mockEgnyteCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

Deno.test("user-list: builds an eq filter and paging", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: { resources: [], totalResults: 0 } }, {
    body: {},
  }]);
  await action.execute({ email: "a@x.com", startIndex: 1, count: 50 }, ctx);
  const u = new URL(calls[0].url);
  assertEquals(u.pathname, "/pubapi/v2/users");
  assertEquals(u.searchParams.get("filter"), 'email eq "a@x.com"');
  assertEquals(u.searchParams.get("startIndex"), "1");
  assertEquals(u.searchParams.get("count"), "50");
  await action.execute({ userName: 'jo"x' }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("filter"), 'userName eq "jo\\"x"');
});

Deno.test("user-list: refuses two filters at once", async () => {
  const { ctx, calls } = mockEgnyteCtx([]);
  await assertRejects(
    async () => await action.execute({ email: "a@x.com", userName: "jo" }, ctx),
    Error,
    "either email or username",
  );
  assertEquals(calls.length, 0);
});

Deno.test("user-list: no filter, no query", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: {} }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v2/users");
});
