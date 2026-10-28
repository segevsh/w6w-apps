import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/blob-lease.ts";

const D = { display: { account: "myaccount" } };
const leased = { status: 201, body: "", headers: { "x-ms-lease-id": "lease-1" } };

/** A real pessimistic lock, which S3 and Cloud Storage do not have. */
Deno.test("blob-lease: acquiring sends the action and the duration", async () => {
  const { ctx, calls } = mockCtx([leased], D);
  const result = await action.execute(
    { container: "uploads", blob: "a.log", operation: "acquire", duration: 30 },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).searchParams.get("comp"), "lease");
  assertEquals(calls[0].headers["x-ms-lease-action"], "acquire");
  assertEquals(calls[0].headers["x-ms-lease-duration"], "30");
  assertEquals(result.leaseId, "lease-1");
  assertEquals(result.expiresInSeconds, 30);
});

/** 15 to 60, or infinite — and infinite is deliberately not offered. */
Deno.test("blob-lease: the duration is bounded, and says why infinite is absent", async () => {
  for (const duration of [1, 14, 61, 3600, -1]) {
    const { ctx, calls } = mockCtx([], D);
    let message = "";
    try {
      await action.execute(
        { container: "uploads", blob: "a.log", operation: "acquire", duration },
        ctx,
      );
    } catch (err) {
      message = String(err);
    }
    assert(/must be between 15 and 60 seconds/.test(message), `${duration}: ${message}`);
    assert(/locks the blob until somebody breaks it by hand/.test(message), message);
    assertEquals(calls.length, 0);
  }
});

Deno.test("blob-lease: both bounds are inclusive", async () => {
  for (const duration of [15, 60]) {
    const { ctx, calls } = mockCtx([leased], D);
    await action.execute(
      { container: "uploads", blob: "a.log", operation: "acquire", duration },
      ctx,
    );
    assertEquals(calls[0].headers["x-ms-lease-duration"], String(duration));
  }
});

/** The lease id is the capability. */
Deno.test("blob-lease: renew and release require the id", async () => {
  for (const operation of ["renew", "release"]) {
    const { ctx, calls } = mockCtx([], D);
    let message = "";
    try {
      await action.execute({ container: "uploads", blob: "a.log", operation }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(new RegExp(`required to ${operation} a lease`).test(message), message);
    assert(/it is the capability/.test(message), message);
    assertEquals(calls.length, 0);
  }
});

Deno.test("blob-lease: releasing with the id sends it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }], D);
  const result = await action.execute(
    { container: "uploads", blob: "a.log", operation: "release", leaseId: "lease-1" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].headers["x-ms-lease-action"], "release");
  assertEquals(calls[0].headers["x-ms-lease-id"], "lease-1");
  assertEquals(result.operation, "release");
});

/** Break is the escape hatch, not a way to jump the queue. */
Deno.test("blob-lease: breaking needs no id and warns that the lock persists", async () => {
  const { ctx, calls, logs } = mockCtx([{
    status: 202,
    body: "",
    headers: { "x-ms-lease-time": "42" },
  }], D);
  const result = await action.execute(
    { container: "uploads", blob: "a.log", operation: "break" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].headers["x-ms-lease-id"], undefined);
  assertEquals(result.leaseTime, 42);
  assertEquals(logs[0].level, "warn");
  assert(/stays locked until the original period elapses/.test(logs[0].message), logs[0].message);
});

/** Acquiring twice is a conflict, not a no-op. */
Deno.test("blob-lease: is not idempotent, and says what losing the id costs", () => {
  assertEquals(action.idempotent, false);
  assert(
    /Losing the lease id leaves the blob locked/.test(action.description!),
    action.description,
  );
  assert(/S3 and Cloud Storage do not have/.test(action.description!), action.description);
});
