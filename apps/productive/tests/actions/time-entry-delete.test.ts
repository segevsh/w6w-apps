import { assertEquals, assertRejects } from "@std/assert";
import timeEntryDelete from "../../actions/time-entry-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("time-entry-delete: DELETE /time_entries/{id} reports ok and the id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await timeEntryDelete.execute({ id: "42" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/time_entries/42");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(out, { ok: true, id: "42" });
});

Deno.test("time-entry-delete: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("404", "not_found", "Not Found", "Resource not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(timeEntryDelete.execute({ id: "42" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Resource not found"), true, err.message);
});

Deno.test("time-entry-delete: declares perform and idempotent=true", () => {
  assertEquals(timeEntryDelete.type, "perform");
  assertEquals(timeEntryDelete.idempotent, true);
  assertEquals(timeEntryDelete.key, "time-entry-delete");
});
