import { IconPicker } from '../core/editor/icons.js';
import { Icon } from '../core/icons/icon.js';
import { listIconStyle } from '../core/icons/list.js';
declare const wp: any;
const classes: Record<string, string> = { 'core/list': 'site-icon-list', 'core/list-item': 'site-icon-item' };
export function registerListIcons(useSiteData: () => any) {
  wp.hooks.addFilter(
    'editor.BlockEdit',
    'site/list-icon-settings',
    (BlockEdit: any) => (props: any) => {
      const site = useSiteData();
      if (!classes[props.name]) return <BlockEdit {...props} />;
      const { Dropdown, ToolbarButton, ToolbarGroup } = wp.components;
      const meta = props.attributes.metadata ?? {};
      return (
        <>
          <BlockEdit {...props} />
          {props.isSelected && (
            <wp.blockEditor.BlockControls group="block">
              <ToolbarGroup>
                <Dropdown
                  popoverProps={{ placement: 'bottom-start' }}
                  renderToggle={({ isOpen, onToggle }: any) => (
                    <ToolbarButton
                      icon={
                        meta.siteListIcon ? (
                          <span className="site-list-icon-toggle">
                            <Icon icon={{ type: meta.siteListIcon }} library={site?.icons} />
                          </span>
                        ) : (
                          'star-empty'
                        )
                      }
                      label={props.name === 'core/list' ? 'List icon' : 'Item icon'}
                      aria-expanded={isOpen}
                      onClick={onToggle}
                    />
                  )}
                  renderContent={() => (
                    <div className="site-list-icon-picker">
                      <IconPicker
                        library={site?.icons}
                        allowImage={false}
                        value={{ type: meta.siteListIcon ?? 'none' }}
                        onChange={(icon: any) =>
                          props.setAttributes({
                            metadata: { ...meta, siteListIcon: icon.type === 'none' ? undefined : icon.type },
                          })
                        }
                      />
                    </div>
                  )}
                />
              </ToolbarGroup>
            </wp.blockEditor.BlockControls>
          )}
        </>
      );
    }
  );
  wp.hooks.addFilter(
    'editor.BlockListBlock',
    'site/list-icon-preview',
    (BlockListBlock: any) => (props: any) => {
      const site = useSiteData();
      if (!classes[props.name]) return <BlockListBlock {...props} />;
      const style = listIconStyle(props.attributes.metadata, site?.icons);
      if (!style) return <BlockListBlock {...props} />;
      return (
        <BlockListBlock
          {...props}
          className={[props.className, classes[props.name]].filter(Boolean).join(' ')}
          wrapperProps={{ ...props.wrapperProps, style: { ...props.wrapperProps?.style, ...style } }}
        />
      );
    }
  );
}
