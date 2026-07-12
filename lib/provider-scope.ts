import { AsyncLocalStorage } from "node:async_hooks";

const providerProfileScope = new AsyncLocalStorage<string>();

export function getProviderProfileId() {
  return providerProfileScope.getStore() ?? null;
}

export function withProviderProfile<T>(profileId: string, callback: () => Promise<T>) {
  return providerProfileScope.run(profileId, callback);
}
