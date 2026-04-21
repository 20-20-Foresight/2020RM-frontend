/**
 * Shared mock data for design pages. Import what you need.
 * To use real data instead, add a Remix loader to your design route.
 */

export const mockOrganizations = [
  { id: "1", name: "Acme Corp", industry: "Technology", stage: "Client", headcount: 320, location: "Austin, TX" },
  { id: "2", name: "Pinnacle Group", industry: "Finance", stage: "Prospect", headcount: 85, location: "New York, NY" },
  { id: "3", name: "Meridian Health", industry: "Healthcare", stage: "Client", headcount: 1200, location: "Chicago, IL" },
  { id: "4", name: "Solaris Energy", industry: "Energy", stage: "Lead", headcount: 540, location: "Houston, TX" },
  { id: "5", name: "Bright Horizons", industry: "Education", stage: "Prospect", headcount: 210, location: "Boston, MA" }
];

export const mockPeople = [
  { id: "1", firstName: "Jordan", lastName: "Ellis", title: "VP of Engineering", organizationId: "1", organizationName: "Acme Corp", email: "jellis@acme.com", status: "Active" },
  { id: "2", firstName: "Morgan", lastName: "Chen", title: "CFO", organizationId: "2", organizationName: "Pinnacle Group", email: "mchen@pinnacle.com", status: "Active" },
  { id: "3", firstName: "Taylor", lastName: "Brooks", title: "Director of Operations", organizationId: "3", organizationName: "Meridian Health", email: "tbrooks@meridian.com", status: "Inactive" },
  { id: "4", firstName: "Casey", lastName: "Rivera", title: "COO", organizationId: "1", organizationName: "Acme Corp", email: "crivera@acme.com", status: "Active" },
  { id: "5", firstName: "Alex", lastName: "Kim", title: "Head of Talent", organizationId: "4", organizationName: "Solaris Energy", email: "akim@solaris.com", status: "Active" }
];

export const mockJobs = [
  { id: "1", title: "Head of Engineering", organizationId: "1", organizationName: "Acme Corp", status: "Active", stage: "Sourcing", openDate: "2026-03-01" },
  { id: "2", title: "Chief Financial Officer", organizationId: "2", organizationName: "Pinnacle Group", status: "Active", stage: "Interviewing", openDate: "2026-02-15" },
  { id: "3", title: "VP of Marketing", organizationId: "3", organizationName: "Meridian Health", status: "Closed", stage: "Placed", openDate: "2025-11-10" },
  { id: "4", title: "Director of Sales", organizationId: "4", organizationName: "Solaris Energy", status: "Active", stage: "Offer", openDate: "2026-01-22" },
  { id: "5", title: "Operations Manager", organizationId: "5", organizationName: "Bright Horizons", status: "Active", stage: "Sourcing", openDate: "2026-04-01" }
];

export const mockUser = {
  id: "u1",
  name: "Sam Designer",
  email: "sam@2020ets.com",
  role: "Recruiter"
};

export const mockLearnTopics = [
  {
    id: "focus",
    title: "Focus",
    summary: "Understand the focus areas used to categorize organizations by their primary business activity.",
    slug: "focus",
    categoryDocumentId: "crm.data:focus",
    category: "Segmentation",
    permission: "all"
  },
  {
    id: "industry",
    title: "Industry",
    summary: "Explore the industry segments used to classify organizations for segmentation and CRM tagging.",
    slug: "industry",
    categoryDocumentId: "crm.data:industry",
    category: "Segmentation",
    permission: "all"
  },
  {
    id: "job-functions",
    title: "Job Functions",
    summary: "Learn how job functions are mapped to candidates and contacts for talent targeting.",
    slug: "job-functions",
    categoryDocumentId: "crm.data:job-functions",
    category: "Talent",
    permission: "recruiter"
  },
  {
    id: "market-tiers",
    title: "Market Tiers",
    summary: "Understand how organizations are tiered by market presence and strategic value.",
    slug: "market-tiers",
    categoryDocumentId: "crm.data:market-tiers",
    category: "Market",
    permission: "admin"
  }
];

export const mockLearnCategories = [
  {
    id: "cat-3pp",
    label: "3rd Party Property Management",
    description: "<p>Organizations that manage real estate or properties on behalf of third-party owners. Often provide software, services, or staffing to residential or commercial property firms.</p>",
    examples: ["AppFolio", "Yardi Voyager clients", "RealPage customers"],
    dimensionId: "dimension-focus"
  },
  {
    id: "cat-healthcare-tech",
    label: "Healthcare Technology",
    description: "<p>Companies building software or services specifically for healthcare providers, payers, or life sciences organizations. Includes EHR vendors, revenue cycle management, and clinical decision support.</p>",
    examples: ["Epic Systems", "Veeva Systems", "Health Catalyst"],
    dimensionId: "dimension-focus"
  },
  {
    id: "cat-fintech",
    label: "Financial Technology",
    description: "<p>Technology companies operating in financial services — including payments, lending, wealth management, and banking infrastructure.</p>",
    examples: ["Stripe", "Plaid", "Brex"],
    dimensionId: "dimension-focus"
  },
  {
    id: "cat-retail-tech",
    label: "Retail Technology",
    description: "<p>Software and services companies targeting retail or e-commerce businesses. Includes supply chain, inventory management, and point-of-sale systems.</p>",
    examples: ["Shopify", "Lightspeed", "Aptos"],
    dimensionId: "dimension-focus"
  },
  {
    id: "cat-construction",
    label: "Construction Technology",
    description: "<p>Companies providing technology solutions to general contractors, specialty contractors, or construction project owners.</p>",
    examples: ["Procore", "Autodesk Construction", "Trimble"],
    dimensionId: "dimension-focus"
  }
];
