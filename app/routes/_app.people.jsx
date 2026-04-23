import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { PeopleSearchPage } from "../components/PeopleSearchPage";

const MOCK_INDUSTRIES = [
  { value: "private-equity", label: "Private Equity" },
  { value: "venture-capital", label: "Venture Capital" },
  { value: "hedge-funds", label: "Hedge Funds" },
  { value: "real-estate", label: "Real Estate" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "credit", label: "Credit / Debt" },
  { value: "fund-of-funds", label: "Fund of Funds" },
  { value: "family-office", label: "Family Office" },
  { value: "endowment", label: "Endowment / Foundation" },
  { value: "pension", label: "Pension Fund" }
];

const MOCK_FOCUSES = [
  { value: "buyout", label: "Buyout" },
  { value: "growth-equity", label: "Growth Equity" },
  { value: "early-stage", label: "Early Stage / Seed" },
  { value: "late-stage", label: "Late Stage" },
  { value: "distressed", label: "Distressed / Turnaround" },
  { value: "special-situations", label: "Special Situations" },
  { value: "core", label: "Core" },
  { value: "value-add", label: "Value-Add" },
  { value: "opportunistic", label: "Opportunistic" },
  { value: "long-short", label: "Long/Short Equity" },
  { value: "macro", label: "Global Macro" }
];

export async function loader() {
  // TODO: load industry and focus options from SIF taxonomy document
  // See docs/contacts-search-api.md for full API spec
  return json({
    industries: MOCK_INDUSTRIES,
    focuses: MOCK_FOCUSES
  });
}

export default function PeoplePage() {
  const { industries, focuses } = useLoaderData();
  return <PeopleSearchPage industries={industries} focuses={focuses} />;
}
