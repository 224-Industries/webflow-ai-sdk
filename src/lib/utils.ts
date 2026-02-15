export const getDefaultSiteId = (): string => process.env.WEBFLOW_SITE_ID ?? "";

export const resolveSiteId = (siteId?: string): string => {
  const resolved = siteId || getDefaultSiteId();
  if (!resolved) {
    throw new Error(
      "A site ID is required. Either pass a siteId or set the WEBFLOW_SITE_ID environment variable."
    );
  }
  return resolved;
};

export const getStringField = (
  obj: Record<string, unknown>,
  snakeCase: string,
  camelCase: string
): string | undefined => {
  if (obj[snakeCase]) {
    return String(obj[snakeCase]);
  }
  if (obj[camelCase]) {
    return String(obj[camelCase]);
  }
  return undefined;
};

export const parseTitleDescription = (
  raw: Record<string, unknown> | undefined
): { title?: string; description?: string } | undefined => {
  if (!raw) {
    return undefined;
  }
  return {
    title: raw.title ? String(raw.title) : undefined,
    description: raw.description ? String(raw.description) : undefined,
  };
};

export const parseFormFields = (
  rawFields: Record<string, Record<string, unknown>> | undefined
): Record<string, { displayName?: string; type?: string }> | undefined => {
  if (!rawFields) {
    return undefined;
  }
  const fields: Record<string, { displayName?: string; type?: string }> = {};
  for (const [key, value] of Object.entries(rawFields)) {
    fields[key] = {
      displayName: value.displayName ? String(value.displayName) : undefined,
      type: value.type ? String(value.type) : undefined,
    };
  }
  return Object.keys(fields).length > 0 ? fields : undefined;
};

export const siteIdDescription = getDefaultSiteId()
  ? ` If not provided, defaults to the configured site: ${getDefaultSiteId()}.`
  : "";
