import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSkillsClient } from "../../src/skillsClient";

const apiSkill = {
  id: "uap-onboarding", name: "uap-onboarding", description: "Onboard agents",
  content: "---\nname: uap-onboarding\nversion: 1.0.0\n---\nbody",
  version: "1.0.0", tags: ["uap"], category: "Agent Onboarding",
  triggerPhrases: ["uap-onboarding"], license: "Enterprise", tenantId: "default",
  visibility: "public", frontmatter: {}, stars: 0, starCount: 0, downloadCount: 1,
  registeredAt: "2026-05-14T00:00:00Z", updatedAt: "2026-05-14T00:00:00Z",
};

beforeEach(() => { vi.restoreAllMocks(); });

describe("skillsClient.fetchSkills", () => {
  it("returns API skills when API responds 200", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ items: [apiSkill] }),
    });
    const client = createSkillsClient({ apiUrl: "http://api/api", githubRepo: "owner/repo", fetch: fetchMock as unknown as typeof fetch });
    const skills = await client.fetchSkills();
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("uap-onboarding");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("http://api/api/registry/skills", expect.anything());
  });

  it("falls back to GitHub when API throws", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ([{ name: "uap-onboarding", type: "dir", path: ".github/skills/uap-onboarding" }]) })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => "---\nname: uap-onboarding\nversion: 1.0.0\ndescription: x\ntags: [uap]\n---\nbody" });
    const client = createSkillsClient({ apiUrl: "http://api/api", githubRepo: "owner/repo", fetch: fetchMock as unknown as typeof fetch });
    const skills = await client.fetchSkills();
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("uap-onboarding");
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.github.com/repos/owner/repo/contents/.github/skills");
  });

  it("falls back to GitHub when API returns 500", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ([]) });
    const client = createSkillsClient({ apiUrl: "http://api/api", githubRepo: "owner/repo", fetch: fetchMock as unknown as typeof fetch });
    const skills = await client.fetchSkills();
    expect(skills).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("skillsClient.downloadSkillContent", () => {
  it("GETs the API download endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, status: 200, text: async () => "SKILL CONTENT" });
    const client = createSkillsClient({ apiUrl: "http://api/api", githubRepo: "owner/repo", fetch: fetchMock as unknown as typeof fetch });
    const content = await client.downloadSkillContent("uap-onboarding");
    expect(content).toBe("SKILL CONTENT");
    expect(fetchMock).toHaveBeenCalledWith("http://api/api/registry/skills/uap-onboarding/download", expect.anything());
  });
});
