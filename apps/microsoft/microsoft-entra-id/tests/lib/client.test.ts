import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  directoryObjectRef,
  GraphClient,
  jsonObject,
  listQuery,
  needsConsistency,
  quoteSearch,
  refPath,
  runList,
  seg,
  userPath,
} from "../../lib/client.ts";

Deno.test("seg: keeps @ literal, encodes # and spaces", () => {
  assertEquals(seg("adele@contoso.com"), "adele@contoso.com");
  assertEquals(
    seg("AdeleVance_adatum.com#EXT#@contoso.com"),
    "AdeleVance_adatum.com%23EXT%23@contoso.com",
  );
  assertEquals(seg(" a b "), "a%20b");
});

Deno.test("userPath: a UPN starting with $ uses the parenthesised form", () => {
  assertEquals(userPath("$AdeleVance@contoso.com"), "/users('$AdeleVance@contoso.com')");
  assertEquals(userPath("abc"), "/users/abc");
});

Deno.test("refPath: always ends with /$ref", () => {
  assertEquals(refPath("g1", "members", "u1"), "/groups/g1/members/u1/$ref");
  assertEquals(refPath("g1", "owners", "u1"), "/groups/g1/owners/u1/$ref");
});

Deno.test("directoryObjectRef: points at /directoryObjects/{id}", () => {
  assertEquals(directoryObjectRef("u1"), {
    "@odata.id": "https://graph.microsoft.com/v1.0/directoryObjects/u1",
  });
});

Deno.test("quoteSearch: wraps once", () => {
  assertEquals(quoteSearch("displayName:Ad"), '"displayName:Ad"');
  assertEquals(quoteSearch('"displayName:Ad"'), '"displayName:Ad"');
});

Deno.test("listQuery: $search switches the advanced path on by itself", () => {
  const q = listQuery({ search: "displayName:Ad" });
  assertEquals(q.query.$search, '"displayName:Ad"');
  assertEquals(q.query.$count, true);
  assertEquals(q.headers, { ConsistencyLevel: "eventual" });
});

Deno.test("listQuery: plain list sends neither header nor $count", () => {
  const q = listQuery({ top: 5, filter: "accountEnabled eq true", select: ["id", "mail"] });
  assertEquals(q.query.$count, undefined);
  assertEquals(q.query.$select, "id,mail");
  assertEquals(q.headers, {});
});

Deno.test("needsConsistency: recognises advanced nextLinks", () => {
  assert(
    needsConsistency("https://graph.microsoft.com/v1.0/users?%24search=%22a%22&%24skiptoken=x"),
  );
  assert(needsConsistency("https://graph.microsoft.com/v1.0/users?$count=true&$skiptoken=x"));
  assert(!needsConsistency("https://graph.microsoft.com/v1.0/users?$skiptoken=x"));
});

Deno.test("runList: replays nextLink verbatim and re-sends ConsistencyLevel for an advanced link", async () => {
  const link = "https://graph.microsoft.com/v1.0/users?$count=true&$skiptoken=abc";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await runList(ctx, "/users", { nextLink: link, filter: "ignored" });
  assertEquals(calls[0].url, link);
  assertEquals(calls[0].headers.consistencylevel, "eventual");
});

Deno.test("runList: walks pages, keeps the first @odata.count, and stops at maxPages", async () => {
  const p2 = "https://graph.microsoft.com/v1.0/users?$skiptoken=2";
  const p3 = "https://graph.microsoft.com/v1.0/users?$skiptoken=3";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.count": 3, "@odata.nextLink": p2 } },
    { body: { value: [{ id: "b" }], "@odata.nextLink": p3 } },
  ]);
  const out = await runList(ctx, "/users", { all: true, maxPages: 2, advancedQuery: true });
  assertEquals(calls.length, 2);
  assertEquals(out.pages, 2);
  assertEquals(out.count, 3);
  assertEquals(out.value.length, 2);
  assertEquals(out.nextLink, p3);
  assertEquals(calls[1].headers.consistencylevel, "eventual");
});

Deno.test("GraphClient: surfaces Graph's error code and message, with the path", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    statusText: "Not Found",
    body: { error: { code: "Request_ResourceNotFound", message: "Resource 'x' does not exist." } },
  }]);
  const err = await assertRejects(() => new GraphClient(ctx).request("/users/x"));
  assert((err as Error).message.includes("Request_ResourceNotFound: Resource 'x' does not exist."));
  assert((err as Error).message.includes("/v1.0/users/x"));
});

Deno.test("GraphClient: a 204 resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new GraphClient(ctx).request("/users/x", { method: "DELETE" }), undefined);
});

Deno.test("jsonObject: accepts objects and JSON strings, rejects the rest", () => {
  assertEquals(jsonObject(undefined, "x"), {});
  assertEquals(jsonObject('{"a":1}', "x"), { a: 1 });
  assertEquals(jsonObject({ a: 1 }, "x"), { a: 1 });
  assertThrows(() => jsonObject("{nope", "Extra"), Error, "Extra is not valid JSON");
  assertThrows(() => jsonObject("[1]", "Extra"), Error, "must be a JSON object");
});
