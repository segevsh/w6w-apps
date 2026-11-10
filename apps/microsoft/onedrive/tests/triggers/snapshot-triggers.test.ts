import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newPermission from "../../triggers/new-permission.ts";
import newDrive from "../../triggers/new-drive.ts";

const input = (state: unknown, params: Record<string, unknown> = {}) => ({
  params,
  state,
  subscriptionId: "sub",
});

const READ = { id: "perm-read", roles: ["read"], link: { type: "view" } };
const WRITE = { id: "perm-write", roles: ["write"], link: { type: "edit" } };

describe("new-permission", () => {
  const params = { itemId: "01ABC" };

  test("seeds the current permissions without emitting", async () => {
    const { ctx, calls } = mockCtx([{ body: { value: [READ] } }]);
    const r = await newPermission.poll!(input({}, params), ctx);
    assertEquals(r.events, []);
    assertEquals((r.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(calls[0], {
      method: "GET",
      url: "https://graph.microsoft.com/v1.0/me/drive/items/01ABC/permissions",
      headers: {},
      body: null,
    });
  });

  test("emits a newly added permission once, not a changed or removed one", async () => {
    const seed = await newPermission.poll!(
      input({}, params),
      mockCtx([{ body: { value: [READ] } }]).ctx,
    );
    const next = await newPermission.poll!(
      input(seed.nextState, params),
      mockCtx([{ body: { value: [{ ...READ, roles: ["write"] }, WRITE] } }]).ctx,
    );
    assertEquals(next.events, [WRITE]);
    const removed = await newPermission.poll!(
      input(next.nextState, params),
      mockCtx([{ body: { value: [WRITE] } }]).ctx,
    );
    assertEquals(removed.events, []);
  });

  test("the same state and response give the same result", async () => {
    const seed = await newPermission.poll!(
      input({}, params),
      mockCtx([{ body: { value: [READ] } }]).ctx,
    );
    const body = { value: [READ, WRITE] };
    const one = await newPermission.poll!(input(seed.nextState, params), mockCtx([{ body }]).ctx);
    const two = await newPermission.poll!(input(seed.nextState, params), mockCtx([{ body }]).ctx);
    assertEquals(one, two);
  });

  test("addresses another drive as /drives/{id}", async () => {
    const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
    await newPermission.poll!(input({}, { itemId: "01ABC", driveId: "b!sample-drive" }), ctx);
    assertEquals(
      calls[0].url,
      "https://graph.microsoft.com/v1.0/drives/b!sample-drive/items/01ABC/permissions",
    );
  });

  test("refuses to track a list longer than the page cap instead of guessing", async () => {
    const next = "https://graph.microsoft.com/v1.0/me/drive/items/01ABC/permissions?skiptoken=n";
    const pages = Array.from({ length: 10 }, () => ({
      body: { value: [], "@odata.nextLink": next },
    }));
    await assertRejects(
      () => newPermission.poll!(input({}, params), mockCtx(pages).ctx) as Promise<unknown>,
      Error,
      "more than 10 pages",
    );
  });

  test("drops the secret-bearing link URL and share id from emitted permissions", async () => {
    const seed = await newPermission.poll!(
      input({}, params),
      mockCtx([{ body: { value: [] } }]).ctx,
    );
    const shared = {
      id: "perm-link",
      roles: ["read"],
      shareId: "share-id-sample",
      link: { type: "view", scope: "anonymous", webUrl: "https://example.test/s/sample" },
    };
    const next = await newPermission.poll!(
      input(seed.nextState, params),
      mockCtx([{ body: { value: [shared] } }]).ctx,
    );
    assertEquals(next.events, [
      { id: "perm-link", roles: ["read"], link: { type: "view", scope: "anonymous" } },
    ]);
  });

  test("declares a required item id, output and sample", () => {
    assertEquals(newPermission.params!.find((p) => p.key === "itemId")?.required, true);
    assertEquals(newPermission.output.length > 0 && newPermission.sample !== undefined, true);
  });
});

describe("new-drive", () => {
  const DOCS = { id: "b!docs", name: "Documents", driveType: "documentLibrary" };
  const PERSONAL = { id: "b!me", name: "OneDrive", driveType: "business" };

  test("seeds the reachable drives without emitting, from GET /me/drives", async () => {
    const { ctx, calls } = mockCtx([{ body: { value: [PERSONAL] } }]);
    const r = await newDrive.poll!(input({}), ctx);
    assertEquals(r.events, []);
    assertEquals((r.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(calls[0], {
      method: "GET",
      url: "https://graph.microsoft.com/v1.0/me/drives",
      headers: {},
      body: null,
    });
  });

  test("emits a drive that appears after the seed, exactly once", async () => {
    const seed = await newDrive.poll!(
      input({}),
      mockCtx([{ body: { value: [PERSONAL] } }]).ctx,
    );
    const next = await newDrive.poll!(
      input(seed.nextState),
      mockCtx([{ body: { value: [PERSONAL, DOCS] } }]).ctx,
    );
    assertEquals(next.events, [DOCS]);
    const again = await newDrive.poll!(
      input(next.nextState),
      mockCtx([{ body: { value: [PERSONAL, DOCS] } }]).ctx,
    );
    assertEquals(again.events, []);
  });

  test("the same state and response give the same result", async () => {
    const seed = await newDrive.poll!(input({}), mockCtx([{ body: { value: [PERSONAL] } }]).ctx);
    const body = { value: [PERSONAL, DOCS] };
    const one = await newDrive.poll!(input(seed.nextState), mockCtx([{ body }]).ctx);
    const two = await newDrive.poll!(input(seed.nextState), mockCtx([{ body }]).ctx);
    assertEquals(one, two);
  });
});
