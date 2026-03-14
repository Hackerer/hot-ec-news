import type { Category } from "../types/hotword.js";
import type { AppConfig } from "./schema.js";

export const categorySeeds: Record<Exclude<Category, "unknown">, string[]> = {
  apparel: ["连衣裙", "防晒衣", "衬衫"],
  shoes: ["运动鞋", "短靴", "凉鞋"],
  jewelry: ["项链", "戒指", "耳钉"],
};

export function allSeeds(): string[] {
  return [...new Set(Object.values(categorySeeds).flat())];
}

export function seedsFromConfig(config: AppConfig): string[] {
  return [...new Set(config.categories.flatMap((category) => config.seeds[category] ?? []))];
}
