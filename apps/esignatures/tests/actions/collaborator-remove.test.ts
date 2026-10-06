import { assert, assertEquals, assertRejects } from "@std/assert";
import collaboratorRemove from "../../actions/collaborator-remove.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("collaborator-remove: calls POST /api/templates/t1/collaborators/col1/remove with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "removed" } }]);
  const out = await collaboratorRemove.execute(
    { templateId: "t1", collaboratorId: "col1" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/templates/t1/collaborators/col1/remove");
  assertEquals(calls[0].url.includes("token="), false);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assert(out.status === "removed", JSON.stringify(out));
});

Deno.test("collaborator-remove: a vendor error surfaces its error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "Invalid or missing Secret token"),
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        collaboratorRemove.execute({ templateId: "t1", collaboratorId: "col1" } as never, ctx),
      ),
    Error,
  );
  assert(
    err.message.includes("forbidden") && err.message.includes("Invalid or missing"),
    err.message,
  );
});
