'use client';

export const Choice = Object.assign(
  (_props: { name: string; label: string; choices: Record<string, string> }) => null,
  {
    kind: 'choice',
    field: ({ label, choices }: any) => ({
      type: 'select' as const,
      label,
      choices,
      settings: true,
      defaultValue: Object.keys(choices)[0],
    }),
  }
);
