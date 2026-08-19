import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/stage-list.ts";

const D = { display: { environment: "production" } };

/** Stage ids are per account, so a name-to-id map is the useful output. */
Deno.test("stage-list: returns a name-to-id map in pipeline order", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [{ id: "s1", text: "New Lead" }, { id: "s2", text: "Phone Screen" }] },
  }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v1/stages");
  assertEquals(result.byName, { "New Lead": "s1", "Phone Screen": "s2" });
  assertEquals(result.firstStageId, "s1");
});

/** Two stages can share a name, and resolving by name is then ambiguous. */
Deno.test("stage-list: reports duplicate names rather than collapsing them", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: {
      data: [
        { id: "s1", text: "Onsite" },
        { id: "s2", text: "Onsite" },
        { id: "s3", text: "Offer" },
      ],
    },
  }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.duplicateNames, ["Onsite"]);
  assertEquals((result.byName as Record<string, string>).Onsite, "s1", "the first is kept");
  assert(
    logs.some((l) => l.level === "warn" && /nobody is watching/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("stage-list: a clean pipeline warns about nothing", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { data: [{ id: "s1", text: "New" }] } }], D);
  await action.execute({}, ctx);
  assertEquals(logs.length, 0);
});
