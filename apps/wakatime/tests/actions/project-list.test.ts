import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/project-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("project-list: GETs the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "p1", name: "w6w" }] } }]);
  const out = await action.execute!({ q: "w6" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.wakatime.com/api/v1/users/current/projects?q=w6");
  assertEquals(out, { data: [{ id: "p1", name: "w6w" }] });
});

Deno.test("project-list: a vendor error reports status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  await assertRejects(
    async () => await action.execute!({ q: "w6" }, ctx),
    Error,
    "HTTP 401 — Unauthorized.",
  );
});
