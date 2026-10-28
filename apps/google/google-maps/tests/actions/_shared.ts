/** A generation-1 web-service body: HTTP 200 no matter what happened. */
export const legacy = (body: Record<string, unknown>) => ({ status: 200, body });

/** A generation-2 body: a real HTTP code and a `google.rpc.Status`. */
export const rpc = (body: unknown, status = 200) => ({ status, body });
