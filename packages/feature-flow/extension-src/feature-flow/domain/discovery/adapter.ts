export interface DiscoveryModelAdapter {
  complete(prompt: string, options?: DiscoveryModelRequestOptions): Promise<string>;
}

export interface DiscoveryModelRequestOptions {
  signal?: AbortSignal;
}
