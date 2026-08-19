import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/service-delete.ts";

const ORG = "11111111-2222-3333-4444-555555555555";
const SVC = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const D = { display: { organizationId: ORG, plane: "control" } };

const service = (state: string) => ({ status: 200, body: { result: { name: "prod", state } } });
const backups = (n: number) => ({
  status: 200,
  body: { result: Array.from({ length: n }, (_, i) => ({ id: `b-${i}` })) },
});

Deno.test("service-delete: reads the service and its backups, then deletes", async () => {
  const { ctx, calls } = mockCtx([service("stopped"), backups(3), { status: 204 }], D);
  const result = await action.execute(
    { serviceId: SVC, confirmName: "prod" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[2].method, "DELETE");
  assertEquals(result.deleted, true);
  assertEquals(result.backupsDeleted, 3);
});

/** Deleting is two deliberate acts rather than one. */
Deno.test("service-delete: refuses a service that is not stopped, and says why", async () => {
  for (const state of ["running", "idle", "starting"]) {
    const { ctx, calls } = mockCtx([service(state)], D);
    let message = "";
    try {
      await action.execute({ serviceId: SVC, confirmName: "prod" }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(new RegExp(`is \\\`${state}\\\``).test(message), message);
    assert(/two acts rather than one/.test(message), message);
    assertEquals(calls.length, 1, "nothing was deleted");
  }
});

/** The name is what a person recognises; a UUID typed twice is copied twice. */
Deno.test("service-delete: the confirmation is the name, not the id", async () => {
  const { ctx, calls } = mockCtx([service("stopped")], D);
  let message = "";
  try {
    await action.execute({ serviceId: SVC, confirmName: SVC }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`confirmName` must match the service name/.test(message), message);
  assertEquals(calls.length, 1);
  const param = action.params!.find((p) => p.key === "confirmName")!;
  assert(/a UUID typed twice is a UUID copied twice/.test(param.hint!), param.hint);
});

/** "We have backups" is not a recovery plan when the backups go too. */
Deno.test("service-delete: warns that the backups went with it", async () => {
  const { ctx, logs } = mockCtx([service("stopped"), backups(2), { status: 204 }], D);
  await action.execute({ serviceId: SVC, confirmName: "prod" }, ctx);
  assertEquals(logs[0].level, "warn");
  assert(/its data and its backups are gone together/.test(logs[0].message), logs[0].message);
  assert(/BACKUPS are deleted with it/.test(action.description!), action.description);
});

Deno.test("service-delete: an unreadable backup list does not stop the delete", async () => {
  const { ctx } = mockCtx([service("stopped"), { status: 403, body: {} }, { status: 204 }], D);
  const result = await action.execute(
    { serviceId: SVC, confirmName: "prod" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.deleted, true);
  assertEquals(result.backupsDeleted, undefined);
});
