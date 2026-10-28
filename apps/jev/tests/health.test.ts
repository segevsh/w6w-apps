import { assertEquals } from "@std/assert";
import { mockCtx } from "./_helpers.ts";
import service from "../health/service.ts";

Deno.test("service: 5xx is down, 401 is ok", async () => {
  const down = mockCtx([{ status: 503, body: {} }]);
  assertEquals((await service.check!({} as never, down.ctx)).state, "down");
  const up = mockCtx([{ status: 401, body: {} }]);
  assertEquals((await service.check!({} as never, up.ctx)).state, "ok");
});
