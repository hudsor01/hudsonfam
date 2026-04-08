"use client";

import { submitMemory } from "@/lib/memorial-actions";
import { useState } from "react";
import { toast } from "sonner";
import { useZodForm } from "@/lib/form-utils";
import { memoryFormSchema } from "@/lib/schemas";

const RELATIONSHIP_OPTIONS = [
  {
    group: "Immediate Family",
    options: [
      "Son",
      "Daughter",
      "Wife",
      "Husband",
      "Father",
      "Mother",
      "Brother",
      "Sister",
    ],
  },
  {
    group: "Extended Family",
    options: [
      "Grandson",
      "Granddaughter",
      "Nephew",
      "Niece",
      "Uncle",
      "Aunt",
      "Cousin",
      "Father-in-Law",
      "Mother-in-Law",
      "Brother-in-Law",
      "Sister-in-Law",
      "Son-in-Law",
      "Daughter-in-Law",
    ],
  },
  {
    group: "Step Relations",
    options: [
      "Stepson",
      "Stepdaughter",
      "Stepfather",
      "Stepmother",
      "Stepbrother",
      "Stepsister",
    ],
  },
  {
    group: "Other",
    options: ["Friend", "Colleague", "Neighbor", "Mentor", "Other"],
  },
];

export function MemoryForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const form = useZodForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      relationship: "",
      content: "",
    },
    schema: memoryFormSchema,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setServerError("");

    form.handleSubmit();

    if (!form.state.isValid) return;

    setLoading(true);
    try {
      const values = form.state.values;
      const formData = new FormData();
      formData.set("firstName", values.firstName);
      formData.set("lastName", values.lastName);
      formData.set("email", values.email);
      formData.set("phone", values.phone ?? "");
      formData.set("relationship", values.relationship);
      formData.set("content", values.content);

      await submitMemory(formData);
      setSubmitted(true);
      form.reset();
      toast.success("Thank you for sharing your memory");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="size-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
          <svg
            className="size-5 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </div>
        <p className="text-foreground font-serif text-lg mb-2">
          Thank you for sharing
        </p>
        <p className="text-muted-foreground text-sm mb-6">
          Thank you for sharing your memory. It will be visible once reviewed by
          the family.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="text-sm text-accent hover:text-accent/80 transition-colors"
        >
          Share another memory
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <form.Field name="firstName">
          {(field) => (
            <div>
              <label
                htmlFor="firstName"
                className="block text-xs text-muted-foreground mb-1.5"
              >
                First Name <span className="text-accent">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="First name"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-xs text-destructive mt-1">
                  {field.state.meta.errors.join(", ")}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="lastName">
          {(field) => (
            <div>
              <label
                htmlFor="lastName"
                className="block text-xs text-muted-foreground mb-1.5"
              >
                Last Name <span className="text-accent">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Last name"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-xs text-destructive mt-1">
                  {field.state.meta.errors.join(", ")}
                </p>
              )}
            </div>
          )}
        </form.Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <form.Field name="email">
          {(field) => (
            <div>
              <label
                htmlFor="email"
                className="block text-xs text-muted-foreground mb-1.5"
              >
                Email <span className="text-accent">*</span>{" "}
                <span className="text-text-dim">(not displayed publicly)</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-xs text-destructive mt-1">
                  {field.state.meta.errors.join(", ")}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="phone">
          {(field) => (
            <div>
              <label
                htmlFor="phone"
                className="block text-xs text-muted-foreground mb-1.5"
              >
                Phone <span className="text-text-dim">(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="(555) 555-5555"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          )}
        </form.Field>
      </div>

      <form.Field name="relationship">
        {(field) => (
          <div>
            <label
              htmlFor="relationship"
              className="block text-xs text-muted-foreground mb-1.5"
            >
              Relationship <span className="text-accent">*</span>
            </label>
            <select
              id="relationship"
              name="relationship"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors"
            >
              <option value="" disabled className="text-text-dim">
                Select your relationship...
              </option>
              {RELATIONSHIP_OPTIONS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-destructive mt-1">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="content">
        {(field) => (
          <div>
            <label
              htmlFor="content"
              className="block text-xs text-muted-foreground mb-1.5"
            >
              Your Memory <span className="text-accent">*</span>
            </label>
            <textarea
              id="content"
              name="content"
              rows={5}
              maxLength={5000}
              placeholder="Share a memory, a story, or a few words about what Richard meant to you..."
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground caret-primary placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors resize-y field-sizing-content min-h-[120px]"
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-xs text-destructive mt-1">
                {field.state.meta.errors.join(", ")}
              </p>
            )}
          </div>
        )}
      </form.Field>

      {serverError && (
        <p className="text-destructive text-xs bg-destructive/5 border border-destructive/10 rounded-lg px-3 py-2">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto bg-accent text-bg font-medium rounded-lg px-6 py-2.5 text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
      >
        {loading ? "Sharing..." : "Share Memory"}
      </button>
    </form>
  );
}
