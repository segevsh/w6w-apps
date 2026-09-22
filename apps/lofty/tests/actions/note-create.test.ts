import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/note-create.ts";

Deno.test("note-create: posts content, lead and pin state", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { noteId: 563172647619608 } }]);
  const result = await action.execute!({
    content: "Discussed Austin inventory",
    leadId: 563172647619608,
    isPin: false,
  }, ctx) as { noteId: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/notes");
  // isPin=false is a value: the schema marks it required.
  assertEquals(JSON.parse(calls[0].body!), {
    content: "Discussed Austin inventory",
    leadId: 563172647619608,
    isPin: false,
  });
  assertEquals(result.noteId, 563172647619608);
});

Deno.test("note-create: warns that content is silently truncated", () => {
  const content = action.params!.find((p) => p.key === "content")!;
  assert(/2000/.test(content.hint!), content.hint);
  assert(/silent/.test(content.hint!), content.hint);
});

Deno.test("note-create: is not idempotent — a retry logs a second note", () => {
  assertEquals(action.idempotent, false);
});
