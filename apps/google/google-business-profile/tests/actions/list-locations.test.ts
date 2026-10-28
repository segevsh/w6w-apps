import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-locations.ts";

Deno.test("list-locations: GETs /v1/accounts/{id}/locations with the default readMask", async () => {
  const body = { locations: [{ name: "locations/1" }], totalSize: 1 };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ accountId: "9" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/accounts/9/locations");
  assertEquals(
    url.searchParams.get("readMask"),
    "name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,latlng,openInfo,profile,categories,metadata",
  );
  assertEquals(url.searchParams.get("pageSize"), "100");
  assertEquals(result, body);
});

Deno.test("list-locations: accepts the accounts/- wildcard and a custom readMask", async () => {
  const { ctx, calls } = mockCtx([{ body: { locations: [] } }]);
  await action.execute!({ accountId: "accounts/-", readMask: "name,title" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/accounts/-/locations");
  assertEquals(url.searchParams.get("readMask"), "name,title");
});

Deno.test("list-locations: forwards filter, orderBy, pageToken", async () => {
  const { ctx, calls } = mockCtx([{ body: { locations: [] } }]);
  await action.execute!({
    accountId: "9",
    filter: 'title="Acme"',
    orderBy: "title desc",
    pageToken: "next",
  }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("filter"), 'title="Acme"');
  assertEquals(params.get("orderBy"), "title desc");
  assertEquals(params.get("pageToken"), "next");
});
