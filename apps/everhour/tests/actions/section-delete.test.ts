import { assertEquals, assertRejects } from "@std/assert";
import sectionDelete from "../../actions/section-delete.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("section-delete: DELETE /sections/{sectionId} with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await sectionDelete.execute({ "sectionId": 349235 }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/sections/349235");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "ok": true });
});

Deno.test("section-delete: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () => Promise.resolve(sectionDelete.execute({ "sectionId": 349235 }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("section-delete: declares perform and idempotent=true", () => {
  assertEquals(sectionDelete.type, "perform");
  assertEquals(sectionDelete.idempotent, true);
});
