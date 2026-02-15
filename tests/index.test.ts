import type { LanguageModel } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadResponseAgent } from "../src/agents/index.js";
import {
  addCustomCode,
  listCustomCode,
  listFormSubmissions,
  listForms,
  listPages,
  listSites,
  publishSite,
  updatePage,
} from "../src/tools/index.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const execute = async <T>(
  tool: { execute: (args: never, options: unknown) => Promise<T> },
  args: Record<string, unknown> = {}
): Promise<T> =>
  tool.execute(args as never, {
    toolCallId: "test-call-id",
    messages: [],
  });

const mockApiResponse = (body: unknown, ok = true, status = 200) => {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
};

beforeEach(() => {
  vi.stubEnv("WEBFLOW_API_KEY", "test-api-key");
  vi.stubEnv("WEBFLOW_SITE_ID", "test-site-id");
  mockFetch.mockReset();
});

// ── Tool Configuration ──────────────────────────────────────────────────────

describe("tool configuration", () => {
  it("publishSite requires approval", () => {
    expect(publishSite).toHaveProperty("needsApproval", true);
  });

  it("addCustomCode requires approval", () => {
    expect(addCustomCode).toHaveProperty("needsApproval", true);
  });

  it("updatePage requires approval", () => {
    expect(updatePage).toHaveProperty("needsApproval", true);
  });

  it("read-only tools do not require approval", () => {
    for (const tool of [
      listSites,
      listPages,
      listForms,
      listFormSubmissions,
      listCustomCode,
    ]) {
      expect(tool).not.toHaveProperty("needsApproval", true);
    }
  });
});

// ── listSites ───────────────────────────────────────────────────────────────

describe("listSites", () => {
  it("returns sites on success", async () => {
    mockApiResponse({
      sites: [
        {
          id: "site-1",
          displayName: "My Site",
          shortName: "my-site",
          lastPublished: "2025-01-01T00:00:00Z",
          lastUpdated: "2025-01-02T00:00:00Z",
          previewUrl: "https://preview.webflow.com/site-1",
          timeZone: "America/New_York",
          customDomains: [{ id: "dom-1", url: "example.com" }],
        },
      ],
    });

    const result = await execute(listSites);

    expect(result.count).toBe(1);
    expect(result.sites[0]).toMatchObject({
      id: "site-1",
      displayName: "My Site",
      shortName: "my-site",
      lastPublished: "2025-01-01T00:00:00Z",
      lastUpdated: "2025-01-02T00:00:00Z",
      previewUrl: "https://preview.webflow.com/site-1",
      timeZone: "America/New_York",
      designerUrl: "https://my-site.design.webflow.com",
      settingsUrl: "https://webflow.com/dashboard/sites/my-site/general",
    });
    expect(result.sites[0].customDomains).toEqual([
      { id: "dom-1", url: "example.com" },
    ]);
    expect(result.error).toBeUndefined();
  });

  it("returns structured error on failure", async () => {
    mockApiResponse({ message: "Unauthorized" }, false, 401);

    const result = await execute(listSites);

    expect(result.sites).toEqual([]);
    expect(result.count).toBe(0);
    expect(result.error).toContain("401");
  });
});

// ── publishSite ─────────────────────────────────────────────────────────────

describe("publishSite", () => {
  it("publishes site with custom domains", async () => {
    mockApiResponse({
      customDomains: [{ id: "dom-1", url: "example.com" }],
    });

    const result = await execute(publishSite, {
      siteId: "site-1",
      customDomains: ["dom-1"],
      publishToWebflowSubdomain: true,
    });

    expect(result.success).toBe(true);
    expect(result.publishedDomains).toEqual([
      { id: "dom-1", url: "example.com" },
    ]);
    expect(result.error).toBeUndefined();
  });

  it("works when customDomains is omitted", async () => {
    mockApiResponse({});

    const result = await execute(publishSite, {
      siteId: "site-1",
      publishToWebflowSubdomain: true,
    });

    expect(result.success).toBe(true);
    expect(result.publishedDomains).toBeUndefined();
    expect(result.error).toBeUndefined();

    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body as string);
    expect(body).toEqual({ publishToWebflowSubdomain: true });
    expect(body).not.toHaveProperty("customDomains");
  });

  it("defaults publishToWebflowSubdomain to false when omitted", async () => {
    mockApiResponse({});

    await execute(publishSite, {
      siteId: "site-1",
      customDomains: ["dom-1"],
    });

    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body as string);
    expect(body.publishToWebflowSubdomain).toBe(false);
  });

  it("returns structured error on failure", async () => {
    mockApiResponse({ message: "Rate limited" }, false, 429);

    const result = await execute(publishSite, {
      siteId: "site-1",
      publishToWebflowSubdomain: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("429");
  });
});

// ── listPages ───────────────────────────────────────────────────────────────

describe("listPages", () => {
  it("returns pages on success", async () => {
    mockApiResponse({
      pages: [
        {
          id: "page-1",
          title: "Home",
          slug: "home",
          archived: false,
          draft: false,
          createdOn: "2025-01-01T00:00:00Z",
          lastUpdated: "2025-01-02T00:00:00Z",
          publishedPath: "/home",
          seo: { title: "Home Page", description: "Welcome" },
          openGraph: {
            title: "OG Home",
            description: "OG Welcome",
          },
        },
      ],
      pagination: { limit: 100, offset: 0, total: 1 },
    });

    const result = await execute(listPages, { siteId: "site-1" });

    expect(result.count).toBe(1);
    expect(result.pages[0]).toMatchObject({
      id: "page-1",
      title: "Home",
      slug: "home",
      publishedPath: "/home",
    });
    expect(result.pages[0].archived).toBe(false);
    expect(result.pages[0].draft).toBe(false);
    expect(result.pages[0].seo).toEqual({
      title: "Home Page",
      description: "Welcome",
    });
    expect(result.pages[0].openGraph).toEqual({
      title: "OG Home",
      description: "OG Welcome",
    });
    expect(result.pagination).toEqual({ limit: 100, offset: 0, total: 1 });
    expect(result.error).toBeUndefined();
  });

  it("returns structured error on failure", async () => {
    mockApiResponse({ message: "Not Found" }, false, 404);

    const result = await execute(listPages, { siteId: "bad-id" });

    expect(result.pages).toEqual([]);
    expect(result.count).toBe(0);
    expect(result.error).toContain("404");
  });
});

// ── updatePage ─────────────────────────────────────────────────────────────

describe("updatePage", () => {
  it("updates and returns mapped page data", async () => {
    mockApiResponse({
      id: "page-1",
      title: "Updated Title",
      slug: "updated-title",
      archived: false,
      draft: false,
      createdOn: "2025-01-01T00:00:00Z",
      lastUpdated: "2025-01-03T00:00:00Z",
      publishedPath: "/updated-title",
      seo: { title: "SEO Title", description: "SEO Desc" },
      openGraph: { title: "OG Title", description: "OG Desc" },
    });

    const result = await execute(updatePage, {
      pageId: "page-1",
      title: "Updated Title",
      slug: "updated-title",
      seo: { title: "SEO Title", description: "SEO Desc" },
      openGraph: { title: "OG Title", description: "OG Desc" },
    });

    expect(result.success).toBe(true);
    expect(result.page).toMatchObject({
      id: "page-1",
      title: "Updated Title",
      slug: "updated-title",
      archived: false,
      draft: false,
      publishedPath: "/updated-title",
    });
    expect(result.page?.seo).toEqual({
      title: "SEO Title",
      description: "SEO Desc",
    });
    expect(result.page?.openGraph).toEqual({
      title: "OG Title",
      description: "OG Desc",
    });
    expect(result.error).toBeUndefined();

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[0]).toContain("/pages/page-1");
    expect(fetchCall[1].method).toBe("PUT");
    const body = JSON.parse(fetchCall[1].body as string);
    expect(body).toEqual({
      title: "Updated Title",
      slug: "updated-title",
      seo: { title: "SEO Title", description: "SEO Desc" },
      openGraph: { title: "OG Title", description: "OG Desc" },
    });
  });

  it("returns structured error on failure", async () => {
    mockApiResponse({ message: "Not Found" }, false, 404);

    const result = await execute(updatePage, {
      pageId: "bad-id",
      title: "Nope",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("404");
    expect(result.page).toBeUndefined();
  });
});

// ── listForms ───────────────────────────────────────────────────────────────

describe("listForms", () => {
  it("returns forms on success", async () => {
    mockApiResponse({
      forms: [
        {
          id: "form-1",
          displayName: "Contact Form",
          pageId: "page-1",
          pageName: "Contact",
          formElementId: "elem-1",
          fields: {
            name: { displayName: "Name", type: "PlainText" },
            email: { displayName: "Email", type: "Email" },
          },
          createdOn: "2025-01-01T00:00:00Z",
          lastUpdated: "2025-01-02T00:00:00Z",
        },
      ],
      pagination: { limit: 100, offset: 0, total: 1 },
    });

    const result = await execute(listForms, { siteId: "site-1" });

    expect(result.count).toBe(1);
    expect(result.forms[0]).toMatchObject({
      id: "form-1",
      displayName: "Contact Form",
      pageId: "page-1",
      pageName: "Contact",
      formElementId: "elem-1",
    });
    expect(result.forms[0].fields).toEqual({
      name: { displayName: "Name", type: "PlainText" },
      email: { displayName: "Email", type: "Email" },
    });
    expect(result.pagination).toEqual({ limit: 100, offset: 0, total: 1 });
    expect(result.error).toBeUndefined();
  });

  it("returns structured error on failure", async () => {
    mockApiResponse({ message: "Forbidden" }, false, 403);

    const result = await execute(listForms, { siteId: "site-1" });

    expect(result.forms).toEqual([]);
    expect(result.count).toBe(0);
    expect(result.error).toContain("403");
  });
});

// ── listFormSubmissions ─────────────────────────────────────────────────────

describe("listFormSubmissions", () => {
  it("returns submissions on success", async () => {
    mockApiResponse({
      formSubmissions: [
        {
          id: "sub-1",
          displayName: "Contact Form",
          dateSubmitted: "2025-01-15T12:00:00Z",
          formResponse: { name: "Alice", email: "alice@example.com" },
        },
      ],
      pagination: { limit: 100, offset: 0, total: 1 },
    });

    const result = await execute(listFormSubmissions, { siteId: "site-1" });

    expect(result.count).toBe(1);
    expect(result.formSubmissions[0]).toMatchObject({
      id: "sub-1",
      displayName: "Contact Form",
      dateSubmitted: "2025-01-15T12:00:00Z",
    });
    expect(result.formSubmissions[0].formResponse).toEqual({
      name: "Alice",
      email: "alice@example.com",
    });
    expect(result.pagination).toEqual({ limit: 100, offset: 0, total: 1 });
    expect(result.error).toBeUndefined();
  });

  it("returns structured error on failure", async () => {
    mockApiResponse({ message: "Server Error" }, false, 500);

    const result = await execute(listFormSubmissions, { siteId: "site-1" });

    expect(result.formSubmissions).toEqual([]);
    expect(result.count).toBe(0);
    expect(result.error).toContain("500");
  });
});

// ── listCustomCode ──────────────────────────────────────────────────────────

describe("listCustomCode", () => {
  it("returns code blocks on success", async () => {
    mockApiResponse({
      blocks: [
        {
          siteId: "site-1",
          type: "site",
          scripts: [{ id: "script-1", location: "header", version: "1.0.0" }],
          createdOn: "2025-01-01T00:00:00Z",
          lastUpdated: "2025-01-02T00:00:00Z",
        },
        {
          siteId: "site-1",
          pageId: "page-1",
          type: "page",
          scripts: [{ id: "script-2", location: "footer", version: "0.1.0" }],
        },
      ],
      pagination: { limit: 100, offset: 0, total: 2 },
    });

    const result = await execute(listCustomCode, { siteId: "site-1" });

    expect(result.count).toBe(2);
    expect(result.blocks[0]).toMatchObject({
      siteId: "site-1",
      type: "site",
    });
    expect(result.blocks[0].scripts).toEqual([
      { id: "script-1", location: "header", version: "1.0.0" },
    ]);
    expect(result.blocks[1]).toMatchObject({
      siteId: "site-1",
      pageId: "page-1",
      type: "page",
    });
    expect(result.pagination).toEqual({ limit: 100, offset: 0, total: 2 });
    expect(result.error).toBeUndefined();
  });

  it("returns structured error on failure", async () => {
    mockApiResponse({ message: "Unauthorized" }, false, 401);

    const result = await execute(listCustomCode, { siteId: "site-1" });

    expect(result.blocks).toEqual([]);
    expect(result.count).toBe(0);
    expect(result.error).toContain("401");
  });
});

// ── addCustomCode ───────────────────────────────────────────────────────────

describe("addCustomCode", () => {
  it("registers and applies a site-level script", async () => {
    // Step 1: register script
    mockApiResponse({ id: "script-123" });
    // Step 2: apply to site
    mockApiResponse({});

    const result = await execute(addCustomCode, {
      siteId: "site-1",
      target: "site",
      sourceCode: "console.log('hello');",
      displayName: "Hello Script",
      version: "1.0.0",
      location: "footer",
    });

    expect(result.success).toBe(true);
    expect(result.scriptId).toBe("script-123");
    expect(result.appliedTo).toBe("site:site-1");
    expect(result.error).toBeUndefined();

    // Verify register call
    const registerCall = mockFetch.mock.calls[0];
    expect(registerCall[0]).toContain("/registered_scripts/inline");
    const registerBody = JSON.parse(registerCall[1].body as string);
    expect(registerBody).toEqual({
      sourceCode: "console.log('hello');",
      version: "1.0.0",
      displayName: "Hello Script",
    });

    // Verify apply call
    const applyCall = mockFetch.mock.calls[1];
    expect(applyCall[0]).toContain("/sites/site-1/custom_code");
    const applyBody = JSON.parse(applyCall[1].body as string);
    expect(applyBody.scripts[0]).toEqual({
      id: "script-123",
      location: "footer",
      version: "1.0.0",
    });
  });

  it("registers and applies a page-level script", async () => {
    mockApiResponse({ id: "script-456" });
    mockApiResponse({});

    const result = await execute(addCustomCode, {
      siteId: "site-1",
      target: "page",
      pageId: "page-1",
      sourceCode: "console.log('page');",
      displayName: "Page Script",
      version: "0.1.0",
      location: "header",
    });

    expect(result.success).toBe(true);
    expect(result.scriptId).toBe("script-456");
    expect(result.appliedTo).toBe("page:page-1");

    const applyCall = mockFetch.mock.calls[1];
    expect(applyCall[0]).toContain("/pages/page-1/custom_code");
  });

  it("returns error when target is page but pageId is missing", async () => {
    const result = await execute(addCustomCode, {
      siteId: "site-1",
      target: "page",
      sourceCode: "console.log('oops');",
      displayName: "Oops",
      version: "1.0.0",
      location: "footer",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("pageId is required");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns error when source code exceeds 2000 characters", async () => {
    const result = await execute(addCustomCode, {
      siteId: "site-1",
      target: "site",
      sourceCode: "x".repeat(2001),
      displayName: "Too Long",
      version: "1.0.0",
      location: "footer",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("2000 character limit");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns structured error on API failure", async () => {
    mockApiResponse({ message: "Bad Request" }, false, 400);

    const result = await execute(addCustomCode, {
      siteId: "site-1",
      target: "site",
      sourceCode: "console.log('fail');",
      displayName: "Fail Script",
      version: "1.0.0",
      location: "footer",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("400");
  });
});

// ── LeadResponseAgent ──────────────────────────────────────────────────────

const mockModel = {
  modelId: "mock",
  provider: "mock",
  specificationVersion: "v1",
} as LanguageModel;

describe("LeadResponseAgent", () => {
  it("includes all expected tools", () => {
    const agent = new LeadResponseAgent({ model: mockModel });
    const toolNames = Object.keys(agent.tools);

    expect(toolNames).toContain("listSites");
    expect(toolNames).toContain("listForms");
    expect(toolNames).toContain("listFormSubmissions");
    expect(toolNames).toContain("sendEmail");
    expect(toolNames).toContain("createContact");
    expect(toolNames).toContain("listTemplates");
    expect(toolNames).toContain("getTemplate");
    expect(toolNames).toHaveLength(7);
  });

  it("has default instructions", () => {
    const agent = new LeadResponseAgent({ model: mockModel });
    const instructions = (agent as any).settings.instructions;

    expect(typeof instructions).toBe("string");
    expect(instructions.length).toBeGreaterThan(0);
  });

  it("allows custom instructions override", () => {
    const agent = new LeadResponseAgent({
      model: mockModel,
      instructions: "Custom instructions",
    });
    const instructions = (agent as any).settings.instructions;

    expect(instructions).toBe("Custom instructions");
  });

  it("has agent-v1 version", () => {
    const agent = new LeadResponseAgent({ model: mockModel });

    expect(agent.version).toBe("agent-v1");
  });
});
