import { assertEquals } from "@std/assert";
import contactListDelete from "../../actions/contact-list-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("contact-list-delete: DELETEs the list's path and returns the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await contactListDelete.execute({ listIdOrName: "My First List" }, ctx) as {
    listIdOrName: string;
    status: number;
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/api/contact-lists/My%20First%20List`);
  assertEquals(result.listIdOrName, "My First List");
  assertEquals(result.status, 204);
});

Deno.test("contact-list-delete: declared idempotent — the list stays gone on a retry", () => {
  assertEquals(contactListDelete.idempotent, true);
});
