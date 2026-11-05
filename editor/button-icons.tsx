import { IconPicker } from '../core/editor/icons.js';
import { buttonIconStyle } from '../core/icons/button.js';
declare const wp: any;
export function registerButtonIcons(useSiteData: () => any) {
  wp.hooks.addFilter(
    'editor.BlockEdit',
    'site/button-icon-settings',
    (BlockEdit: any) => (props: any) => {
      const site = useSiteData();
      if (props.name !== 'core/button') return <BlockEdit {...props} />;
      const meta = props.attributes.metadata ?? {};
      const update = (changes: any) => props.setAttributes({ metadata: { ...meta, ...changes } });
      return (
        <>
          <BlockEdit {...props} />
          {props.isSelected && (
            <wp.blockEditor.InspectorControls>
              <wp.components.PanelBody title="Button icon" initialOpen>
                <IconPicker
                  library={site?.icons}
                  value={{ type: meta.siteButtonIcon ?? 'none' }}
                  allowImage={false}
                  onChange={(icon: any) =>
                    update({ siteButtonIcon: icon.type === 'none' ? undefined : icon.type })
                  }
                />
                {buttonIconStyle(meta, site?.icons) && (
                  <wp.components.SelectControl
                    label="Icon position"
                    value={meta.siteButtonIconPosition ?? 'after'}
                    options={[
                      { label: 'After text', value: 'after' },
                      { label: 'Before text', value: 'before' },
                    ]}
                    onChange={(position: string) => update({ siteButtonIconPosition: position })}
                  />
                )}
                <p className="site-menu-hint">The icon uses the button text color.</p>
              </wp.components.PanelBody>
            </wp.blockEditor.InspectorControls>
          )}
        </>
      );
    }
  );
  wp.hooks.addFilter(
    'editor.BlockListBlock',
    'site/button-icon-preview',
    (BlockListBlock: any) => (props: any) => {
      const site = useSiteData();
      if (props.name !== 'core/button') return <BlockListBlock {...props} />;
      const style = buttonIconStyle(props.attributes.metadata, site?.icons);
      const position =
        props.attributes.metadata?.siteButtonIconPosition === 'before' ? 'before' : 'after';
      return (
        <BlockListBlock
          {...props}
          className={[
            props.className,
            style ? 'site-button-preview-icon site-button-icon-' + position : '',
          ]
            .filter(Boolean)
            .join(' ')}
          wrapperProps={{
            ...props.wrapperProps,
            style: { ...props.wrapperProps?.style, ...style },
          }}
        />
      );
    }
  );
}
