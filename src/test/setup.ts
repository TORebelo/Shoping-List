import "@testing-library/jest-dom/vitest";

// Node 25 ships a native `localStorage` / `sessionStorage` global that
// shadows the Storage implementation jsdom tries to install. The native
// stub has no `clear`/`setItem`/... methods when no persistence file is
// configured, which breaks any code that uses the Web Storage API under
// test. Replace both globals — and their `window` copies — with a plain
// in-memory Storage that implements the full contract.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

function installStorage(name: "localStorage" | "sessionStorage") {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: storage,
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, name, {
      configurable: true,
      value: storage,
    });
  }
}

installStorage("localStorage");
installStorage("sessionStorage");
