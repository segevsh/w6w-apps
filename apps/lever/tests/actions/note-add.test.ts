import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/note-add.ts";

const D = { display: { environment: "production" } };
const OPP = "8d49b010-cc6a-4f40-ace5-e86061c677ed";
const USER = "63dd55b2-a99f-4e7b-985f-22c7bf80ab42";
const created = { status: 200, body: { data: { id: "n1" } } };

Deno.test("note-add: posts the note with perform_as", async () => {
  const { ctx, calls } = mockCtx([created], D);
  const result = await action.execute(
    { opportunityId: OPP, value: "Background check cleared", performAs: USER },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(new URL(calls[0].url).pathname, `/v1/opportunities/${OPP}/notes`);
  assertEquals(new URL(calls[0].url).searchParams.get("perform_as"), USER);
  assertEquals(JSON.parse(calls[0].body!).value, "Background check cleared");
  assertEquals(result.id, "n1");
});

Deno.test("note-add: secret and notify are sent only when chosen", async () => {
  const plain = mockCtx([created], D);
  await action.execute({ opportunityId: OPP, value: "x", performAs: USER }, plain.ctx);
  assertEquals(new URL(plain.calls[0].url).searchParams.get("notify"), "false");
  assertEquals("secret" in (JSON.parse(plain.calls[0].body!) as object), false);

  const loud = mockCtx([created], D);
  await action.execute(
    { opportunityId: OPP, value: "x", performAs: USER, secret: true, notifyFollowers: true },
    loud.ctx,
  );
  assertEquals(new URL(loud.calls[0].url).searchParams.get("notify"), "true");
  assertEquals(JSON.parse(loud.calls[0].body!).secret, true);
});

Deno.test("note-add: a backdate is passed through only when positive", async () => {
  const { ctx, calls } = mockCtx([created], D);
  await action.execute(
    { opportunityId: OPP, value: "x", performAs: USER, createdAt: 1423231549510 },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).createdAt, 1423231549510);
});

Deno.test("note-add: refuses an empty note and a missing performAs", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ opportunityId: OPP, value: "  ", performAs: USER }, ctx),
    Error,
    "not worth a record",
  );
  await assertRejects(
    async () => await action.execute({ opportunityId: OPP, value: "x" }, ctx),
    Error,
    "attributes every write",
  );
  assertEquals(calls.length, 0);
});

/** The note is what somebody wrote about a person. */
Deno.test("note-add: logs ids, never the note itself", async () => {
  const { ctx, logs } = mockCtx([created], D);
  await action.execute(
    { opportunityId: OPP, value: "Concerns about references", performAs: USER },
    ctx,
  );
  assert(!/Concerns about references/.test(JSON.stringify(logs)), JSON.stringify(logs));
});

Deno.test("note-add: says notes are permanent and personal", () => {
  assert(/PERMANENT/.test(action.description!), action.description);
  assert(/data-subject request/.test(action.description!), action.description);
  assertEquals(action.idempotent, false);
});
