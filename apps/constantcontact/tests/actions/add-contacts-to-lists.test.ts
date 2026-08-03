import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-contacts-to-lists.ts";

Deno.test("add-contacts-to-lists: POSTs /v3/activities/add_list_memberships", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { activity_id: "a1", state: "initialized" },
  }]);
  await action.execute!({ listIds: ["l1"], sourceContactIds: ["c1", "c2"] }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/activities/add_list_memberships");
  assertEquals(JSON.parse(calls[0].body!), {
    source: { contact_ids: ["c1", "c2"] },
    list_ids: ["l1"],
  });
});

Deno.test("add-contacts-to-lists: maps each source option to its API key", async () => {
  const cases: Array<[Record<string, unknown>, Record<string, unknown>]> = [
    [{ sourceListIds: ["l9"] }, { list_ids: ["l9"] }],
    [{ sourceTagIds: ["t1"] }, { tag_ids: ["t1"] }],
    [{ sourceSegmentId: 7 }, { segment_id: 7 }],
    [{ sourceEngagementLevel: "high" }, { engagement_level: "high" }],
    [{ sourceAllActiveContacts: true }, { all_active_contacts: true }],
  ];
  for (const [input, expected] of cases) {
    const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
    await action.execute!({ listIds: ["l1"], ...input }, ctx);
    assertEquals(JSON.parse(calls[0].body!).source, expected);
  }
});

Deno.test("add-contacts-to-lists: rejects a request with no source", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => action.execute!({ listIds: ["l1"] }, ctx) as Promise<unknown>,
    Error,
    "exactly one source",
  );
  assertEquals(calls.length, 0, "must not reach the network");
});

Deno.test("add-contacts-to-lists: rejects two mutually exclusive sources", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () =>
      action.execute!({
        listIds: ["l1"],
        sourceContactIds: ["c1"],
        sourceTagIds: ["t1"],
      }, ctx) as Promise<unknown>,
    Error,
    "exactly one source",
  );
  assert(err.message.includes("contact_ids"));
  assert(err.message.includes("tag_ids"));
  assertEquals(calls.length, 0);
});

Deno.test("add-contacts-to-lists: `all active contacts: false` is not a source", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () =>
      action.execute!({ listIds: ["l1"], sourceAllActiveContacts: false }, ctx) as Promise<unknown>,
    Error,
    "exactly one source",
  );
});

Deno.test("add-contacts-to-lists: nests excludeContactIds under `exclude`", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({
    listIds: ["l1"],
    sourceAllActiveContacts: true,
    excludeContactIds: ["c9"],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).exclude, { contact_ids: ["c9"] });
});

Deno.test("add-contacts-to-lists: omits `exclude` when nothing is excluded", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ listIds: ["l1"], sourceContactIds: ["c1"] }, ctx);
  assertEquals("exclude" in JSON.parse(calls[0].body!), false);
});

Deno.test("add-contacts-to-lists: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
