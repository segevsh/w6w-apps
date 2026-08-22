/** A Connect connection — the default for the vault actions. */
export const display = { surface: "connect", url: "https://op.example.com", vaultCount: 2 };

/** An Events connection, for the audit actions. */
export const eventsDisplay = { surface: "events", region: "global", features: ["auditevents"] };

export const ok = (body: unknown) => ({ status: 200, body });

/** An item with one plain field and one secret one. */
export const ITEM = {
  id: "i1",
  title: "Production database",
  category: "DATABASE",
  fields: [
    { id: "f1", label: "username", type: "STRING", value: "app" },
    { id: "f2", label: "password", type: "CONCEALED", purpose: "PASSWORD", value: "hunter2" },
  ],
};
