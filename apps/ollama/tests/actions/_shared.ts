/** The connection every action test runs against. */
export const display = {
  baseUrl: "http://192.168.1.50:11434",
  scheme: "http",
  host: "192.168.1.50",
  port: 11434,
  endpoint: "192.168.1.50:11434",
};

export const BASE = "http://192.168.1.50:11434";

export const ok = (body: unknown) => ({ status: 200, body });
