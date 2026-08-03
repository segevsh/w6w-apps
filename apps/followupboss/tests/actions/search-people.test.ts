import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues, param, run } from "../_helpers.ts";
import searchPeople from "../../actions/search-people.ts";

const listBody = (people: unknown[] = []) => ({
  _metadata: { collection: "people", offset: 0, limit: 10, total: people.length },
  people,
});

Deno.test("search-people: GETs /people with the documented query names", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listBody([{ id: 1 }]) }]);
  const result = await run<{ records: unknown[] }>(searchPeople, {
    email: "john@example.com",
    stage: "Past Client",
    source: "Zillow",
    tags: "Foo,Bar",
    assignedUserId: 8,
    includeTrash: true,
    limit: 50,
    next: "eyJzaW5jZUlkIjoxMDV9",
    sort: "-created",
    fields: "id,name",
  }, ctx);

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.followupboss.com/v1/people");
  assertEquals(url.searchParams.get("email"), "john@example.com");
  assertEquals(url.searchParams.get("stage"), "Past Client");
  assertEquals(url.searchParams.get("source"), "Zillow");
  assertEquals(url.searchParams.get("tags"), "Foo,Bar");
  assertEquals(url.searchParams.get("assignedUserId"), "8");
  assertEquals(url.searchParams.get("includeTrash"), "true");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(url.searchParams.get("next"), "eyJzaW5jZUlkIjoxMDV9");
  assertEquals(url.searchParams.get("sort"), "-created");
  assertEquals(url.searchParams.get("fields"), "id,name");
  assertEquals(result.records.length, 1);
});

Deno.test("search-people: sends nothing but the path when no filter is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listBody() }]);
  await searchPeople.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.followupboss.com/v1/people");
});

Deno.test("search-people: exposes the trash and cursor controls the API needs", () => {
  assertEquals(searchPeople.type, "search");
  assert(param(searchPeople, "includeTrash").hint?.includes("excluded by default"));
  assert(param(searchPeople, "next").hint?.includes("recommended"));
  // The documented sort fields, not an invented set.
  const sorts = optionValues(searchPeople, "sort");
  assertEquals(sorts.length, 10);
  assert(sorts.includes("lastCommunication"));
});
