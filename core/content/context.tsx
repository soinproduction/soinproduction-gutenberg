'use client';
import { createContext, useContext, type ReactNode } from 'react';
export type BlockData = Record<string, any>;
export type ContentBlock = {
  name: string;
  attrs: { data?: BlockData; [key: string]: any };
  innerBlocks?: ContentBlock[];
  html?: string;
  wrapper?: { class?: string; style?: string };
};
export const ContentContext = createContext<{
  data: BlockData;
  record: BlockData;
  site: any;
  editor: boolean;
  innerBlocks?: ContentBlock[];
}>({ data: {}, record: {}, site: {}, editor: false });
export const useRecord = () => useContext(ContentContext).record;
export const useSite = () => useContext(ContentContext).site;
export const useIsEditor = () => useContext(ContentContext).editor;
export function ContentProvider({
  children,
  data = {},
  record = {},
  site = {},
  editor = false,
  innerBlocks = [],
}: {
  children: ReactNode;
  data?: BlockData;
  record?: BlockData;
  site?: any;
  editor?: boolean;
  innerBlocks?: ContentBlock[];
}) {
  return (
    <ContentContext.Provider value={{ data, record, site, editor, innerBlocks }}>
      {children}
    </ContentContext.Provider>
  );
}
