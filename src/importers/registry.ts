import type { AppConfig } from "../config/schema.js";
import type { Provider } from "../types/hotword.js";

export interface ThirdPartyImporterDefinition {
  provider: Provider;
  filePrefixes: string[];
}

const importerDefinitions: ThirdPartyImporterDefinition[] = [
  {
    provider: "chanmama",
    filePrefixes: ["chanmama"],
  },
  {
    provider: "feigua",
    filePrefixes: ["feigua"],
  },
  {
    provider: "qiangua",
    filePrefixes: ["qiangua", "qian-gua", "qian_gua"],
  },
  {
    provider: "magicmirror",
    filePrefixes: ["magicmirror", "mktindex"],
  },
];

export function inferThirdPartyProvider(fileName: string): Provider | null {
  const normalized = fileName.toLowerCase();
  const definition = importerDefinitions.find((item) =>
    item.filePrefixes.some((prefix) => normalized.startsWith(prefix)),
  );
  return definition?.provider ?? null;
}

export function isEnabledThirdPartyProvider(provider: Provider, config: AppConfig): boolean {
  return config.sources.some(
    (source) =>
      source.provider === provider &&
      source.enabled &&
      source.tier === "secondary" &&
      source.kind === "third_party",
  );
}
