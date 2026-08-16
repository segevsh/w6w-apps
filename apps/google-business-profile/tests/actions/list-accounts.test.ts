import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-accounts.ts";

Deno.test("list-accounts: GETs /v1/accounts with default pageSize", async () => {
  const body = { accounts: [{ name: "accounts/1" }], nextPageToken: "tok" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.host, "mybusinessaccountmanagement.googleapis.com");
  assertEquals(url.pathname, "/v1/accounts");
  assertEquals(url.searchParams.get("pageSize"), "20");
  assertEquals(result, body);
});

Deno.test("list-accounts: forwards optional filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { accounts: [] } }]);
  await action.execute!({
    pageSize: 5,
    pageToken: "next",
    filter: "type=USER_GROUP",
    parentAccount: "accounts/9",
  }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("pageSize"), "5");
  assertEquals(params.get("pageToken"), "next");
  assertEquals(params.get("filter"), "type=USER_GROUP");
  assertEquals(params.get("parentAccount"), "accounts/9");
});

Deno.test("list-accounts: omits unset filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { accounts: [] } }]);
  await action.execute!({}, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("pageToken"));
  assert(!params.has("filter"));
  assert(!params.has("parentAccount"));
});
