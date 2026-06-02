import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Theme preview (temp)",
  robots: { index: false, follow: false },
};

/**
 * TEMPORARY palette-review page. Renders the recipe UI in several trad-wife
 * color schemes side by side so the owner can pick one. Self-contained inline
 * styles (does NOT use the global @theme tokens) so each card shows its own
 * palette independently. Delete this route once a palette is chosen.
 */

type Palette = {
  id: string;
  name: string;
  vibe: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  primary: string;
  accent: string;
  border: string;
  heading: string;
};

const PALETTES: Palette[] = [
  {
    id: "cream-sage",
    name: "1 · Cream & Sage",
    vibe: "Cottagecore — calm garden kitchen",
    bg: "#F7F1E6",
    surface: "#FCF8F0",
    text: "#3A2E25",
    muted: "#6B5D50",
    primary: "#6E8060",
    accent: "#C58B7A",
    border: "#E3D8C5",
    heading: "#3A2E25",
  },
  {
    id: "ivory-terracotta",
    name: "2 · Ivory & Terracotta",
    vibe: "Vintage cookbook — warm retro kitchen",
    bg: "#FAF4EA",
    surface: "#FFFDF8",
    text: "#43342A",
    muted: "#7A6A5A",
    primary: "#C0673F",
    accent: "#D9A24B",
    border: "#EADFCE",
    heading: "#9E4F2E",
  },
  {
    id: "butter-blue",
    name: "3 · Butter & Farmhouse Blue",
    vibe: "Farmhouse gingham — buttery + slate blue",
    bg: "#FBF4E0",
    surface: "#FFFCF3",
    text: "#3B3026",
    muted: "#6E6151",
    primary: "#4C6680",
    accent: "#B8543F",
    border: "#ECE0C8",
    heading: "#384F66",
  },
  {
    id: "blush-oat",
    name: "4 · Blush & Oat",
    vibe: "Soft romantic — oat, mauve, muted gold",
    bg: "#F4ECE3",
    surface: "#FBF6F0",
    text: "#463A39",
    muted: "#7E6F6C",
    primary: "#A86A72",
    accent: "#C79A52",
    border: "#E6D9CE",
    heading: "#6E4B52",
  },
  {
    id: "linen-olive",
    name: "5 · Linen & Olive",
    vibe: "Mediterranean trad — linen + olive + clay",
    bg: "#F6F2E7",
    surface: "#FCFAF1",
    text: "#383528",
    muted: "#6C6450",
    primary: "#7B7A3F",
    accent: "#B96A43",
    border: "#E5DEC9",
    heading: "#55562C",
  },
  {
    id: "wheat-plum",
    name: "6 · Wheat & Plum",
    vibe: "Heritage — wheat cream + deep plum + gold",
    bg: "#F7F0E2",
    surface: "#FDF9F0",
    text: "#3E3128",
    muted: "#6F6052",
    primary: "#7A3F54",
    accent: "#C18A3D",
    border: "#E8DCC6",
    heading: "#5E2E40",
  },
];

const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";

function Mockup({ p }: { p: Palette }) {
  return (
    <div
      style={{
        background: p.bg,
        color: p.text,
        border: `1px solid ${p.border}`,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      {/* faux nav */}
      <div
        style={{
          background: p.surface,
          borderBottom: `1px solid ${p.border}`,
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: p.primary,
            color: p.surface,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          H
        </div>
        <span style={{ fontFamily: SERIF, fontSize: 15, color: p.heading }}>
          Grandma Hudson&rsquo;s Recipes
        </span>
        <span style={{ marginLeft: "auto", color: p.primary, fontSize: 13 }}>
          My Menu (3)
        </span>
      </div>

      <div style={{ padding: "20px 22px" }}>
        {/* swatches */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[p.bg, p.surface, p.text, p.muted, p.primary, p.accent, p.border].map(
            (c) => (
              <div
                key={c}
                title={c}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: c,
                  border: `1px solid ${p.border}`,
                }}
              />
            )
          )}
        </div>

        {/* breadcrumb */}
        <div style={{ fontSize: 12, color: p.muted, marginBottom: 10 }}>
          Recipes <span style={{ color: p.border }}>/</span>{" "}
          <span style={{ color: p.primary }}>Cake</span>{" "}
          <span style={{ color: p.border }}>/</span> Angel Food Cake
        </div>

        {/* title + category badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2
            style={{
              fontFamily: SERIF,
              fontSize: 24,
              color: p.heading,
              margin: 0,
              fontWeight: 500,
            }}
          >
            Angel Food Cake
          </h2>
          <span
            style={{
              fontSize: 12,
              color: p.primary,
              background: `${p.primary}1f`,
              border: `1px solid ${p.primary}40`,
              borderRadius: 999,
              padding: "2px 10px",
            }}
          >
            Cake
          </span>
        </div>
        <p style={{ color: p.muted, fontSize: 13, margin: "6px 0 16px" }}>
          Serves 12 · Prep 20 minutes · Cook 45 minutes
        </p>

        {/* ingredients checklist */}
        <p style={{ fontFamily: SERIF, fontSize: 15, color: p.heading, margin: "0 0 8px" }}>
          Ingredients
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            ["1 1/2 cups sugar", false],
            ["1 cup cake flour", true],
            ["12 egg whites", false],
          ].map(([label, checked]) => (
            <li key={label as string} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15 }}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: `2px solid ${checked ? p.primary : p.border}`,
                  background: checked ? p.primary : "transparent",
                  color: p.surface,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {checked ? "✓" : ""}
              </span>
              <span
                style={{
                  color: checked ? p.muted : p.text,
                  textDecoration: checked ? "line-through" : "none",
                }}
              >
                {label}
              </span>
            </li>
          ))}
        </ul>

        {/* buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            style={{
              background: p.primary,
              color: p.surface,
              border: "none",
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: 14,
              cursor: "default",
            }}
          >
            Add to menu
          </button>
          <button
            style={{
              background: "transparent",
              color: p.text,
              border: `1px solid ${p.border}`,
              borderRadius: 8,
              padding: "9px 16px",
              fontSize: 14,
              cursor: "default",
            }}
          >
            Print
          </button>
        </div>

        {/* prev/next */}
        <div
          style={{
            marginTop: 18,
            paddingTop: 12,
            borderTop: `1px solid ${p.border}`,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            color: p.primary,
          }}
        >
          <span>← Almond Cake</span>
          <span>Chocolate Cake →</span>
        </div>
      </div>

      {/* label */}
      <div
        style={{
          background: p.surface,
          borderTop: `1px solid ${p.border}`,
          padding: "10px 18px",
        }}
      >
        <div style={{ fontFamily: SERIF, fontSize: 15, color: p.heading }}>{p.name}</div>
        <div style={{ fontSize: 12, color: p.muted }}>{p.vibe}</div>
      </div>
    </div>
  );
}

export default function ThemePreviewPage() {
  return (
    <div style={{ background: "#2a2a2a", minHeight: "100vh", padding: "32px 20px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1
          style={{
            fontFamily: SERIF,
            color: "#fff",
            fontSize: 26,
            fontWeight: 500,
            marginBottom: 6,
          }}
        >
          Trad-wife palette preview
        </h1>
        <p style={{ color: "#bbb", fontSize: 14, marginBottom: 28 }}>
          Temporary page. Each card is the same recipe UI in a different light/warm
          scheme (serif headings throughout). Tell me the number you like — or mix
          (e.g. &ldquo;#1 background with #2 primary&rdquo;) — and I&rsquo;ll apply it to the
          recipes + /my-menu pages, then delete this page.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 22,
          }}
        >
          {PALETTES.map((p) => (
            <Mockup key={p.id} p={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
