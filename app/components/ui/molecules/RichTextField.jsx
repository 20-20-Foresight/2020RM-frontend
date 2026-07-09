import React from "react";
import { FormControl, FormLabel } from "@chakra-ui/react";
import { RichTextEditor } from "../../RichTextEditor";

/**
 * Combines one field label with the shared Toast-based rich text editor.
 * @param {{
 *   label: string,
 *   value?: string,
 *   onChange?: (value: string) => void,
 *   placeholder?: string,
 *   height?: string
 * }} props
 * @returns {JSX.Element}
 */
export function RichTextField({
  label,
  value = "",
  onChange,
  placeholder = "",
  height = "240px"
}) {
  return (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      <RichTextEditor value={value} onChange={onChange} placeholder={placeholder} height={height} />
    </FormControl>
  );
}
