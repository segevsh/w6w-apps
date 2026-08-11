import { assertEquals } from "@std/assert";
import action from "../../actions/member-list.ts";
import { listEnvelope, mockCtx, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("member-list: GETs /v2/members", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "m-1" }]) }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/members");
  assertEquals(out.items.length, 1);
});

/** The three include-flags are independent axes, not one tri-state. */
Deno.test("member-list: all three include flags are sent separately", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({
    includeDisabled: true,
    includeInvitationPending: true,
    includeInvited: true,
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    includeDisabled: "true",
    includeInvitationPending: "true",
    includeInvited: "true",
  });
});

Deno.test("member-list: roles become repeated roles[] keys", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ roles: ["admin", "maker"], query: "jane" }, ctx);
  assertEquals(queryAll(calls[0].url, "roles[]"), ["admin", "maker"]);
  assertEquals(queryOf(calls[0].url).query, "jane");
});
