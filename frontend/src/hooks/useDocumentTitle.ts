import { useEffect } from "react";

export function screenTitle(name: string) {
  return `${name} · Diet Plan`;
}

export function useDocumentTitle(name: string | null) {
  useEffect(() => {
    if (name === null) {
      return;
    }
    document.title = screenTitle(name);
  }, [name]);
}
