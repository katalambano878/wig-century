'use client';

import { useEffect } from 'react';

const SITE_NAME = 'Luxury Loots GH';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Thrifted Tops · African Print · Watches & Sunglasses`;
  }, [title]);
}
