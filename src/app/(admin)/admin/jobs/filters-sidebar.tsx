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
  jobicy: "text-blue-400",
  remoteok: "text-green-400",
  himalayas: "text-purple-400",
  arbeitnow: "text-orange-400",
  workingnomads: "text-teal-400",
  serpapi_google: "text-red-400",
  remotive: "text-yellow-400",
};

const statusColors: Record<string, string> = {
  new: "text-primary",
  interested: "text-accent",
  applied: "text-green-400",
  interview: "text-purple-400",
  offer: "text-emerald-400",
  rejected: "text-red-400/60",
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
      {/* Search */}
      <div className="space-y-2">
        <Input
          placeholder="Search title, company..."
          defaultValue={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Sources */}
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

      {/* Status */}
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

      {/* Score range */}
      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Score
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={10}
            value={filters.scoreMin}
            onChange={(e) => handleScoreMin(e.target.value)}
            className="w-14 h-7 rounded-md border border-input bg-transparent px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Min"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="number"
            min={0}
            max={10}
            value={filters.scoreMax}
            onChange={(e) => handleScoreMax(e.target.value)}
            className="w-14 h-7 rounded-md border border-input bg-transparent px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Max"
          />
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={handleReset}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
      >
        Reset filters
      </button>
    </div>
  );
}
