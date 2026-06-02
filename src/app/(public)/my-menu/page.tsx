import type { Metadata } from "next";
import { MenuView } from "./menu-client";

export const metadata: Metadata = {
  title: "My Menu | Hudson Family",
  description: "Your saved recipe menu.",
};

export default function MyMenuPage() {
  return <MenuView />;
}
