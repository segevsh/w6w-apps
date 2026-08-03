import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/folder-get-many.ts";

Deno.test("folder-get-many: GETs /user/folders and returns the folder tree", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope({
        id: "507eb4d2ceae3f9674000000",
        name: "Contact Forms",
        forms: { "31504059977966": { id: "31504059977966" } },
        subfolders: [{ id: "907eb4d2ceae3f9674000000" }],
      }),
    },
  ]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;

  assertEquals(new URL(calls[0].url).pathname, "/user/folders");
  assertEquals(result.name, "Contact Forms");
  assertEquals((result.subfolders as unknown[]).length, 1);
});
