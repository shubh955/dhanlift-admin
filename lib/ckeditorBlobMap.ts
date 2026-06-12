// Shared registry: CKEditor blob URL → real server URL.
// After upload the adapter stores the mapping here so BlogForm can
// replace blob URLs with permanent server URLs before calling the save API.
export const blobToServerUrl = new Map<string, string>();
