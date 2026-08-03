import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-contacts.ts";

Deno.test("search-contacts: sends the mask as `readMask`, NOT `personFields`", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await action.execute({ query: "ada" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/people:searchContacts");
  assertEquals(url.searchParams.get("query"), "ada");
  assertEquals(url.searchParams.get("readMask"), "names,emailAddresses,phoneNumbers");
  assertEquals(url.searchParams.has("personFields"), false);
});

Deno.test("search-contacts: joins and de-duplicates a readMask array", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ query: "x", readMask: ["names", "organizations", "names"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("readMask"), "names,organizations");
});

Deno.test("search-contacts: falls back to the default readMask when given none", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ query: "x", readMask: "  " }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("readMask"),
    "names,emailAddresses,phoneNumbers",
  );
});

Deno.test("search-contacts: forwards pageSize and sources", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ query: "x", pageSize: 30, sources: ["READ_SOURCE_TYPE_CONTACT"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("pageSize"), "30");
  assertEquals(url.searchParams.getAll("sources"), ["READ_SOURCE_TYPE_CONTACT"]);
});

Deno.test("search-contacts: pageSize param is capped at Google's documented 30", () => {
  const pageSize = action.params?.find((p) => p.key === "pageSize");
  assertEquals(pageSize?.validation?.max, 30);
  assertEquals(action.type, "search");
});
