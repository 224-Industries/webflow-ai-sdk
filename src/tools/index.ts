import { tool } from "ai";
import { z } from "zod";
import { callApi } from "../lib/api.js";
import {
  AddCustomCodeResultSchema,
  ListCustomCodeResultSchema,
  ListFormSubmissionsResultSchema,
  ListFormsResultSchema,
  ListPagesResultSchema,
  ListSitesResultSchema,
  PublishSiteResultSchema,
  UpdatePageResultSchema,
} from "../lib/schemas.js";
import {
  getStringField,
  parseFormFields,
  parseTitleDescription,
  resolveSiteId,
  siteIdDescription,
} from "../lib/utils.js";

export const listSites = tool({
  description:
    "List all Webflow sites that the user currently has access to. " +
    "Use this tool to discover available sites, find site IDs, check custom domains, or see when a site was last published.",
  inputSchema: z.object({}),
  inputExamples: [{ input: {} }],
  outputSchema: ListSitesResultSchema,
  strict: true,
  execute: async () => {
    try {
      const response = await callApi("/sites");

      const rawSites = (response.sites as Record<string, unknown>[]) ?? [];

      const sites = rawSites.map((raw) => {
        const domains = raw.customDomains as
          | Record<string, unknown>[]
          | undefined;

        return {
          id: String(raw.id ?? ""),
          displayName: String(raw.displayName ?? ""),
          shortName: String(raw.shortName ?? ""),
          lastPublished: getStringField(raw, "last_published", "lastPublished"),
          lastUpdated: getStringField(raw, "last_updated", "lastUpdated"),
          previewUrl: raw.previewUrl ? String(raw.previewUrl) : undefined,
          timeZone: raw.timeZone ? String(raw.timeZone) : undefined,
          designerUrl: `https://${raw.shortName}.design.webflow.com`,
          settingsUrl: `https://webflow.com/dashboard/sites/${raw.shortName}/general`,
          customDomains: domains?.map((d) => ({
            id: String(d.id ?? ""),
            url: String(d.url ?? ""),
          })),
        };
      });

      return { sites, count: sites.length };
    } catch (error) {
      console.error("Error listing sites:", error);
      return {
        sites: [],
        count: 0,
        error: error instanceof Error ? error.message : "Failed to list sites",
      };
    }
  },
});

export const publishSite = tool({
  description:
    "Publish a Webflow site to one or more domains. " +
    "Use this tool when the user wants to deploy or publish their site. " +
    "You must set publishToWebflowSubdomain to true, pass specific custom domain IDs from listSites, or both. " +
    "Do NOT pass customDomains unless you have retrieved actual domain IDs from listSites — not all sites have custom domains. " +
    "Rate limited to 1 publish per minute." +
    siteIdDescription,
  inputSchema: z.object({
    siteId: z
      .string()
      .optional()
      .describe(
        `The ID of the site to publish.${siteIdDescription || " Use listSites to find available site IDs. Do NOT guess or fabricate site IDs."}`
      ),
    customDomains: z
      .array(z.string())
      .optional()
      .describe(
        "Array of custom domain IDs to publish to. Only provide this if you have retrieved actual domain IDs from the listSites tool. Do NOT guess or fabricate domain IDs. Omit this field entirely if the site has no custom domains."
      ),
    publishToWebflowSubdomain: z
      .boolean()
      .optional()
      .describe(
        "Whether to publish to the default Webflow subdomain (yoursite.webflow.io). Set to true if no custom domains are being used."
      ),
  }),
  inputExamples: [
    {
      input: {
        siteId: "580e63e98c9a982ac9b8b741",
        publishToWebflowSubdomain: true,
      },
    },
    {
      input: {
        siteId: "580e63e98c9a982ac9b8b741",
        customDomains: ["660c6449dd97ebc7346ac629"],
      },
    },
  ],
  outputSchema: PublishSiteResultSchema,
  strict: true,
  needsApproval: true,
  execute: async ({ siteId, customDomains, publishToWebflowSubdomain }) => {
    try {
      const resolvedSiteId = resolveSiteId(siteId);

      const body: Record<string, unknown> = {
        publishToWebflowSubdomain: publishToWebflowSubdomain ?? false,
      };
      if (customDomains && customDomains.length > 0) {
        body.customDomains = customDomains;
      }

      const response = await callApi(`/sites/${resolvedSiteId}/publish`, {
        method: "POST",
        body,
      });

      const domains = response.customDomains as
        | Record<string, unknown>[]
        | undefined;

      return {
        success: true,
        publishedDomains: domains?.map((d) => ({
          id: String(d.id ?? ""),
          url: String(d.url ?? ""),
        })),
      };
    } catch (error) {
      console.error("Error publishing site:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to publish site",
      };
    }
  },
});

export const listPages = tool({
  description:
    "List all pages for a Webflow site. " +
    "Use this tool to browse site pages, find page IDs for custom code injection, or check page SEO metadata. " +
    "Supports pagination via limit and offset parameters." +
    siteIdDescription,
  inputSchema: z.object({
    siteId: z
      .string()
      .optional()
      .describe(
        `The ID of the site.${siteIdDescription || " Use listSites to find available site IDs. Do NOT guess or fabricate site IDs."}`
      ),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum number of pages to return. Default 100, max 100."),
    offset: z
      .number()
      .optional()
      .describe("Offset for pagination if results exceed the limit."),
  }),
  inputExamples: [
    { input: { siteId: "580e63e98c9a982ac9b8b741" } },
    { input: { siteId: "580e63e98c9a982ac9b8b741", limit: 10, offset: 0 } },
  ],
  outputSchema: ListPagesResultSchema,
  strict: true,
  execute: async ({ siteId, limit, offset }) => {
    try {
      const resolvedSiteId = resolveSiteId(siteId);

      const response = await callApi(`/sites/${resolvedSiteId}/pages`, {
        params: { limit, offset },
      });

      const rawPages = (response.pages as Record<string, unknown>[]) ?? [];

      const pages = rawPages.map((page) => ({
        id: String(page.id ?? ""),
        title: String(page.title ?? ""),
        slug: String(page.slug ?? ""),
        archived:
          typeof page.archived === "boolean" ? page.archived : undefined,
        draft: typeof page.draft === "boolean" ? page.draft : undefined,
        createdOn: getStringField(page, "created_on", "createdOn"),
        lastUpdated: getStringField(page, "last_updated", "lastUpdated"),
        publishedPath: page.publishedPath
          ? String(page.publishedPath)
          : undefined,
        seo: parseTitleDescription(
          page.seo as Record<string, unknown> | undefined
        ),
        openGraph: parseTitleDescription(
          page.openGraph as Record<string, unknown> | undefined
        ),
      }));

      const pagination = response.pagination as
        | Record<string, unknown>
        | undefined;

      return {
        pages,
        count: pages.length,
        pagination: pagination
          ? {
              limit: Number(pagination.limit ?? 0),
              offset: Number(pagination.offset ?? 0),
              total: Number(pagination.total ?? 0),
            }
          : undefined,
      };
    } catch (error) {
      console.error("Error listing pages:", error);
      return {
        pages: [],
        count: 0,
        error: error instanceof Error ? error.message : "Failed to list pages",
      };
    }
  },
});

export const updatePage = tool({
  description:
    "Update the settings of a Webflow page, including its title, slug, SEO metadata, and Open Graph metadata. " +
    "Use this tool when the user wants to change a page's title, URL slug, SEO title/description, or social sharing metadata. " +
    "Only the fields you provide will be updated; omitted fields remain unchanged. " +
    "You must retrieve the page ID from listPages first — do NOT guess or fabricate page IDs.",
  inputSchema: z.object({
    pageId: z
      .string()
      .describe(
        "The ID of the page to update. Use listPages to find available page IDs. Do NOT guess or fabricate page IDs."
      ),
    title: z.string().optional().describe("New title for the page."),
    slug: z.string().optional().describe("New URL slug for the page."),
    seo: z
      .object({
        title: z.string().optional().describe("SEO title for the page."),
        description: z
          .string()
          .optional()
          .describe("SEO meta description for the page."),
      })
      .optional()
      .describe("SEO metadata to update."),
    openGraph: z
      .object({
        title: z
          .string()
          .optional()
          .describe("Open Graph title for social sharing."),
        description: z
          .string()
          .optional()
          .describe("Open Graph description for social sharing."),
      })
      .optional()
      .describe("Open Graph metadata to update."),
  }),
  inputExamples: [
    {
      input: {
        pageId: "63c720f9347c2139b248e552",
        title: "About Us",
        slug: "about-us",
      },
    },
    {
      input: {
        pageId: "63c720f9347c2139b248e552",
        seo: { title: "About Our Company", description: "Learn more about us" },
        openGraph: { title: "About Us", description: "Our story" },
      },
    },
  ],
  outputSchema: UpdatePageResultSchema,
  strict: true,
  needsApproval: true,
  execute: async ({ pageId, title, slug, seo, openGraph }) => {
    try {
      const body: Record<string, unknown> = {};
      if (title !== undefined) {
        body.title = title;
      }
      if (slug !== undefined) {
        body.slug = slug;
      }
      if (seo !== undefined) {
        body.seo = seo;
      }
      if (openGraph !== undefined) {
        body.openGraph = openGraph;
      }

      const response = await callApi(`/pages/${pageId}`, {
        method: "PUT",
        body,
      });

      const page = response as Record<string, unknown>;

      return {
        success: true,
        page: {
          id: String(page.id ?? ""),
          title: String(page.title ?? ""),
          slug: String(page.slug ?? ""),
          archived:
            typeof page.archived === "boolean" ? page.archived : undefined,
          draft: typeof page.draft === "boolean" ? page.draft : undefined,
          createdOn: getStringField(page, "created_on", "createdOn"),
          lastUpdated: getStringField(page, "last_updated", "lastUpdated"),
          publishedPath: page.publishedPath
            ? String(page.publishedPath)
            : undefined,
          seo: parseTitleDescription(
            page.seo as Record<string, unknown> | undefined
          ),
          openGraph: parseTitleDescription(
            page.openGraph as Record<string, unknown> | undefined
          ),
        },
      };
    } catch (error) {
      console.error("Error updating page:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update page",
      };
    }
  },
});

export const listForms = tool({
  description:
    "List all forms for a Webflow site. " +
    "Use this tool to browse available forms, find form IDs and element IDs, or inspect form field definitions. " +
    "The formElementId can be used to filter submissions across component instances. " +
    "Supports pagination via limit and offset parameters." +
    siteIdDescription,
  inputSchema: z.object({
    siteId: z
      .string()
      .optional()
      .describe(
        `The ID of the site.${siteIdDescription || " Use listSites to find available site IDs. Do NOT guess or fabricate site IDs."}`
      ),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum number of forms to return. Default 100, max 100."),
    offset: z
      .number()
      .optional()
      .describe("Offset for pagination if results exceed the limit."),
  }),
  inputExamples: [
    { input: { siteId: "580e63e98c9a982ac9b8b741" } },
    { input: { siteId: "580e63e98c9a982ac9b8b741", limit: 10 } },
  ],
  outputSchema: ListFormsResultSchema,
  strict: true,
  execute: async ({ siteId, limit, offset }) => {
    try {
      const resolvedSiteId = resolveSiteId(siteId);

      const response = await callApi(`/sites/${resolvedSiteId}/forms`, {
        params: { limit, offset },
      });

      const rawForms = (response.forms as Record<string, unknown>[]) ?? [];

      const forms = rawForms.map((form) => ({
        id: String(form.id ?? ""),
        displayName: String(form.displayName ?? ""),
        pageId: form.pageId ? String(form.pageId) : undefined,
        pageName: form.pageName ? String(form.pageName) : undefined,
        formElementId: getStringField(form, "form_element_id", "formElementId"),
        fields: parseFormFields(
          form.fields as Record<string, Record<string, unknown>> | undefined
        ),
        createdOn: getStringField(form, "created_on", "createdOn"),
        lastUpdated: getStringField(form, "last_updated", "lastUpdated"),
      }));

      const pagination = response.pagination as
        | Record<string, unknown>
        | undefined;

      return {
        forms,
        count: forms.length,
        pagination: pagination
          ? {
              limit: Number(pagination.limit ?? 0),
              offset: Number(pagination.offset ?? 0),
              total: Number(pagination.total ?? 0),
            }
          : undefined,
      };
    } catch (error) {
      console.error("Error listing forms:", error);
      return {
        forms: [],
        count: 0,
        error: error instanceof Error ? error.message : "Failed to list forms",
      };
    }
  },
});

export const listFormSubmissions = tool({
  description:
    "List form submissions for a Webflow site. " +
    "Use this tool to retrieve submitted form data such as leads, contact requests, or signups. " +
    "Optionally filter by elementId to get submissions for a specific form across all component instances. " +
    "Get the elementId from the listForms tool (returned as formElementId). " +
    "Supports pagination via limit and offset parameters." +
    siteIdDescription,
  inputSchema: z.object({
    siteId: z
      .string()
      .optional()
      .describe(
        `The ID of the site.${siteIdDescription || " Use listSites to find available site IDs. Do NOT guess or fabricate site IDs."}`
      ),
    elementId: z
      .string()
      .optional()
      .describe(
        "Filter submissions to a specific form by its element ID. Get this from the listForms tool (formElementId field). Do NOT guess or fabricate element IDs."
      ),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe(
        "Maximum number of submissions to return. Default 100, max 100."
      ),
    offset: z
      .number()
      .optional()
      .describe("Offset for pagination if results exceed the limit."),
  }),
  inputExamples: [
    { input: { siteId: "580e63e98c9a982ac9b8b741" } },
    {
      input: {
        siteId: "580e63e98c9a982ac9b8b741",
        elementId: "18259716-3e5a-646a-5f41-5dc4b9405aa0",
        limit: 25,
      },
    },
  ],
  outputSchema: ListFormSubmissionsResultSchema,
  strict: true,
  execute: async ({ siteId, elementId, limit, offset }) => {
    try {
      const resolvedSiteId = resolveSiteId(siteId);

      const response = await callApi(
        `/sites/${resolvedSiteId}/form_submissions`,
        { params: { elementId, limit, offset } }
      );

      const rawSubmissions =
        (response.formSubmissions as Record<string, unknown>[]) ?? [];

      const formSubmissions = rawSubmissions.map((submission) => ({
        id: String(submission.id ?? ""),
        displayName: submission.displayName
          ? String(submission.displayName)
          : undefined,
        dateSubmitted: getStringField(
          submission,
          "date_submitted",
          "dateSubmitted"
        ),
        formResponse:
          (submission.formResponse as Record<string, unknown>) ?? {},
      }));

      const pagination = response.pagination as
        | Record<string, unknown>
        | undefined;

      return {
        formSubmissions,
        count: formSubmissions.length,
        pagination: pagination
          ? {
              limit: Number(pagination.limit ?? 0),
              offset: Number(pagination.offset ?? 0),
              total: Number(pagination.total ?? 0),
            }
          : undefined,
      };
    } catch (error) {
      console.error("Error listing form submissions:", error);
      return {
        formSubmissions: [],
        count: 0,
        error:
          error instanceof Error
            ? error.message
            : "Failed to list form submissions",
      };
    }
  },
});

export const listCustomCode = tool({
  description:
    "List all custom code scripts applied to a Webflow site and its pages. " +
    "Use this tool to audit what scripts are currently active, check script versions, or see where scripts are applied (site-level vs page-level). " +
    "Supports pagination via limit and offset parameters." +
    siteIdDescription,
  inputSchema: z.object({
    siteId: z
      .string()
      .optional()
      .describe(
        `The ID of the site.${siteIdDescription || " Use listSites to find available site IDs. Do NOT guess or fabricate site IDs."}`
      ),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe(
        "Maximum number of code blocks to return. Default 100, max 100."
      ),
    offset: z
      .number()
      .optional()
      .describe("Offset for pagination if results exceed the limit."),
  }),
  inputExamples: [
    { input: { siteId: "580e63e98c9a982ac9b8b741" } },
    { input: { siteId: "580e63e98c9a982ac9b8b741", limit: 10 } },
  ],
  outputSchema: ListCustomCodeResultSchema,
  strict: true,
  execute: async ({ siteId, limit, offset }) => {
    try {
      const resolvedSiteId = resolveSiteId(siteId);

      const response = await callApi(
        `/sites/${resolvedSiteId}/custom_code/blocks`,
        { params: { limit, offset } }
      );

      const rawBlocks = (response.blocks as Record<string, unknown>[]) ?? [];

      const blocks = rawBlocks.map((block) => {
        const rawScripts = (block.scripts as Record<string, unknown>[]) ?? [];

        return {
          siteId: String(block.siteId ?? ""),
          pageId: block.pageId ? String(block.pageId) : undefined,
          type: block.type ? String(block.type) : undefined,
          scripts: rawScripts.map((script) => ({
            id: String(script.id ?? ""),
            location: String(script.location ?? ""),
            version: String(script.version ?? ""),
          })),
          createdOn: getStringField(block, "created_on", "createdOn"),
          lastUpdated: getStringField(block, "last_updated", "lastUpdated"),
        };
      });

      const pagination = response.pagination as
        | Record<string, unknown>
        | undefined;

      return {
        blocks,
        count: blocks.length,
        pagination: pagination
          ? {
              limit: Number(pagination.limit ?? 0),
              offset: Number(pagination.offset ?? 0),
              total: Number(pagination.total ?? 0),
            }
          : undefined,
      };
    } catch (error) {
      console.error("Error listing custom code:", error);
      return {
        blocks: [],
        count: 0,
        error:
          error instanceof Error ? error.message : "Failed to list custom code",
      };
    }
  },
});

export const addCustomCode = tool({
  description:
    "Register and apply an inline script to a Webflow site or a specific page. " +
    "Use this tool when the user wants to add tracking scripts (e.g. Google Analytics, Meta Pixel), " +
    "custom JavaScript, chat widgets, or any inline script. " +
    "This tool handles both registering the script and applying it in a single step. " +
    "Inline scripts are limited to 2000 characters. " +
    "The site must be published after adding custom code for changes to take effect." +
    siteIdDescription,
  inputSchema: z.object({
    siteId: z
      .string()
      .optional()
      .describe(
        `The ID of the site to register the script on.${siteIdDescription || " Use listSites to find available site IDs. Do NOT guess or fabricate site IDs."}`
      ),
    target: z
      .enum(["site", "page"])
      .describe(
        'Where to apply the script. Use "site" for site-wide scripts or "page" for a specific page.'
      ),
    pageId: z
      .string()
      .optional()
      .describe(
        'The ID of the page to apply the script to. Required when target is "page". Use listPages to find page IDs. Do NOT guess or fabricate page IDs.'
      ),
    sourceCode: z
      .string()
      .describe("The JavaScript source code to add. Maximum 2000 characters."),
    displayName: z
      .string()
      .describe(
        "A user-facing name for the script. Must be between 1 and 50 alphanumeric characters (e.g. 'Google Analytics', 'Chat Widget')."
      ),
    version: z
      .string()
      .describe(
        'A Semantic Version string for the script (e.g. "1.0.0", "0.0.1").'
      ),
    location: z
      .enum(["header", "footer"])
      .describe(
        'Where to place the script on the page. Use "header" for scripts that need to load early (e.g. analytics) or "footer" for scripts that can load after content.'
      ),
  }),
  inputExamples: [
    {
      input: {
        siteId: "580e63e98c9a982ac9b8b741",
        target: "site",
        sourceCode: "console.log('Hello from Webflow!');",
        displayName: "Hello Script",
        version: "1.0.0",
        location: "footer",
      },
    },
    {
      input: {
        siteId: "580e63e98c9a982ac9b8b741",
        target: "page",
        pageId: "63c720f9347c2139b248e552",
        sourceCode:
          "!function(f,b,e,v,n,t,s){/* Meta Pixel */}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');",
        displayName: "Meta Pixel",
        version: "1.0.0",
        location: "header",
      },
    },
  ],
  outputSchema: AddCustomCodeResultSchema,
  strict: true,
  needsApproval: true,
  execute: async ({
    siteId,
    target,
    pageId,
    sourceCode,
    displayName,
    version,
    location,
  }) => {
    try {
      if (target === "page" && !pageId) {
        return {
          success: false,
          scriptId: "",
          error:
            'A pageId is required when target is "page". Use listPages to find page IDs.',
        };
      }

      if (sourceCode.length > 2000) {
        return {
          success: false,
          scriptId: "",
          error: `Script exceeds the 2000 character limit (${sourceCode.length} characters). Consider hosting the script externally.`,
        };
      }

      const resolvedSiteId = resolveSiteId(siteId);

      // Step 1: Register the inline script
      // POST /sites/{site_id}/registered_scripts/inline
      const registered = await callApi(
        `/sites/${resolvedSiteId}/registered_scripts/inline`,
        {
          method: "POST",
          body: { sourceCode, version, displayName },
        }
      );

      const scriptId = String(registered.id ?? "");

      if (!scriptId) {
        return {
          success: false,
          scriptId: "",
          error: "Failed to register script: no script ID returned",
        };
      }

      // Step 2: Apply the script to site or page
      // PUT /sites/{site_id}/custom_code  OR  PUT /pages/{page_id}/custom_code
      const scriptPayload = {
        scripts: [{ id: scriptId, location, version }],
      };

      if (target === "page" && pageId) {
        await callApi(`/pages/${pageId}/custom_code`, {
          method: "PUT",
          body: scriptPayload,
        });
      } else {
        await callApi(`/sites/${resolvedSiteId}/custom_code`, {
          method: "PUT",
          body: scriptPayload,
        });
      }

      return {
        success: true,
        scriptId,
        appliedTo:
          target === "page" ? `page:${pageId}` : `site:${resolvedSiteId}`,
      };
    } catch (error) {
      console.error("Error adding custom code:", error);
      return {
        success: false,
        scriptId: "",
        error:
          error instanceof Error ? error.message : "Failed to add custom code",
      };
    }
  },
});
