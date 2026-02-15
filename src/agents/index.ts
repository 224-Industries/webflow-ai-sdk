import type { LanguageModel, ToolLoopAgentSettings } from "ai";
import { ToolLoopAgent } from "ai";
import {
  createContact,
  getTemplate,
  listTemplates,
  sendEmail,
} from "resend-ai-sdk";
import { listFormSubmissions, listForms, listSites } from "../tools/index.js";

const defaultInstructions = `You are a lead response agent that automates responding to new form submissions from Webflow sites.

Your workflow:
1. Use listSites to find available Webflow sites, then listForms to discover forms on those sites.
2. Use listFormSubmissions to retrieve recent form submissions and extract contact information (name, email, etc.) from the formResponse data.
3. When a submission contains contact information, use createContact to add the person to Resend.
4. Use listTemplates to browse available email templates, then getTemplate to inspect a specific template's variables and defaults.
5. Use sendEmail with the appropriate template to send a response email to the lead. Fill in any template variables using data from the form submission.

The user prompt will specify which site to check, which form to pull submissions from, and which email template to use for the response.`;

const tools = {
  listSites,
  listForms,
  listFormSubmissions,
  sendEmail,
  createContact,
  listTemplates,
  getTemplate,
};

type AgentTools = typeof tools;

interface LeadResponseAgentOptions
  extends Omit<ToolLoopAgentSettings<never, AgentTools>, "tools" | "model"> {
  model: LanguageModel;
  instructions?: string;
}

export class LeadResponseAgent extends ToolLoopAgent<never, AgentTools> {
  constructor({ model, instructions, ...rest }: LeadResponseAgentOptions) {
    super({
      ...rest,
      model,
      tools,
      instructions: instructions ?? defaultInstructions,
    });
  }
}
