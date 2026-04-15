import React, { useState } from "react";
import { RichTextField } from "./RichTextField";

export default {
  title: "Molecules/RichTextField",
  component: RichTextField
};

export function Default() {
  const [value, setValue] = useState("<p>This editor is intended for card descriptions.</p>");

  return (
    <RichTextField
      label="Description"
      value={value}
      onChange={setValue}
      height="320px"
    />
  );
}
