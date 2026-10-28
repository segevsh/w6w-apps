import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-connections.ts";

Deno.test("list-connections: GETs people/me/connections with the default personFields", async () => {
  const { ctx, calls } = mockCtx([{ body: { connections: [], totalPeople: 0 } }]);
  const result = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v1/people/me/connections");
  assertEquals(url.searchParams.get("personFields"), "names,emailAddresses,phoneNumbers");
  assertEquals(result, { connections: [], totalPeople: 0 });
});

Deno.test("list-connections: joins a multiselect personFields array into one mask", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ personFields: ["names", "organizations", "birthdays"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("personFields"), "names,organizations,birthdays");
  // Exactly one personFields param — not one per selected field.
  assertEquals(url.searchParams.getAll("personFields").length, 1);
});

Deno.test("list-connections: an empty personFields still sends the required default", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ personFields: [] }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("personFields"),
    "names,emailAddresses,phoneNumbers",
  );
});

Deno.test("list-connections: forwards paging, sorting and sync params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    pageSize: 250,
    pageToken: "tok",
    sortOrder: "LAST_NAME_ASCENDING",
    requestSyncToken: true,
    syncToken: "sync-1",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("pageSize"), "250");
  assertEquals(url.searchParams.get("pageToken"), "tok");
  assertEquals(url.searchParams.get("sortOrder"), "LAST_NAME_ASCENDING");
  assertEquals(url.searchParams.get("requestSyncToken"), "true");
  assertEquals(url.searchParams.get("syncToken"), "sync-1");
});

Deno.test("list-connections: sources are repeated params, and omitted when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute({ sources: ["READ_SOURCE_TYPE_CONTACT", "READ_SOURCE_TYPE_PROFILE"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.getAll("sources"), [
    "READ_SOURCE_TYPE_CONTACT",
    "READ_SOURCE_TYPE_PROFILE",
  ]);

  await action.execute({}, ctx);
  assertEquals(new URL(calls[1].url).searchParams.has("sources"), false);
});

Deno.test("list-connections: accepts a bare id and prefixes it", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ resourceName: "me" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/people/me/connections");
});
