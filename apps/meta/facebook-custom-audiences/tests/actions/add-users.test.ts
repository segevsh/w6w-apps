import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-users.ts";

const MARY = "f1904cf1a9d73a55fa5de0ac823c4403ded71afd4c3248d00bdcd0866552bb79";
const form = (body: string | null) => new URLSearchParams(body ?? "");
const reply = {
  body: { audience_id: "900", session_id: "5", num_received: 1, num_invalid_entries: 0 },
};

Deno.test("add-users: POSTs a hashed payload and a one-batch session", async () => {
  const { ctx, calls } = mockCtx([reply]);
  const out = await action.execute({
    audienceId: "900",
    users: [{ email: "Mary@Example.com " }],
  }, ctx);
  assertEquals(out.num_received, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v25.0/900/users");
  const f = form(calls[0].body);
  assertEquals(JSON.parse(f.get("payload")!), { schema: ["EMAIL"], data: [[MARY]] });
  const session = JSON.parse(f.get("session")!);
  assertEquals(session.batch_seq, 1);
  assertEquals(session.last_batch_flag, true);
  assertEquals(typeof session.session_id, "number");
  assertEquals(f.has("method"), false);
});

Deno.test("add-users: the raw email never appears anywhere on the wire", async () => {
  const { ctx, calls } = mockCtx([reply]);
  await action.execute({
    audienceId: "900",
    users: [{ email: "mary@example.com", phone: "+1 555 987 6543", firstName: "Mary" }],
  }, ctx);
  const wire = decodeURIComponent(calls[0].url + calls[0].body!.replaceAll("+", " "));
  for (const raw of ["mary@example.com", "987", "Mary", 'mary"']) assert(!wire.includes(raw), raw);
});

Deno.test("add-users: accepts the users list as JSON text", async () => {
  const { ctx, calls } = mockCtx([reply]);
  await action.execute({ audienceId: "900", users: '[{"email":"mary@example.com"}]' }, ctx);
  assertEquals(JSON.parse(form(calls[0].body).get("payload")!).data, [[MARY]]);
});

Deno.test("add-users: carries an explicit multi-batch session", async () => {
  const { ctx, calls } = mockCtx([reply]);
  await action.execute({
    audienceId: "900",
    users: [{ email: "mary@example.com" }],
    sessionId: 4242,
    batchSeq: 2,
    lastBatch: false,
    estimatedTotal: 20000,
  }, ctx);
  assertEquals(JSON.parse(form(calls[0].body).get("session")!), {
    session_id: 4242,
    batch_seq: 2,
    last_batch_flag: false,
    estimated_num_total: 20000,
  });
});

Deno.test("add-users: refuses more than 10,000 rows before any call", async () => {
  const { ctx, calls } = mockCtx();
  const users = Array.from({ length: 10_001 }, (_, i) => ({ externalId: String(i) }));
  await assertRejects(
    () => Promise.resolve(action.execute({ audienceId: "900", users }, ctx)),
    Error,
    "10000",
  );
  assertEquals(calls.length, 0);
});

Deno.test("add-users: an invalid row fails before any call and does not echo the value", async () => {
  const { ctx, calls } = mockCtx();
  const err = await assertRejects(
    () => Promise.resolve(action.execute({ audienceId: "900", users: [{ email: "zz-no" }] }, ctx)),
    Error,
    "users[0].EMAIL",
  );
  assert(!err.message.includes("zz-no"));
  assertEquals(calls.length, 0);
});

Deno.test("add-users: pre-hashed mode refuses raw values", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () =>
      Promise.resolve(action.execute({
        audienceId: "900",
        users: [{ email: "mary@example.com" }],
        hashing: "pre-hashed",
      }, ctx)),
    Error,
    "pre-hashed",
  );
  assertEquals(calls.length, 0);
});

Deno.test("add-users: surfaces the flagged-audience upload block", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      error: {
        message: "Invalid parameter",
        code: 100,
        error_subcode: 1713230,
        error_user_msg: "Before updating user memberships, you must resolve integrity restrictions",
      },
    },
  }]);
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute({ audienceId: "900", users: [{ email: "mary@example.com" }] }, ctx),
      ),
    Error,
    "resolve integrity restrictions",
  );
});
