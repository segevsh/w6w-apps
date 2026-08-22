import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/candidate-note-create.ts";

const ok = (results: unknown) => ({ status: 200, body: { success: true, results } });

Deno.test("candidate-note-create: posts the note with notifications off by default", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "n1" })]);
  await action.execute!({ candidateId: "c1", note: "Screening passed." }, ctx);
  assertEquals(calls[0].url, "https://api.ashbyhq.com/candidate.createNote");
  assertEquals(JSON.parse(calls[0].body!), {
    candidateId: "c1",
    note: "Screening passed.",
    sendNotifications: false,
  });
});

/** Private notes need a key permission Ashby leaves off by default. */
Deno.test("candidate-note-create: private is sent only when asked for", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "n1" })]);
  await action.execute!({ candidateId: "c1", note: "x", isPrivate: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).isPrivate, true);

  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "isPrivate")!;
  assert(/OFF by default/.test(p.hint!), p.hint);
});

/** The note may be a screening verdict about a named person. */
Deno.test("candidate-note-create: logs the ids, never the note text", async () => {
  const { ctx, logs } = mockCtx([ok({ id: "n1" })]);
  await action.execute!({ candidateId: "c1", note: "Rejected: weak on systems design" }, ctx);
  assert(!JSON.stringify(logs).includes("systems design"), JSON.stringify(logs));
  assertEquals(logs[0].data, { candidateId: "c1", noteId: "n1" });
});

Deno.test("candidate-note-create: an empty note is refused before the request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ candidateId: "c1", note: "   " }, ctx),
    Error,
    "note",
  );
  assertEquals(calls.length, 0);
});

Deno.test("candidate-note-create: needs a candidate id", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await action.execute!({ note: "x" }, ctx), Error, "candidateId");
});
