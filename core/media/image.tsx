'use client';
import {ContentContext} from '../content/context.js';
import React, {useContext} from 'react';
import {resolveMedia} from './values.js';

export function LibraryImage({src, ...props}: React.ImgHTMLAttributes<HTMLImageElement>) {
    const context = useContext(ContentContext);
    if (!src) return null;
    return <img loading="lazy" decoding="async" src={resolveMedia(src, context.site.media)} {...props} />;
}
