import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/opportunity-list.ts";

const D = { display: { environment: "production" } };
const opportunities = {
  status: 200,
  body: {
    data: [
      { id: "o1", name: "Ada", contact: { id: "c1" } },
      { id: "o2", name: "Ada", contact: { id: "c1" }, archived: { reason: "r1" } },
      { id: "o3", name: "Grace", contact: "c2" },
    ],
    next: "0.14148.abc",
    hasNext: true,
  },
};

/** Lever's own default omits confidential records; this one does not. */
Deno.test("opportunity-list: defaults confidentiality to all", async () => {
  const { ctx, calls } = mockCtx([opportunities], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).searchParams.get("confidentiality"), "all");
  assertEquals(result.confidentialityUsed, "all");
});

Deno.test("opportunity-list: choosing Lever's default is called out", async () => {
  const { ctx, calls, logs } = mockCtx([opportunities], D);
  await action.execute({ confidentiality: "non-confidential" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("confidentiality"), "non-confidential");
  assert(
    logs.some((l) => /the result is a subset and nothing in it says so/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** One person, several applications. */
Deno.test("opportunity-list: deduplicates people by contact, not opportunity", async () => {
  const { ctx } = mockCtx([opportunities], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.count, 3);
  assertEquals(result.peopleCount, 2);
  assertEquals(result.contactIds, ["c1", "c2"]);
});

/** The contact may be an id or an expanded object. */
Deno.test("opportunity-list: reads the contact whether it is expanded or not", async () => {
  const { ctx } = mockCtx([opportunities], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assert((result.contactIds as string[]).includes("c2"), "the string form was missed");
});

Deno.test("opportunity-list: filters and the cursor reach the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], D);
  await action.execute({
    postingId: "p1",
    stageId: "s1",
    email: "ada@example.com",
    tags: "London, Senior",
    archived: "false",
    expand: "contact, stage",
    cursor: "0.14148.abc",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("posting_id"), "p1");
  assertEquals(q.get("stage_id"), "s1");
  assertEquals(q.get("email"), "ada@example.com");
  assertEquals(q.get("tag"), "London,Senior");
  assertEquals(q.get("archived"), "false");
  assertEquals(q.get("expand"), "contact,stage");
  assertEquals(q.get("offset"), "0.14148.abc", "Lever's cursor is passed as `offset`");
});

Deno.test("opportunity-list: returns the cursor for the next page", async () => {
  const { ctx } = mockCtx([opportunities], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.nextCursor, "0.14148.abc");
  assertEquals(result.hasNext, true);
});

/** Candidate names and emails are personal data. */
Deno.test("opportunity-list: logs counts, never candidates", async () => {
  const { ctx, logs } = mockCtx([opportunities], D);
  await action.execute({}, ctx);
  const data = JSON.stringify(logs);
  assert(!/Ada|Grace/.test(data), data);
  assert(/peopleCount/.test(data), data);
});
