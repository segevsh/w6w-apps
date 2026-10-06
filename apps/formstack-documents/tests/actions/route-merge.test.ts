import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/route-merge.ts";

Deno.test("route-merge: POSTs data to /route/{id}/{key}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: 1 } }]);
  const out = await action.execute(
    { id: "129578", key: "l3kjs", data: { State: "California" } } as never,
    ctx,
  ) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "POST");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/route/129578/l3kjs");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body!), { "State": "California" });
  assert(out !== null);
});

Deno.test("route-merge: passes through the multi-file JSON envelope when downloading", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: 1, files: [{ name: "Invoice.pdf", file_contents: "JVBERg==" }] },
  }]);
  const out = await action.execute(
    { id: "129578", key: "l3kjs", download: true } as never,
    ctx,
  ) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "POST");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/route/129578/l3kjs");
  assertEquals(url.searchParams.get("download"), "1");
  assertEquals(JSON.parse(call.body!), {});
  assertEquals((out.files as unknown[]).length, 1);
  assertEquals("file" in out, false);
});

Deno.test("route-merge: idempotent flag is false", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("route-merge: fails clearly when the lookup returns no merge key", async () => {
  const { ctx } = mockCtx([{ body: { id: "1" } }]);
  let message = "";
  try {
    await action.execute({ id: "1" } as never, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("no merge key"), message);
});

Deno.test("route-merge: surfaces a rejected merge key as an error with the status", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  let message = "";
  try {
    await action.execute({ id: "1", key: "bad" } as never, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401"), message);
});

Deno.test("route-merge: declares key, type and a description", () => {
  assertEquals(action.key, "route-merge");
  assertEquals(action.type, "perform");
  assert(action.description!.length > 10);
});
