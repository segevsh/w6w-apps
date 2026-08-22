/** The connection shape every Vanta action test uses. */
export const display = { region: "commercial" };

/** One page of Vanta's `{results: {data, pageInfo}}` envelope. */
export const page = (data: unknown[], extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    results: { data, pageInfo: { hasNextPage: false, endCursor: null, ...extra } },
  },
});

/** A bare object response, for the `.info`-style endpoints. */
export const one = (body: unknown) => ({ status: 200, body });
