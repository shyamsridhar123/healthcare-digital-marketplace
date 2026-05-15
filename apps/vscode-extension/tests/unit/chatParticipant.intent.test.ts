import { describe, it, expect } from "vitest";
import { parseIntent } from "../../src/chatParticipant";

describe("parseIntent", () => {
  it("parses list", () => {
    expect(parseIntent("list")).toEqual({ kind: "list" });
    expect(parseIntent("  LIST  ")).toEqual({ kind: "list" });
  });
  it("parses install with name", () => {
    expect(parseIntent("install uap-onboarding")).toEqual({ kind: "install", name: "uap-onboarding" });
  });
  it("parses help with name", () => {
    expect(parseIntent("help uap-onboarding")).toEqual({ kind: "help", name: "uap-onboarding" });
  });
  it("parses search with multi-word query", () => {
    expect(parseIntent("search agent onboarding")).toEqual({ kind: "search", query: "agent onboarding" });
  });
  it("returns unknown for unrecognised input", () => {
    expect(parseIntent("hello")).toEqual({ kind: "unknown" });
    expect(parseIntent("install")).toEqual({ kind: "unknown" });
  });
});
