/** The connection shape every Azure DevOps action test uses. */
export const display = { organization: "contoso" };

/** A `{count, value}` collection. */
export const list = (value: unknown[]) => ({ status: 200, body: { count: value.length, value } });

/** A single object. */
export const one = (body: unknown) => ({ status: 200, body });
