# Shared React form controls

Portable UI primitives for the public site, form engine and custom Gutenberg panels. No site data, Next router or WordPress globals are imported here.

- `Select`: Radix Select, `options`, controlled `value`/`onValueChange` or `defaultValue`, `name`, `required`, `disabled`, accessible labels and reset support. The dropdown uses the trigger's owner document so iframe editors work correctly.
- `SelectControl`: labelled admin adapter (`label`, `help`, `options`, `value`, `onChange`), with the administration design tokens. Use it instead of `wp.components.SelectControl` in custom panels.
- `Checkbox`, `RadioGroup`, `RadioItem`: Radix controls with native form participation.
- `Input`, `Textarea`: native inputs behind common React components; preserve browser autofill, validation and input types.

Import with `@ui/select`, `@ui/input`, `@ui/checkbox`, `@ui/radio-group`. Frontend styles come from `forms.css`; custom administration also loads `forms-admin.css`. Site controls inherit site colors; admin controls use `modules/admin-ui` tokens. Native WordPress and third-party plugin screens are not overridden.

The reusable core and forms module share this module. Copy `modules/ui` with them and retain the `@ui/*` TypeScript alias and Radix/clsx/lucide dependencies. Do not copy controls into individual sections.
