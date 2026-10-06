import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse, PDF_BYTES } from "../_helpers.ts";
import action from "../../actions/document-merge.ts";

Deno.test("document-merge: POSTs data to /merge/{id}/{key} with the supplied key", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: 1 } }]);
  const out = await action.execute(
    { id: "436346", key: "firm3", data: { FirstName: "John" }, testMode: true } as never,
    ctx,
  ) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "POST");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/merge/436346/firm3");
  assertEquals(url.searchParams.get("test"), "1");
  assertEquals(JSON.parse(call.body!), { "FirstName": "John" });
  assert(out !== null);
});

Deno.test("document-merge: looks up the merge key when none is supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "436346", key: "firm3" } }, {
    body: { success: 1 },
  }]);
  const out = await action.execute({ id: "436346", data: { A: "b" } } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].method, "GET");
  assertEquals(parse(calls[0].url).pathname, "/api/documents/436346");
  const call = calls[1];
  assertEquals(call.method, "POST");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/merge/436346/firm3");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body!), { "A": "b" });
  assert(out !== null);
});

Deno.test("document-merge: returns a downloaded PDF base64-encoded under `file`", async () => {
  const { ctx, calls } = mockCtx([{
    headers: { "content-type": "application/pdf" },
    body: PDF_BYTES,
  }]);
  const out = await action.execute(
    { id: "436346", key: "firm3", download: true } as never,
    ctx,
  ) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "POST");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/merge/436346/firm3");
  assertEquals(url.searchParams.get("download"), "1");
  assertEquals(JSON.parse(call.body!), {});
  const file = out.file as { contentBase64: string; contentType: string; sizeBytes: number };
  assertEquals(file.contentType, "application/pdf");
  assertEquals(file.sizeBytes, PDF_BYTES.length);
  assertEquals(atob(file.contentBase64), new TextDecoder().decode(PDF_BYTES));
});

Deno.test("document-merge: idempotent flag is false", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("document-merge: fails clearly when the lookup returns no merge key", async () => {
  const { ctx } = mockCtx([{ body: { id: "1" } }]);
  let message = "";
  try {
    await action.execute({ id: "1" } as never, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("no merge key"), message);
});

Deno.test("document-merge: surfaces a rejected merge key as an error with the status", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  let message = "";
  try {
    await action.execute({ id: "1", key: "bad" } as never, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401"), message);
});

Deno.test("document-merge: declares key, type and a description", () => {
  assertEquals(action.key, "document-merge");
  assertEquals(action.type, "perform");
  assert(action.description!.length > 10);
});
