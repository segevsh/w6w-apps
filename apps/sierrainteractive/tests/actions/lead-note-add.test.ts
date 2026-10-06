import { assertEquals } from "@std/assert";
import leadNoteAdd from "../../actions/lead-note-add.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-note-add: POST /zapier/leads/{id}/note sends message and shouldNotify", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await leadNoteAdd.execute({ leadIdOrEmail: "12", message: "hi", shouldNotify: "true" }, ctx);
  assertEquals(pathOf(calls[0].url), "/zapier/leads/12/note");
  assertEquals(bodyOf(calls[0]), { message: "hi", shouldNotify: "true" });
});

Deno.test("lead-note-add: shouldNotify is omitted when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await leadNoteAdd.execute({ leadIdOrEmail: "12", message: "hi" }, ctx);
  assertEquals(bodyOf(calls[0]), { message: "hi" });
});
