import { assertEquals, assertRejects } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { collection, errorsBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

type Out = { data: unknown[]; nextCursor?: string; meta: Record<string, unknown> };

Deno.test("user-list: GET /users with JSON:API headers and cheap defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: collection("user", [1, 2]) }]);
  const out = await userList.execute({}, ctx) as Out;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/users");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), { "page[size]": "25", count: "false" });
  assertEquals(out.data.length, 2);
  assertEquals(out.nextCursor, undefined);
});

Deno.test("user-list: filters, sort, include, sparse fields and cursor are sent in Outreach's grammar", async () => {
  const { ctx, calls } = mockCtx([{ body: collection("user", []) }]);
  await userList.execute({
    filter: { id: "1..5", owner: { id: "7" }, name: ["a", "b"] },
    sort: "-updatedAt",
    include: "owner",
    fields: "name",
    pageSize: 100,
    after: "abc",
    count: true,
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    "filter[id]": "1..5",
    "filter[owner][id]": "7",
    "filter[name]": "a,b",
    sort: "-updatedAt",
    include: "owner",
    "fields[user]": "name",
    "page[size]": "100",
    "page[after]": "abc",
    count: "true",
  });
});

Deno.test("user-list: a JSON-string filter is accepted", async () => {
  const { ctx, calls } = mockCtx([{ body: collection("user", []) }]);
  await userList.execute({ filter: '{"state":"incomplete"}' }, ctx);
  assertEquals(queryOf(calls[0].url)["filter[state]"], "incomplete");
});

Deno.test("user-list: extracts the next page cursor from links.next", async () => {
  const next = "https://api.outreach.io/api/v2/users?page[size]=2&page[after]=eyJ4Ijox";
  const { ctx } = mockCtx([{ body: collection("user", [1, 2], next) }]);
  const out = await userList.execute({ pageSize: 2 }, ctx) as Out;
  assertEquals(out.nextCursor, "eyJ4Ijox");
});

Deno.test("user-list: surfaces the vendor's error id and detail", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorsBody("unauthorizedOauthScope", "Unauthorized OAuth Scope", "Missing scope"),
  }]);
  await assertRejects(
    async () => await userList.execute({}, ctx),
    Error,
    "unauthorizedOauthScope: Missing scope",
  );
});
