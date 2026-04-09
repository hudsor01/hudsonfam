"use client";

import { useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export interface FiltersState {
  search: string;
  sources: string[];
  statuses: string[];
  scoreMin: number;
  scoreMax: number;
}

interface FiltersSidebarProps {
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  availableSources: string[];
  availableStatuses: string[];
}

const sourceColors: Record<string, string> = {
  jobicy: "text-source-jobicy",
  remoteok: "text-source-remoteok",
  himalayas: "text-source-himalayas",
  arbeitnow: "text-source-arbeitnow",
  workingnomads: "text-source-workingnomads",
  serpapi_google: "text-source-serpapi",
  remotive: "text-source-remotive",
};

const statusColors: Record<string, string> = {
  new: "text-primary",
  interested: "text-accent",
  applied: "text-status-applied",
  interview: "text-status-interview",
  offer: "text-status-offer",
  rejected: "text-destructive/60",
};

const defaultFilters: FiltersState = {
  search: "",
  sources: [],
  statuses: [],
  scoreMin: 0,
  scoreMax: 10,
};

export function FiltersSidebar({
  filters,
  onFiltersChange,
  availableSources,
  availableStatuses,
}: FiltersSidebarProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFiltersChange({ ...filters, search: value });
    }, 300);
  };

  const toggleSource = (source: string) => {
    const next = filters.sources.includes(source)
      ? filters.sources.filter((s) => s !== source)
      : [...filters.sources, source];
    onFiltersChange({ ...filters, sources: next });
  };

  const toggleStatus = (status: string) => {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: next });
  };

  const handleScoreMin = (value: string) => {
    const num = Math.max(0, Math.min(10, Number(value) || 0));
    onFiltersChange({ ...filters, scoreMin: num });
  };

  const handleScoreMax = (value: string) => {
    const num = Math.max(0, Math.min(10, Number(value) || 10));
    onFiltersChange({ ...filters, scoreMax: num });
  };

  const handleReset = () => {
    onFiltersChange({ ...defaultFilters });
  };

  return (
    <div className="w-56 shrink-0 space-y-5 p-4 rounded-lg border border-border bg-card/50">
      <div className="space-y-2">
        <Input
          placeholder="Search title, company..."
          defaultValue={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {availableSources.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Sources
          </p>
          <div className="space-y-1.5">
            {availableSources.map((source) => (
              <label
                key={source}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <Checkbox
                  checked={filters.sources.includes(source)}
                  onCheckedChange={() => toggleSource(source)}
                />
                <span
                  className={`text-xs capitalize group-hover:opacity-100 transition-opacity ${
                    sourceColors[source] ?? "text-muted-foreground"
                  } ${filters.sources.length > 0 && !filters.sources.includes(source) ? "opacity-50" : ""}`}
                >
                  {source.replace("serpapi_", "").replace(/_/g, " ")}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {availableStatuses.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Status
          </p>
          <div className="space-y-1.5">
            {availableStatuses.map((status) => (
              <label
                key={status}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <Checkbox
                  checked={filters.statuses.includes(status)}
                  onCheckedChange={() => toggleStatus(status)}
                />
                <span
                  className={`text-xs capitalize ${
                    statusColors[status] ?? "text-muted-foreground"
                  } ${filters.statuses.length > 0 && !filters.statuses.includes(status) ? "opacity-50" : ""}`}
                >
                  {status}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Score
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={10}
            value={filters.scoreMin}
            onChange={(e) => handleScoreMin(e.target.value)}
            className="w-14 h-7 text-xs"
            placeholder="Min"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="number"
            min={0}
            max={10}
            value={filters.scoreMax}
            onChange={(e) => handleScoreMax(e.target.value)}
            className="w-14 h-7 text-xs"
            placeholder="Max"
          />
        </div>
      </div>

      <button
        onClick={handleReset}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
      >
        Reset filters
      </button>
    </div>
  );
}
