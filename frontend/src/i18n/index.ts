import { en, type MessageCatalog } from "./locales/en";
import { it } from "./locales/it";

const catalogs: Record<string, MessageCatalog> = { en, it };

function localeFromBrowser() {
  const requested = navigator.languages?.length ? navigator.languages : [navigator.language];

  for (const tag of requested) {
    const language = tag.split("-")[0];
    if (language in catalogs) return language;
  }

  return "en";
}

let locale = localeFromBrowser();

type ErrorCode = Exclude<keyof MessageCatalog["errors"], "UNKNOWN">;

export function setLocale(next: string) {
  if (catalogs[next]) {
    locale = next;
  }
}

export function messageForProblem(problem: { code?: string; detail?: string }) {
  const messages = catalogs[locale].errors;
  if (problem.code && isErrorCode(problem.code, messages)) {
    return messages[problem.code];
  }
  return problem.detail ?? messages.UNKNOWN;
}

function isErrorCode(code: string, messages: MessageCatalog["errors"]): code is ErrorCode {
  return code in messages && code !== "UNKNOWN";
}
