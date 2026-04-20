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
