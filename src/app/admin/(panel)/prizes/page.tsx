import type { Metadata } from "next";
import { PrizeEditor } from "@/components/admin/prize-editor";

export const metadata: Metadata = { title: "奖品与概率" };

export default function PrizesPage() {
  return <PrizeEditor />;
}
