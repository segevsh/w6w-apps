import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-messages.ts";

Deno.test("search-messages: defaults the parent to the spaces/- wildcard", async () => {
  const { ctx, calls } = mockCtx([{ body: { messages: [] } }]);
  await action.execute!({ filter: 'text:"deploy"' }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/-/messages:search");
});

Deno.test("search-messages: scopes to one space when given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute!({ space: "A1", filter: "x" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A1/messages:search");
  await action.execute!({ space: "spaces/A2", filter: "x" }, ctx);
  assertEquals(new URL(calls[1].url).pathname, "/v1/spaces/A2/messages:search");
});

Deno.test("search-messages: a blank space falls back to the wildcard", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "   ", filter: "x" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/-/messages:search");
});

Deno.test("search-messages: every parameter except the parent lives in the BODY", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    space: "A1",
    filter: 'text:"deploy"',
    orderBy: "create_time DESC",
    view: "SEARCH_MESSAGES_VIEW_FULL",
    pageSize: 10,
    pageToken: "tok",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    filter: 'text:"deploy"',
    orderBy: "create_time DESC",
    view: "SEARCH_MESSAGES_VIEW_FULL",
    pageSize: 10,
    pageToken: "tok",
  });
  assertEquals([...new URL(calls[0].url).searchParams.keys()], []);
});

Deno.test("search-messages: sends only the filter when nothing else is given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ filter: "x" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { filter: "x" });
});

Deno.test("search-messages: is typed as a search, not a perform", () => {
  assertEquals(action.type, "search");
});
