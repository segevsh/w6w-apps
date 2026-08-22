import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/opportunity-create.ts";

const D = { display: { environment: "production" } };
const USER = "8d49b010-cc6a-4f40-ace5-e86061c677ed";
const noMatch = { status: 200, body: { data: [] } };
const created = { status: 200, body: { data: { id: "o9", name: "Ada", contact: { id: "c1" } } } };

Deno.test("opportunity-create: posts with perform_as in the query string", async () => {
  const { ctx, calls } = mockCtx([noMatch, created], D);
  const result = await action.execute({
    performAs: USER,
    name: "Ada Lovelace",
    emails: "ada@example.com",
    postingIds: "p1",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls[1].method, "POST");
  assertEquals(new URL(calls[1].url).searchParams.get("perform_as"), USER);
  const body = JSON.parse(calls[1].body!) as Record<string, unknown>;
  assertEquals(body.emails, ["ada@example.com"]);
  assertEquals(body.postings, ["p1"]);
  assertEquals(result.id, "o9");
  assertEquals(result.attachedToPosting, true);
});

/** Lever refuses a create without it, and it decides the audit trail. */
Deno.test("opportunity-create: requires performAs, and says why", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(
    async () => await action.execute({ name: "Ada" }, ctx),
    Error,
  );
  assert(/attributes every write to a user/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

/**
 * The sharp edge: a create against a known email keeps the existing contact's
 * details and reports success.
 */
Deno.test("opportunity-create: warns when the email matches an existing person", async () => {
  const { ctx, logs } = mockCtx([
    { status: 200, body: { data: [{ contact: { id: "c1" } }] } },
    created,
  ], D);
  const result = await action.execute({
    performAs: USER,
    emails: "ada@example.com",
    phones: "555-0100",
  }, ctx) as Record<string, unknown>;

  assertEquals(result.deduped, true);
  assert(
    logs.some((l) => /take precedence over anything supplied here/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** A candidate attached to no job is a real and rarely intended state. */
Deno.test("opportunity-create: notes a candidate with no posting", async () => {
  const { ctx, logs } = mockCtx([created], D);
  const result = await action.execute({ performAs: USER, name: "Ada" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.attachedToPosting, false);
  assert(
    logs.some((l) => /attached to no job/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** The dedupe lookup is context, not a gate. */
Deno.test("opportunity-create: a failed lookup does not stop the create", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }, created], D);
  const result = await action.execute(
    { performAs: USER, emails: "ada@example.com" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.id, "o9");
  assertEquals(result.deduped, false);
});

/** Candidate names and emails are personal data. */
Deno.test("opportunity-create: logs ids, never the candidate", async () => {
  const { ctx, logs } = mockCtx([noMatch, created], D);
  await action.execute({ performAs: USER, name: "Ada", emails: "ada@example.com" }, ctx);
  assert(!/ada@example\.com/.test(JSON.stringify(logs)), JSON.stringify(logs));
});

Deno.test("opportunity-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
  assert(/DEDUPES on email/.test(action.description!), action.description);
});
