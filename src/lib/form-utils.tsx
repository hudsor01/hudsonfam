"use client";

import { useForm } from "@tanstack/react-form";
import type { ZodObject, ZodRawShape } from "zod";

/**
 * Convenience wrapper around TanStack Form's `useForm` that wires up a Zod
 * schema as the `onChange` validator.  Zod v4 implements the Standard Schema
 * interface so no adapter is needed — TanStack Form picks it up natively.
 */
export function useZodForm<T extends Record<string, unknown>>(opts: {
  defaultValues: T;
  schema: ZodObject<ZodRawShape>;
}) {
  return useForm({
    defaultValues: opts.defaultValues,
    validators: {
      onChange: opts.schema as never,
    },
  });
}
