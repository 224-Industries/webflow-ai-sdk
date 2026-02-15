import { z } from "zod";

export const SiteInfoSchema = z.object({
  id: z.string().describe("Unique identifier for the Site"),
  displayName: z.string().describe("Name given to the Site"),
  shortName: z.string().describe("Slugified version of the name"),
  lastPublished: z
    .string()
    .optional()
    .describe("ISO timestamp when the site was last published"),
  lastUpdated: z
    .string()
    .optional()
    .describe("ISO timestamp when the site was last updated"),
  previewUrl: z.string().optional().describe("URL of the site preview image"),
  timeZone: z.string().optional().describe("Site timezone"),
  designerUrl: z
    .string()
    .describe("Direct link to the Webflow Designer for this site"),
  settingsUrl: z
    .string()
    .describe("Direct link to the site settings in the Webflow Dashboard"),
  customDomains: z
    .array(
      z.object({
        id: z.string().describe("Domain ID"),
        url: z.string().describe("Registered domain name"),
      })
    )
    .optional()
    .describe("Custom domains attached to the site"),
});

export const ListSitesResultSchema = z.object({
  sites: z.array(SiteInfoSchema).describe("Array of site metadata"),
  count: z.number().describe("Number of sites returned"),
  error: z.string().optional().describe("Error message if failed"),
});

export const PublishSiteResultSchema = z.object({
  success: z.boolean().describe("Whether the publish was queued successfully"),
  publishedDomains: z
    .array(
      z.object({
        id: z.string().describe("Domain ID"),
        url: z.string().describe("Domain URL"),
      })
    )
    .optional()
    .describe("Domains that were published to"),
  error: z.string().optional().describe("Error message if failed"),
});

export const PageInfoSchema = z.object({
  id: z.string().describe("Unique identifier for the Page"),
  title: z.string().describe("Title of the Page"),
  slug: z.string().describe("URL slug of the Page"),
  archived: z.boolean().optional().describe("Whether the Page is archived"),
  draft: z.boolean().optional().describe("Whether the Page is a draft"),
  createdOn: z
    .string()
    .optional()
    .describe("ISO timestamp when the page was created"),
  lastUpdated: z
    .string()
    .optional()
    .describe("ISO timestamp when the page was last updated"),
  publishedPath: z
    .string()
    .optional()
    .describe("Relative path of the published page URL"),
  seo: z
    .object({
      title: z.string().optional().describe("SEO title"),
      description: z.string().optional().describe("SEO description"),
    })
    .optional()
    .describe("SEO metadata for the page"),
  openGraph: z
    .object({
      title: z.string().optional().describe("Open Graph title"),
      description: z.string().optional().describe("Open Graph description"),
    })
    .optional()
    .describe("Open Graph metadata for social sharing"),
});

export const ListPagesResultSchema = z.object({
  pages: z.array(PageInfoSchema).describe("Array of page metadata"),
  count: z.number().describe("Number of pages returned"),
  pagination: z
    .object({
      limit: z.number().describe("Limit used for pagination"),
      offset: z.number().describe("Offset used for pagination"),
      total: z.number().describe("Total number of records"),
    })
    .optional()
    .describe("Pagination info"),
  error: z.string().optional().describe("Error message if failed"),
});

export const UpdatePageResultSchema = z.object({
  success: z.boolean().describe("Whether the page was updated successfully"),
  page: PageInfoSchema.optional().describe("Updated page data"),
  error: z.string().optional().describe("Error message if failed"),
});

export const FormInfoSchema = z.object({
  id: z.string().describe("Unique ID for the Form"),
  displayName: z.string().describe("Form name displayed on the site"),
  pageId: z.string().optional().describe("ID of the Page the form is on"),
  pageName: z.string().optional().describe("Name of the Page the form is on"),
  formElementId: z
    .string()
    .optional()
    .describe(
      "Unique element ID for the form, used to filter submissions across component instances"
    ),
  fields: z
    .record(
      z.string(),
      z.object({
        displayName: z.string().optional().describe("Field display name"),
        type: z.string().optional().describe("Field type"),
      })
    )
    .optional()
    .describe("Form field definitions"),
  createdOn: z
    .string()
    .optional()
    .describe("ISO timestamp when the form was created"),
  lastUpdated: z
    .string()
    .optional()
    .describe("ISO timestamp when the form was last updated"),
});

export const ListFormsResultSchema = z.object({
  forms: z.array(FormInfoSchema).describe("Array of form metadata"),
  count: z.number().describe("Number of forms returned"),
  pagination: z
    .object({
      limit: z.number().describe("Limit used for pagination"),
      offset: z.number().describe("Offset used for pagination"),
      total: z.number().describe("Total number of records"),
    })
    .optional()
    .describe("Pagination info"),
  error: z.string().optional().describe("Error message if failed"),
});

export const FormSubmissionSchema = z.object({
  id: z.string().describe("Unique ID of the form submission"),
  displayName: z.string().optional().describe("Form name"),
  dateSubmitted: z
    .string()
    .optional()
    .describe("ISO timestamp when the form was submitted"),
  formResponse: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Key/value pairs of submitted form data"),
});

export const ListFormSubmissionsResultSchema = z.object({
  formSubmissions: z
    .array(FormSubmissionSchema)
    .describe("Array of form submissions"),
  count: z.number().describe("Number of submissions returned"),
  pagination: z
    .object({
      limit: z.number().describe("Limit used for pagination"),
      offset: z.number().describe("Offset used for pagination"),
      total: z.number().describe("Total number of records"),
    })
    .optional()
    .describe("Pagination info"),
  error: z.string().optional().describe("Error message if failed"),
});

export const CustomCodeBlockSchema = z.object({
  siteId: z.string().describe("Site ID where the code is applied"),
  pageId: z.string().optional().describe("Page ID if applied at page level"),
  type: z.string().optional().describe("Whether applied at site or page level"),
  scripts: z
    .array(
      z.object({
        id: z.string().describe("Script ID"),
        location: z.string().describe("header or footer"),
        version: z.string().describe("SemVer version string"),
      })
    )
    .describe("Scripts applied in this block"),
  createdOn: z.string().optional().describe("ISO timestamp when created"),
  lastUpdated: z
    .string()
    .optional()
    .describe("ISO timestamp when last updated"),
});

export const ListCustomCodeResultSchema = z.object({
  blocks: z
    .array(CustomCodeBlockSchema)
    .describe("Array of custom code blocks applied to the site and its pages"),
  count: z.number().describe("Number of blocks returned"),
  pagination: z
    .object({
      limit: z.number().describe("Limit used for pagination"),
      offset: z.number().describe("Offset used for pagination"),
      total: z.number().describe("Total number of records"),
    })
    .optional()
    .describe("Pagination info"),
  error: z.string().optional().describe("Error message if failed"),
});

export const AddCustomCodeResultSchema = z.object({
  success: z
    .boolean()
    .describe("Whether the script was registered and applied"),
  scriptId: z.string().describe("ID of the registered script"),
  appliedTo: z
    .string()
    .optional()
    .describe("Whether the script was applied to a site or page"),
  error: z.string().optional().describe("Error message if failed"),
});
