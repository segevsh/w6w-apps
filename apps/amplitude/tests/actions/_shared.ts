/** The connection every action test runs against. */
export const display = { region: "US" };

export const ok = (body: unknown) => ({ status: 200, body });

/** An ingest partial failure: HTTP 400, with the failed events named by index. */
export const partial = (body: Record<string, unknown>) => ({ status: 400, body });
