import { describe, it, expect } from "vitest";
import { parseFrontmatter } from "../../src/types";

describe("parseFrontmatter", () => {
  it("parses scalar and array fields", () => {
    const md = `---
name: uap-onboarding
version: 1.0.0
tags: [uap, onboarding]
description: "Use when X happens"
---
body content`;
    const { frontmatter, body } = parseFrontmatter(md);
    expect(frontmatter.name).toBe("uap-onboarding");
    expect(frontmatter.version).toBe("1.0.0");
    expect(frontmatter.tags).toEqual(["uap", "onboarding"]);
    expect(frontmatter.description).toBe("Use when X happens");
    expect(body.trim()).toBe("body content");
  });

  it("returns empty frontmatter when no leading block", () => {
    const { frontmatter, body } = parseFrontmatter("just body");
    expect(frontmatter).toEqual({});
    expect(body).toBe("just body");
  });

  it("strips surrounding quotes on string values", () => {
    const { frontmatter } = parseFrontmatter(`---\nname: "quoted"\n---\nx`);
    expect(frontmatter.name).toBe("quoted");
  });

  it("preserves commas inside quoted array items", () => {
    const { frontmatter } = parseFrontmatter(`---\ntriggers: ["when X, then Y", "plain"]\n---\nx`);
    expect(frontmatter.triggers).toEqual(["when X, then Y", "plain"]);
  });
});
