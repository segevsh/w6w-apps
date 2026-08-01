import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-get.ts";

const conn = { display: { region: "us", projectId: "999" } };

Deno.test("person-get: GETs /api/projects/{id}/persons/{personId}/", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: { id: 1, uuid: "abc", name: "Ada" } }],
    { connection: conn },
  );
  const result = await action.execute!({ personId: "1" }, ctx);
  assertEquals(calls[0].url, "https://us.posthog.com/api/projects/999/persons/1/");
  assertEquals(result, { id: 1, uuid: "abc", name: "Ada" });
});

Deno.test("person-get: requires personId", async () => {
  const { ctx, calls } = mockCtx([], { connection: conn });
  await assertRejects(
    async () => await action.execute!({ personId: "" }, ctx),
    Error,
    "personId",
  );
  assertEquals(calls.length, 0);
});
