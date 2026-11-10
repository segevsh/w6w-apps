import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx, pathOf, queryAll } from "../_helpers.ts";
import newAsset from "../../triggers/new-asset.ts";
import newOrUpdatedAsset from "../../triggers/new-or-updated-asset.ts";
import newPart from "../../triggers/new-part.ts";
import newOrUpdatedPart from "../../triggers/new-or-updated-part.ts";
import newLocation from "../../triggers/new-location.ts";
import newMeter from "../../triggers/new-meter.ts";
import newTeam from "../../triggers/new-team.ts";
import newUser from "../../triggers/new-user.ts";
import newVendor from "../../triggers/new-vendor.ts";
import newWorkOrderComment from "../../triggers/new-work-order-comment.ts";

const at = (state: unknown, params: Record<string, unknown> = {}) =>
  ({ params, state, subscriptionId: "sub-1" }) as never;
const stateOf = (r: { nextState: unknown }) => r.nextState;

// Newest-first feeds: the LITERAL request is GET /v1/<path>?sort=<sort>&limit=100.
const feeds = [
  { trigger: newAsset, path: "/v1/assets", list: "assets", sort: "-createdAt" },
  { trigger: newPart, path: "/v1/parts", list: "parts", sort: "-createdAt" },
];
for (const { trigger, path, list, sort } of feeds) {
  test(`${trigger.key}: seeds, emits only the new record, retries identically, sends ${sort}`, async () => {
    const body = (...ids: number[]) => ({ [list]: ids.map((id) => ({ id })), nextCursor: null });
    const seed = mockCtx([{ body: body(1) }]);
    const seeded = await trigger.poll!(at({}), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(pathOf(seed.calls[0].url), path);
    assertEquals(queryAll(seed.calls[0].url), { sort: [sort], limit: ["100"] });
    const first = await trigger.poll!(at(stateOf(seeded)), mockCtx([{ body: body(2, 1) }]).ctx);
    const retry = await trigger.poll!(at(stateOf(seeded)), mockCtx([{ body: body(2, 1) }]).ctx);
    assertEquals(first.events, [{ id: 2 }]);
    assertEquals(retry, first);
  });
}

// Edited-record feeds: id + updatedAt is the identity, so an edit is a new event.
const revisions = [
  { trigger: newOrUpdatedAsset, path: "/v1/assets", list: "assets" },
  { trigger: newOrUpdatedPart, path: "/v1/parts", list: "parts" },
];
for (const { trigger, path, list } of revisions) {
  test(`${trigger.key}: an edited record is a new event; sends -updatedAt`, async () => {
    const v1 = { id: 1, updatedAt: "2026-11-09T09:00:00.000Z" };
    const v2 = { id: 1, updatedAt: "2026-11-10T09:00:00.000Z" };
    const body = (...rows: unknown[]) => ({ [list]: rows, nextCursor: null });
    const seed = mockCtx([{ body: body(v1) }]);
    const seeded = await trigger.poll!(at({}), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(pathOf(seed.calls[0].url), path);
    assertEquals(queryAll(seed.calls[0].url), { sort: ["-updatedAt"], limit: ["100"] });
    const same = await trigger.poll!(at(stateOf(seeded)), mockCtx([{ body: body(v1) }]).ctx);
    assertEquals(same.events, []);
    const edited = await trigger.poll!(at(stateOf(seeded)), mockCtx([{ body: body(v2, v1) }]).ctx);
    const retry = await trigger.poll!(at(stateOf(seeded)), mockCtx([{ body: body(v2, v1) }]).ctx);
    assertEquals(edited.events, [v2]);
    assertEquals(retry, edited);
  });
}

// Cursor snapshots: no sort exists, so the whole list is read through nextCursor.
const snapshots = [
  { trigger: newLocation, path: "/v1/locations", list: "locations", params: {} },
  { trigger: newMeter, path: "/v1/meters", list: "meters", params: {} },
  { trigger: newTeam, path: "/v1/teams", list: "teams", params: {} },
  { trigger: newUser, path: "/v1/users", list: "users", params: {} },
  { trigger: newVendor, path: "/v1/vendors", list: "vendors", params: {} },
  {
    trigger: newWorkOrderComment,
    path: "/v1/workorders/8/comments",
    list: "comments",
    params: { workOrderId: 8 },
  },
];
for (const { trigger, path, list, params } of snapshots) {
  test(`${trigger.key}: reads every page, seeds, emits only the new id, sends its literal requests`, async () => {
    const page = (ids: number[], nextCursor: string | null) => ({
      body: { [list]: ids.map((id) => ({ id })), nextCursor },
    });
    const seed = mockCtx([page([1], "c1"), page([2], null)]);
    const seeded = await trigger.poll!(at({}, params), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.map((c) => [c.method, pathOf(c.url), queryAll(c.url)]), [
      ["GET", path, { limit: ["200"] }],
      ["GET", path, { limit: ["200"], cursor: ["c1"] }],
    ]);
    const run = () =>
      trigger.poll!(
        at(stateOf(seeded), params),
        mockCtx([page([1], "c1"), page([3, 2], null)]).ctx,
      );
    const first = await run();
    assertEquals(first.events, [{ id: 3 }]);
    assertEquals(await run(), first);
  });
}

test("cursor snapshot refuses a list longer than 25 pages (the 5000-row cap)", async () => {
  const responses = Array.from({ length: 25 }, (_, i) => ({
    body: { vendors: [{ id: i }], nextCursor: "more" },
  }));
  await assertRejects(
    () => newVendor.poll!(at({}), mockCtx(responses).ctx),
    Error,
    "5000",
  );
});
