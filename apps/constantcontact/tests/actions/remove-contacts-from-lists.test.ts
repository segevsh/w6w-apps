import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/remove-contacts-from-lists.ts";

Deno.test("remove-contacts-from-lists: POSTs /v3/activities/remove_list_memberships", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { activity_id: "a1", state: "initialized" },
  }]);
  await action.execute!({ listIds: ["l1"], sourceContactIds: ["c1"] }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/activities/remove_list_memberships");
  assertEquals(JSON.parse(calls[0].body!), {
    source: { contact_ids: ["c1"] },
    list_ids: ["l1"],
  });
});

Deno.test("remove-contacts-from-lists: maps each source option to its API key", async () => {
  const cases: Array<[Record<string, unknown>, Record<string, unknown>]> = [
    [{ sourceListIds: ["l9"] }, { list_ids: ["l9"] }],
    [{ sourceTagIds: ["t1"] }, { tag_ids: ["t1"] }],
    [{ sourceEngagementLevel: "low" }, { engagement_level: "low" }],
    [{ sourceAllActiveContacts: true }, { all_active_contacts: true }],
  ];
  for (const [input, expected] of cases) {
    const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
    await action.execute!({ listIds: ["l1"], ...input }, ctx);
    assertEquals(JSON.parse(calls[0].body!).source, expected);
  }
});

Deno.test("remove-contacts-from-lists: offers no segment source — the API has none", () => {
  const keys = (action.params ?? []).map((p) => p.key);
  assert(!keys.includes("sourceSegmentId"));
});

Deno.test("remove-contacts-from-lists: rejects a request with no source", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => action.execute!({ listIds: ["l1"] }, ctx) as Promise<unknown>,
    Error,
    "exactly one source",
  );
  assertEquals(calls.length, 0);
});

Deno.test("remove-contacts-from-lists: rejects two mutually exclusive sources", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () =>
      action.execute!({
        listIds: ["l1"],
        sourceListIds: ["l9"],
        sourceTagIds: ["t1"],
      }, ctx) as Promise<unknown>,
    Error,
    "exactly one source",
  );
});

Deno.test("remove-contacts-from-lists: nests excludeContactIds under `exclude`", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({
    listIds: ["l1"],
    sourceListIds: ["l9"],
    excludeContactIds: ["c9"],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).exclude, { contact_ids: ["c9"] });
});

Deno.test("remove-contacts-from-lists: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
