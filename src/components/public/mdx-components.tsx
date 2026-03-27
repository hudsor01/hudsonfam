import type { MDXComponents } from "mdx/types";

export const mdxComponents: MDXComponents = {
  h1: ({ children, ...props }) => (
    <h1
      className="text-3xl sm:text-4xl font-serif text-text font-normal mt-10 mb-4"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="text-2xl sm:text-3xl font-serif text-text font-normal mt-8 mb-3"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="text-xl sm:text-2xl font-serif text-text font-normal mt-6 mb-2"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4
      className="text-lg font-serif text-text font-normal mt-5 mb-2"
      {...props}
    >
      {children}
    </h4>
  ),
  p: ({ children, ...props }) => (
    <p
      className="text-text text-base leading-relaxed mb-4"
      {...props}
    >
      {children}
    </p>
  ),
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
      {...props}
    >
      {children}
    </a>
  ),
  ul: ({ children, ...props }) => (
    <ul
      className="list-disc list-inside text-text mb-4 space-y-1 pl-2"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      className="list-decimal list-inside text-text mb-4 space-y-1 pl-2"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="text-text leading-relaxed" {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-3 border-accent pl-4 my-6 italic text-text-muted"
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ children, className, ...props }) => {
    // Inline code (no className means not inside a code block)
    if (!className) {
      return (
        <code
          className="bg-surface border border-border rounded px-1.5 py-0.5 text-sm font-mono text-accent"
          {...props}
        >
          {children}
        </code>
      );
    }
    // Code block (inside <pre>) — className contains language
    return (
      <code className={`font-mono text-sm ${className}`} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre
      className="bg-surface border border-border rounded-xl p-4 overflow-x-auto mb-4 text-sm leading-relaxed"
      {...props}
    >
      {children}
    </pre>
  ),
  hr: (props) => (
    <hr className="border-border my-8" {...props} />
  ),
  img: ({ alt, src, ...props }) => (
    <figure className="my-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || ""}
        className="rounded-xl w-full"
        {...props}
      />
      {alt && (
        <figcaption className="text-center text-xs text-text-dim mt-2 italic">
          {alt}
        </figcaption>
      )}
    </figure>
  ),
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto mb-4">
      <table
        className="w-full border-collapse text-sm"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th
      className="border border-border bg-surface px-3 py-2 text-left text-text font-medium"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      className="border border-border px-3 py-2 text-text-muted"
      {...props}
    >
      {children}
    </td>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-text" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic text-text-muted" {...props}>
      {children}
    </em>
  ),
};
