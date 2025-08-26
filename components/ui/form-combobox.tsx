"use client"

import * as React from "react"
import { Combobox, ComboboxOption } from "./combobox"

interface FormComboboxProps {
  options: ComboboxOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  name?: string
}

export const FormCombobox = React.forwardRef<
  HTMLButtonElement,
  FormComboboxProps
>(({ onChange, ...props }, ref) => {
  return (
    <Combobox
      {...props}
      onValueChange={onChange}
      className={props.className}
    />
  )
})

FormCombobox.displayName = "FormCombobox"