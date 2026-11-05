export const record = { id: "record-7", total: 1234, missing: null };
export const connection = {
  edges: [{ node: record, cursor: "opaque-edge" }],
  totalCount: 12,
  pageInfo: { hasNextPage: true, endCursor: "opaque-next" },
};
export const unauthorized = {
  error: "unauthorized",
  description: "unauthorized",
  key: "error_unauthorized",
};
export const viewer = { id: "partner-4", name: "Venue" };
