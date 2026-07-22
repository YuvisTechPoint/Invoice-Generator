export type ServiceLineSeed = {
  id: string;
  productId: string;
  name: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
};

export type ServiceTemplate = {
  id: string;
  label: string;
  name: string;
  /** Scope note shown under the line */
  scope: string;
  quantity: number;
  unitPrice: number;
};

/** Common website & software development line items for quick drafting. */
export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    id: "web-design",
    label: "Website design",
    name: "Website UI/UX design",
    scope: "Wireframes, visual design, responsive layouts",
    quantity: 1,
    unitPrice: 25000,
  },
  {
    id: "web-dev",
    label: "Website development",
    name: "Website development",
    scope: "Frontend build, CMS/pages, basic SEO setup",
    quantity: 1,
    unitPrice: 45000,
  },
  {
    id: "landing",
    label: "Landing page",
    name: "High-converting landing page",
    scope: "Single page, form, analytics",
    quantity: 1,
    unitPrice: 18000,
  },
  {
    id: "fullstack",
    label: "Web app (full-stack)",
    name: "Custom web application development",
    scope: "Auth, dashboard, APIs, deployment",
    quantity: 1,
    unitPrice: 120000,
  },
  {
    id: "api",
    label: "API / backend",
    name: "Backend API development",
    scope: "REST/GraphQL, database, docs",
    quantity: 1,
    unitPrice: 55000,
  },
  {
    id: "mobile",
    label: "Mobile app MVP",
    name: "Mobile application (MVP)",
    scope: "Cross-platform MVP, store-ready build",
    quantity: 1,
    unitPrice: 150000,
  },
  {
    id: "ecommerce",
    label: "E-commerce store",
    name: "E-commerce website development",
    scope: "Catalog, cart, payments, admin",
    quantity: 1,
    unitPrice: 85000,
  },
  {
    id: "maintenance",
    label: "Monthly maintenance",
    name: "Website & software maintenance retainer",
    scope: "Updates, backups, minor fixes (1 month)",
    quantity: 1,
    unitPrice: 8000,
  },
  {
    id: "hosting",
    label: "Hosting setup",
    name: "Hosting, domain & SSL setup",
    scope: "Production deploy, DNS, SSL",
    quantity: 1,
    unitPrice: 5000,
  },
  {
    id: "support",
    label: "Bug fixes / support",
    name: "Development support & bug fixes",
    scope: "Hourly / package support",
    quantity: 10,
    unitPrice: 1500,
  },
];

export type ProjectPreset = {
  id: string;
  label: string;
  description: string;
  templateIds: string[];
  /** Optional discount applied when loading preset */
  discount?: number;
  discountCode?: string;
};

export const PROJECT_PRESETS: ProjectPreset[] = [
  {
    id: "startup-site",
    label: "Startup website",
    description: "Design + development + hosting for a business site",
    templateIds: ["web-design", "web-dev", "hosting"],
  },
  {
    id: "landing-pack",
    label: "Landing page pack",
    description: "Single landing page with setup",
    templateIds: ["landing", "hosting"],
  },
  {
    id: "saas-mvp",
    label: "SaaS / product MVP",
    description: "Full-stack web app + API foundation",
    templateIds: ["fullstack", "api"],
    discount: 10000,
    discountCode: "MVP-LAUNCH",
  },
  {
    id: "retainer",
    label: "Care plan",
    description: "Monthly maintenance retainer",
    templateIds: ["maintenance"],
  },
];

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function lineFromTemplate(template: ServiceTemplate): ServiceLineSeed {
  return {
    id: uid("line"),
    productId: `svc-${template.id}`,
    name: template.name,
    variantLabel: template.scope,
    quantity: template.quantity,
    unitPrice: template.unitPrice,
  };
}

export function linesFromPreset(preset: ProjectPreset): ServiceLineSeed[] {
  return preset.templateIds
    .map((id) => SERVICE_TEMPLATES.find((t) => t.id === id))
    .filter((t): t is ServiceTemplate => Boolean(t))
    .map(lineFromTemplate);
}
