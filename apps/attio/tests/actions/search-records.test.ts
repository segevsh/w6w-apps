import { assert, assertEquals } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import searchRecords from "../../actions/search-records.ts";

Deno.test("search-records: POSTs query, objects and a workspace-wide request_as", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await searchRecords.execute({ query: "alan mathis", objects: ["people", "deals"] }, ctx);

  assertEquals(calls[0].url, "https://api.attio.com/v2/objects/records/search");
  assertEquals(JSON.parse(calls[0].body!), {
    query: "alan mathis",
    objects: ["people", "deals"],
    // `request_as` is required with no default; workspace-wide is the choice made.
    request_as: { type: "workspace" },
  });
});

Deno.test("search-records: narrows request_as by member id when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await searchRecords.execute({
    query: "x",
    objects: ["people"],
    workspaceMemberId: "50cf242c-7fa3-4cad-87d0-75b1af71c57b",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).request_as, {
    type: "workspace-member",
    workspace_member_id: "50cf242c-7fa3-4cad-87d0-75b1af71c57b",
  });
});

Deno.test("search-records: narrows request_as by member email when only that is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await searchRecords.execute({
    query: "x",
    objects: ["people"],
    workspaceMemberEmail: "alice@attio.com",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).request_as, {
    type: "workspace-member",
    email_address: "alice@attio.com",
  });
});

Deno.test("search-records: id wins over email when both are supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await searchRecords.execute({
    query: "x",
    objects: ["people"],
    workspaceMemberId: "id-1",
    workspaceMemberEmail: "alice@attio.com",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).request_as, {
    type: "workspace-member",
    workspace_member_id: "id-1",
  });
});

Deno.test("search-records: caps limit at the documented 25", () => {
  assertEquals(param(searchRecords, "limit").validation?.max, 25);
});

/** Two vendor warnings that decide whether this is the right action at all. */
Deno.test("search-records: warns it is beta and eventually consistent", () => {
  const d = searchRecords.description!;
  assert(/beta/i.test(d), d);
  assert(/eventually consistent/i.test(d), d);
  assert(d.includes("List Records"), d);
});
