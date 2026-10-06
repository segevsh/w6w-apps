import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

const run = (m: ReturnType<typeof mockCtx>) => api.check!({} as never, m.ctx);

Deno.test("api: an unsigned 400 with Sierra's envelope is a PASS", async () => {
  const m = mockCtx([{ status: 400, body: errorBody("Unauthorized request") }]);
  const r = await run(m);
  assertEquals(r.state, "ok");
  assertEquals(m.calls[0].headers["sierra-user-apikey"], undefined);
  assertEquals(api.credential, "none");
});

Deno.test("api: 5xx and non-JSON bodies are down; foreign JSON is unknown", async () => {
  assertEquals((await run(mockCtx([{ status: 503, body: "x" }]))).state, "down");
  assertEquals((await run(mockCtx([{ status: 200, body: "<html></html>" }]))).state, "down");
  assertEquals((await run(mockCtx([{ status: 200, body: { hello: 1 } }]))).state, "unknown");
});
