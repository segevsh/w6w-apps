import { assertEquals, assertRejects } from "@std/assert";
import noteFlagOutdated from "../../actions/note-flag-outdated.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("note-flag-outdated: PUT /v1/notes/n1/flag-as-outdated with the documented parameters", async () => {
  const response = { id: "n1", reviewState: "Outdated" };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await noteFlagOutdated.execute({ noteId: "n1", reason: " Wrong " }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/notes/n1/flag-as-outdated");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), { reason: "Wrong" });
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("note-flag-outdated: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () => await noteFlagOutdated.execute({ noteId: "n1", reason: " Wrong " }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});

Deno.test("note-flag-outdated: a blank reason is refused (the schema requires it)", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await noteFlagOutdated.execute({ noteId: "n1", reason: " " }, ctx),
    Error,
    "reason",
  );
  assertEquals(calls.length, 0);
});
