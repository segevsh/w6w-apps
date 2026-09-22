import { assertEquals } from "@std/assert";
import action from "../../actions/get-client-record.ts";
import { API_ROOT, mockCtx, urlOf } from "../_helpers.ts";

const record = {
  id: "rec-1",
  isActive: true,
  dateCreated: "2026-08-01T10:00:00Z",
  dateModified: "2026-09-01T10:00:00Z",
  client: { firstName: "Ada", lastName: "Lovelace" },
};

Deno.test("get-client-record: reads /consultant/records/{recordId}", async () => {
  const { ctx, calls } = mockCtx([{ body: record }]);
  const result = await action.execute({ recordId: "rec-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/consultant/records/rec-1`);
  assertEquals(result, record);
});

Deno.test("get-client-record: the id is path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: record }]);
  await action.execute({ recordId: "rec/../1?x" }, ctx);
  assertEquals(urlOf(calls[0]), `${API_ROOT}/consultant/records/rec%2F..%2F1%3Fx`);
});

Deno.test("get-client-record: sends no body and no query", async () => {
  const { ctx, calls } = mockCtx([{ body: record }]);
  await action.execute({ recordId: "rec-1" }, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("get-client-record: output surfaces the fields a follow-up step needs", () => {
  assertEquals(action.type, "read");
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), [
    "id",
    "isActive",
    "dateCreated",
    "dateModified",
    "client",
  ]);
  assertEquals(action.params!.find((p) => p.key === "recordId")!.required, true);
});
