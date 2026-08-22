/** The connection every action test runs against. */
export const display = { url: "https://abc.ui.nabu.casa", locationName: "Home" };

export const ok = (body: unknown) => ({ status: 200, body });

/** Home Assistant's plain-text endpoints. */
export const text = (body: string) => ({
  status: 200,
  body,
  headers: { "content-type": "text/plain" },
});
