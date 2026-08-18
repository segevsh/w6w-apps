/** The connection shape every Qdrant action test uses. */
export const display = { url: "https://xyz.cloud.qdrant.io:6333" };

/** Qdrant's `{time, status, result}` envelope. */
export const ok = (result: unknown) => ({
  status: 200,
  body: { time: 0.01, status: "ok", result },
});
