import { BookmarkGroup } from "@/lib/dashboard/types";

const BOOKMARK_GROUPS: BookmarkGroup[] = [
  {
    title: "Development",
    links: [
      { title: "GitHub", url: "https://github.com" },
      { title: "Claude Code", url: "https://claude.ai/code" },
    ],
  },
  {
    title: "Resources",
    links: [
      { title: "Kubernetes Docs", url: "https://kubernetes.io/docs/" },
      { title: "N8N Docs", url: "https://docs.n8n.io/" },
    ],
  },
  {
    title: "Projects",
    links: [
      { title: "TenantFlow", url: "https://tenantflow.app" },
      { title: "Hudson Digital", url: "https://hudsondigitalsolutions.com" },
      { title: "Portfolio", url: "https://portfolio.thehudsonfam.com" },
    ],
  },
];

export function Bookmarks() {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-text tracking-wide uppercase">
          Bookmarks
        </h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {BOOKMARK_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs uppercase tracking-wider text-text-dim mb-2">
                {group.title}
              </h4>
              <div className="space-y-1">
                {group.links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-text-muted hover:text-text hover:bg-bg/50 transition-colors"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-text-dim"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    {link.title}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
