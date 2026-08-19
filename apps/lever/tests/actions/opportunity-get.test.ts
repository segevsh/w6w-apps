import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/opportunity-get.ts";

const D = { display: { environment: "production" } };
const UUID = "8d49b010-cc6a-4f40-ace5-e86061c677ed";
const opportunity = (extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    data: {
      id: UUID,
      name: "Ada Lovelace",
      contact: { id: "c1", isAnonymized: false },
      stage: { id: "s1", text: "Phone Screen" },
      origin: "sourced",
      tags: ["London"],
      applications: [{ id: "a1" }, "a2"],
      ...extra,
    },
  },
});

Deno.test("opportunity-get: expands by default and returns the contact id", async () => {
  const { ctx, calls } = mockCtx([opportunity()], D);
  const result = await action.execute({ opportunityId: UUID }, ctx) as Record<string, unknown>;
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("expand"), "contact,stage,owner,applications");
  assertEquals(result.contactId, "c1");
  assertEquals(result.applicationIds, ["a1", "a2"]);
});

/** An archived opportunity carries the reason that says hire or rejection. */
Deno.test("opportunity-get: reports the archive reason id", async () => {
  const { ctx } = mockCtx([opportunity({ archived: { reason: "r1", archivedAt: 1 } })], D);
  const result = await action.execute({ opportunityId: UUID }, ctx) as Record<string, unknown>;
  assertEquals(result.isArchived, true);
  assertEquals(result.archiveReasonId, "r1");
});

/** An anonymized contact has no name by design. */
Deno.test("opportunity-get: flags an anonymized contact as deliberate", async () => {
  const { ctx, logs } = mockCtx([
    opportunity({ contact: { id: "c1", isAnonymized: true }, name: "" }),
  ], D);
  const result = await action.execute({ opportunityId: UUID }, ctx) as Record<string, unknown>;
  assertEquals(result.isAnonymized, true);
  assert(
    logs.some((l) => /gone by design/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("opportunity-get: an unexpanded contact still yields an id", async () => {
  const { ctx } = mockCtx([opportunity({ contact: "c9" })], D);
  const result = await action.execute({ opportunityId: UUID }, ctx) as Record<string, unknown>;
  assertEquals(result.contactId, "c9");
  assertEquals(result.isAnonymized, false);
});

Deno.test("opportunity-get: refuses a non-UUID before requesting", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ opportunityId: "abc" }, ctx),
    Error,
    "must be a UUID",
  );
  assertEquals(calls.length, 0);
});
