import { assertEquals, assertRejects } from "@std/assert";
import commentCreate from "../../actions/comment-create.ts";
import { API_ROOT, envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("comment-create: POSTs /comments with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  const out = await commentCreate.execute({
    "description": "Renewal conversation started.",
    "userId": 5,
    "clientId": 12,
    "isPinned": false,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/comments`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    "description": "Renewal conversation started.",
    "user": { "id": 5 },
    "client": { "id": 12 },
    "isPinned": false,
  });
  assertEquals(out, { data: { id: 7 } });
});

Deno.test("comment-create: the free-form fields object is merged and typed params win", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await commentCreate.execute(
    {
      "description": "Renewal conversation started.",
      "fields": { "extraKey": { "a": 1 }, "description": "SHOULD-LOSE" },
    } as never,
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.extraKey, { a: 1 });
  assertEquals(sent["description"], "Renewal conversation started.");
});

Deno.test("comment-create: fields may be a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await commentCreate.execute(
    { "description": "Renewal conversation started.", "fields": '{"extraKey":1}' } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).extraKey, 1);
});

Deno.test("comment-create: invalid fields JSON is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await commentCreate.execute({ "fields": "{nope" } as never, ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("comment-create: required params are declared", () => {
  const required = (commentCreate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["description"]);
});

Deno.test("comment-create: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(
    async () =>
      await commentCreate.execute({
        "description": "Renewal conversation started.",
        "userId": 5,
        "clientId": 12,
        "isPinned": false,
      }, ctx),
    Error,
    "401",
  );
});

Deno.test("comment-create: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () =>
      await commentCreate.execute({
        "description": "Renewal conversation started.",
        "userId": 5,
        "clientId": 12,
        "isPinned": false,
      }, ctx),
    Error,
    "ThrottleLimit",
  );
});
