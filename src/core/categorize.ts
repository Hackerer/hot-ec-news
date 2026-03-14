import type { Category } from "../types/hotword.js";

const categoryKeywords: Record<Category, string[]> = {
  apparel: [
    "连衣裙",
    "衬衫",
    "卫衣",
    "羽绒服",
    "牛仔裤",
    "T恤",
    "西装",
    "半身裙",
    "防晒衣",
    "裤子",
    "上衣",
    "外套",
  ],
  shoes: [
    "运动鞋",
    "板鞋",
    "跑鞋",
    "靴",
    "皮鞋",
    "凉鞋",
    "拖鞋",
    "老爹鞋",
    "高跟鞋",
    "短靴",
    "雪地靴",
  ],
  jewelry: [
    "项链",
    "戒指",
    "耳环",
    "耳钉",
    "手链",
    "手镯",
    "吊坠",
    "首饰",
    "珍珠",
    "黄金",
    "银饰",
  ],
  unknown: [],
};

export function categorizeKeyword(keyword: string): Category {
  for (const category of ["apparel", "shoes", "jewelry"] as const) {
    if (categoryKeywords[category].some((token) => keyword.includes(token))) {
      return category;
    }
  }
  return "unknown";
}

export function normalizeKeyword(keyword: string): string {
  return keyword.trim().replace(/\s+/g, "").toLowerCase();
}
