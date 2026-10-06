import { assert, assertEquals } from "@std/assert";
import sourcesList from "../../actions/sources-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("sources-list: GET /v1/sources with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { sources: [] } }]);
  const out = await sourcesList.execute({}, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/sources");
  assertEquals(calls[0].body, null);
  assert("sources" in out);
});

Deno.test("sources-list: declares type read and every required param", () => {
  assertEquals(sourcesList.type, "read");
  const required = (sourcesList.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, []);
});

Deno.test("sources-list: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await sourcesList.execute({}, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
