import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/backup-list.ts";

const ORG = "11111111-2222-3333-4444-555555555555";
const SVC = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const D = { display: { organizationId: ORG, plane: "control" } };

const backups = {
  status: 200,
  body: {
    result: [
      { id: "b-1", status: "done", finishedAt: "2026-08-19T02:00:00Z", sizeInBytes: 1000 },
      { id: "b-2", status: "done", finishedAt: "2026-08-18T02:00:00Z", sizeInBytes: 900 },
      { id: "b-3", status: "in_progress", startedAt: "2026-08-19T03:00:00Z", sizeInBytes: 0 },
    ],
  },
};

Deno.test("backup-list: reads a service's backups", async () => {
  const { ctx, calls } = mockCtx([backups], D);
  const result = await action.execute({ serviceId: SVC }, ctx) as Record<string, unknown>;
  assert(calls[0].url.endsWith(`/services/${SVC}/backups`), calls[0].url);
  assertEquals(result.count, 3);
  assertEquals(result.totalBytes, 1900);
});

/** A backup in progress is listed and cannot be restored from. */
Deno.test("backup-list: counts only the finished ones as usable", async () => {
  const { ctx } = mockCtx([backups], D);
  const result = await action.execute({ serviceId: SVC }, ctx) as Record<string, unknown>;
  assertEquals(result.usableCount, 2);
  assertEquals(result.oldest, "2026-08-18T02:00:00Z");
  assertEquals(result.newest, "2026-08-19T02:00:00Z");
});

/** A restore provisions a new service, so it is not offered as a button. */
Deno.test("backup-list: says what restoring actually involves, and offers no restore", () => {
  assert(/restoring one provisions a NEW service/.test(action.description!), action.description);
  assert(/DELETED WITH THE SERVICE/.test(action.description!), action.description);
  assertEquals(action.type, "read");
});

Deno.test("backup-list: a service with no backups is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { result: [] } }], D);
  const result = await action.execute({ serviceId: SVC }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.usableCount, 0);
  assertEquals(result.oldest, undefined);
});
