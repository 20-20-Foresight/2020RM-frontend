import React from "react";
import { OrganizationSegmentationReviewFlyout } from "./OrganizationSegmentationTab.jsx";

const sampleSegmentation = {
  sector: { value: "Industrial" },
  emailIndustry: { value: "Building Products" },
};

export default {
  title: "Organizations/Segmentation Review Flyout",
  component: OrganizationSegmentationReviewFlyout,
  parameters: {
    layout: "fullscreen",
  },
};

export function FitsViewport() {
  return (
    <OrganizationSegmentationReviewFlyout
      isOpen
      onClose={() => {}}
      organizationUUID="org-story-fit"
      organizationName="Clearwater Capital Partners"
      segmentation={sampleSegmentation}
      onReviewOutcome={() => {}}
    />
  );
}

export function RequiresScroll() {
  return (
    <OrganizationSegmentationReviewFlyout
      isOpen
      onClose={() => {}}
      organizationUUID="org-story-scroll"
      organizationName="Egwele & Company"
      segmentation={sampleSegmentation}
      onReviewOutcome={() => {}}
    />
  );
}
