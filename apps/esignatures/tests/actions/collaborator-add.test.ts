import { assert, assertEquals, assertRejects } from "@std/assert";
import collaboratorAdd from "../../actions/collaborator-add.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("collaborator-add: calls POST /api/templates/t1/collaborators with the documented body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ template_collaborator_id: "col1", template_collaborator_editor_url: "u" }] },
  }]);
  const out = await collaboratorAdd.execute(
    { templateId: "t1", name: "Chris" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/templates/t1/collaborators");
  assertEquals(calls[0].url.includes("token="), false);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { name: "Chris" });
  assert(
    (out.collaborator as { template_collaborator_id: string }).template_collaborator_id === "col1",
    JSON.stringify(out),
  );
});

Deno.test("collaborator-add: a vendor error surfaces its error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("forbidden", "Invalid or missing Secret token"),
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(collaboratorAdd.execute({ templateId: "t1", name: "Chris" } as never, ctx)),
    Error,
  );
  assert(
    err.message.includes("forbidden") && err.message.includes("Invalid or missing"),
    err.message,
  );
});
