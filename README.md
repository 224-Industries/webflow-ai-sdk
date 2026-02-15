# Webflow - AI SDK Tools and Agents

![224 Industries OSS](https://img.shields.io/badge/224_Industries-OSS-111212?style=for-the-badge&labelColor=6AFFDC)
![MIT License](https://img.shields.io/badge/License-MIT-111212?style=for-the-badge&labelColor=6AFFDC)
[![Webflow Premium Partner](https://img.shields.io/badge/Premium_Partner-146EF5?style=for-the-badge&logo=webflow&logoColor=white)](https://webflow.com/@224-industries)
![Vercel AI SDK](https://img.shields.io/badge/Vercel-AI%20SDK-000000?style=for-the-badge&logo=vercel&logoColor=white)

Give your AI agents the power to list and publish sites, manage pages, retrieve form submissions, and even add custom code to your Webflow projects. Pre-built agents like the `LeadResponseAgent` can automatically process form submissions and send response emails using [Resend](https://resend.com) templates.

## Installation

```bash
npm install @224industries/webflow-ai-sdk
```

## Setup

Set the following environment variables:

```bash
WEBFLOW_API_KEY="your_webflow_api_key"
WEBFLOW_SITE_ID="your_default_site_id"

# Required for LeadResponseAgent (uses Resend via `resend-ai-sdk` tools)
RESEND_API_KEY="your_resend_api_key"
RESEND_EMAIL_DOMAIN="your_verified_domain"
```

Get your Webflow API key from the [Webflow Dashboard](https://webflow.com/dashboard) and your Resend API key from the [Resend Dashboard](https://resend.com/api-keys) (optional).

## Usage

```ts
// Import individual tools
import { generateText, stepCountIs } from "ai";
import { listSites, listPages, updatePage, publishSite } from "@224industries/webflow-ai-sdk/tools";

const { text } = await generateText({
  model: 'openai/gpt-5.2',
  tools: { listSites, listPages, updatePage, publishSite },
  prompt: "List all my sites and their pages",
  stopWhen: stepCountIs(5),
});
```

```ts
// Or use a pre-configured agent
import { LeadResponseAgent } from "@224industries/webflow-ai-sdk/agents";
import { anthropic } from "@ai-sdk/anthropic";

const agent = new LeadResponseAgent({
  model: anthropic("claude-sonnet-4-20250514"),
});

const { text } = await agent.generate({
  prompt: "Check my Webflow site for new form submissions and respond to any new leads using the New Lead template in Resend.",
});
```

## Available Tools

| Tool | Description |
|------|-------------|
| `listSites` | List all Webflow sites accessible with the current API token |
| `publishSite` | Publish a site to custom domains or the Webflow subdomain |
| `listPages` | List all pages for a site with pagination |
| `updatePage` | Update a page's title, slug, SEO, and Open Graph metadata |
| `listForms` | List all forms for a site with field definitions |
| `listFormSubmissions` | Retrieve submitted form data, optionally filtered by form |
| `listCustomCode` | List all custom code scripts applied to a site and its pages |
| `addCustomCode` | Register and apply an inline script to a site or page |

## Available Agents

| Agent | Description |
|-------|-------------|
| `LeadResponseAgent` | Processes Webflow form submissions, creates Resend contacts, and sends template-based response emails |

## AI SDK Library

Find other AI SDK agents and tools in the [AI SDK Library](https://aisdklibrary.com).

## Resources

- [Vercel AI SDK documentation](https://ai-sdk.dev/docs/introduction)
- [Webflow API documentation](https://developers.webflow.com)
- [Resend AI SDK tools](https://github.com/Flash-Brew-Digital/resend-ai-sdk)
- [Resend API documentation](https://resend.com/docs/api-reference/introduction)

## Contributing

Contributions are welcome! Please read our [Contributing Guide](.github/CONTRIBUTING.md) for more information.

## License

[MIT License](LICENSE)

## Creator

[Ben Sabic](https://bensabic.dev) (Fractional CTO) at [224 Industries](https://224industries.com.au)
