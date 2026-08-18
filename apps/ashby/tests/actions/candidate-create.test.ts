import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/candidate-create.ts";

const ok = (results: unknown) => ({ status: 200, body: { success: true, results } });

Deno.test("candidate-create: posts the profile fields it was given", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "c1" })]);
  await action.execute!({
    name: "Ada Lovelace",
    email: "ada@example.com",
    linkedInUrl: "https://linkedin.com/in/ada",
    sourceId: "src_1",
    alternateEmailAddresses: "ada@work.com, ada@home.com",
  }, ctx);
  assertEquals(calls[0].url, "https://api.ashbyhq.com/candidate.create");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Ada Lovelace",
    email: "ada@example.com",
    linkedInUrl: "https://linkedin.com/in/ada",
    sourceId: "src_1",
    alternateEmailAddresses: ["ada@work.com", "ada@home.com"],
  });
});

Deno.test("candidate-create: parses a JSON location", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "c1" })]);
  await action.execute!({ name: "Ada", location: '{"city":"Berlin"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).location, { city: "Berlin" });
});

Deno.test("candidate-create: malformed location JSON is refused by name", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ name: "Ada", location: "{oops" }, ctx),
    Error,
    "location",
  );
  assertEquals(calls.length, 0);
});

/** The id, never the person. */
Deno.test("candidate-create: logs the id it made, not the name or address", async () => {
  const { ctx, logs } = mockCtx([ok({ id: "c1", name: "Ada" })]);
  await action.execute!({ name: "Ada Lovelace", email: "ada@example.com" }, ctx);
  assertEquals(logs[0].data, { candidateId: "c1" });
  assert(!JSON.stringify(logs).includes("Lovelace"), JSON.stringify(logs));
});

Deno.test("candidate-create: needs a name", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({ name: "  " }, ctx), Error, "name");
  assertEquals(calls.length, 0);
});

/** Creating twice splits one person's history across two records. */
Deno.test("candidate-create: warns in its description that it does not deduplicate", () => {
  assert(/does NOT deduplicate/i.test(action.description!), action.description);
});

/** `createdAt` here is ISO, unlike the millisecond filters elsewhere. */
Deno.test("candidate-create: says createdAt is ISO, not the filters' milliseconds", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "createdAt")!;
  assert(/ISO date string/.test(p.hint!), p.hint);
  assert(/NOT the Unix milliseconds/.test(p.hint!), p.hint);
});
