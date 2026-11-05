'use client';
import { EditorAction } from '../../../core/ui/editor-action.js';
import { ContentButton } from '../implementation/content.js';
import { buttonStyleOptions } from '../implementation/data.js';
declare const wp: any;

export const buttonStyle = (button: any, fallback?: string) => {
  const style = button.style || fallback;
  return style ? `is-style-studio-${style}` : undefined;
};

export function SiteButton({ button, fallback }: { button: any; fallback?: string }) {
  return (
    <ContentButton
      fixedLayout
      attributes={{
        text: button.text,
        url: button.url,
        className: buttonStyle(button, fallback),
        metadata: {
          siteLinkId: button.linkId,
          siteModalId: button.modalId,
          siteModalPlan: button.plan,
          siteButtonIcon: button.icon,
          siteButtonIconPosition: button.iconPosition,
        },
      }}
    />
  );
}

/** Style is chosen by looks: a corner control opens tiles drawn like the buttons themselves. */
export function ButtonStylePicker({ button, onChange }: { button: any; onChange: (next: any) => void }) {
  const { Dropdown } = wp.components;
  return (
    <Dropdown
      className="site-button-style"
      popoverProps={{ placement: 'bottom-start' }}
      renderToggle={({ isOpen, onToggle }: any) => (
        <EditorAction action="style" label="Button style" aria-expanded={isOpen} onClick={onToggle} />
      )}
      renderContent={({ onClose }: any) => (
        <div className="site-button-styles" role="group" aria-label="Button style">
          {buttonStyleOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="site-button-style-tile"
              aria-pressed={(button.style ?? '') === option.value}
              onClick={() => {
                onChange({ ...button, style: option.value });
                onClose();
              }}
            >
              <span className={'site-button-style-sample is-' + (option.value || 'default')}>Aa</span>
              {option.label}
            </button>
          ))}
        </div>
      )}
    />
  );
}
