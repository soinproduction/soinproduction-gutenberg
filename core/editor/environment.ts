import type { MediaLibrary } from '../media/values.js';
import type { ReactNode } from 'react';
export type LinkRecord = {
  id: number | string;
  title: string;
  url: string;
  kind: string;
  key?: string;
};
export type EditorEnvironment = {
  adminUrl?: string;
  renderCustomField?: (props: any, scope: any) => ReactNode;
  media?: () => MediaLibrary;
  linkRecords?: (site: any) => LinkRecord[];
  actionExtras?: (props: { value: any; setValue: (value: any) => void; site: any }) => ReactNode;
};
let environment: EditorEnvironment = {};
/** Configure host integrations before mounting the editor. No project globals are read by the core. */
export function configureEditor(next: EditorEnvironment) {
  environment = { ...environment, ...next };
}
export function editorEnvironment() {
  return environment;
}
const emptyMedia: MediaLibrary = {};
export function editorMedia() {
  return environment.media?.() ?? emptyMedia;
}
