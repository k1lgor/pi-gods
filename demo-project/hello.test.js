import { describe, it, expect } from "vitest";
import hello from "./hello.js";

describe("hello", () => {
  it("greets by name", () => {
    expect(hello("Alice")).toBe("Hello, Alice!");
  });

  it("defaults to World when no name", () => {
    expect(hello()).toBe("Hello, World!");
  });

  it("handles empty string", () => {
    expect(hello("")).toBe("Hello, !");
  });

  // ── Nemesis regression: edge cases ──────────────────────────────────

  it("defaults to World for null", () => {
    expect(hello(null)).toBe("Hello, World!");
  });

  it("defaults to World for undefined", () => {
    expect(hello(undefined)).toBe("Hello, World!");
  });

  it("handles numeric input", () => {
    expect(hello(42)).toBe("Hello, 42!");
  });

  it("handles special characters", () => {
    expect(hello("Bob & Alice")).toBe("Hello, Bob & Alice!");
  });
});
