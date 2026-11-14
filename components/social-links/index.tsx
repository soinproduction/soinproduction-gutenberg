'use client';

import { useSite } from '../../core/content/context.js';
import { buttonClasses } from '../../core/ui/button-appearance.js';

const networks = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  telegram: 'Telegram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
};

type SocialLinksProps = {
  className?: string;
  buttonStyle?: string;
};

export function SocialLinks({ className, buttonStyle = 'text' }: SocialLinksProps) {
  const links = useSite().settings?.socialLinks ?? {};
  const buttons = Object.entries(networks).flatMap(([network, label]) => {
    const url = links[network];
    if (typeof url !== 'string' || !/^https?:\/\/[^/]+/i.test(url)) return [];
    return <a key={network} href={url} className={buttonClasses("is-style-studio-" + buttonStyle)}>{label}</a>;
  });

  return buttons.length ? <div className={className}>{buttons}</div> : null;
}
