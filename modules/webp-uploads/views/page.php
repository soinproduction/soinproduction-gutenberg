<?php
defined('ABSPATH') || exit;
$cfg   = $this->cfg();
                ?>
                <div class="wrap sp-webp-admin sp-admin-page"><h1 class="screen-reader-text">Uploads WebP</h1>
                    <header class="sp-webp-admin__header sp-admin-header">
                        <div class="sp-webp-admin__logo sp-admin-header__identity">
							<span class="sp-webp-admin__logo-icon sp-admin-header__icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="none" viewBox="0 0 24 24">
                                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m14.3 16-1.7-1.7q-1-1.1-1.7-1.4H9.7q-.6.2-1.7 1.4l-4 4m10.3-2.4.3-.3q1-1.2 1.7-1.3h1.2q.6.1 1.7 1.4l.8.8m-5.7-.6 4 4m0 0-1.5.1H7.2q-1.6 0-2.1-.2a1.8 1.8 0 0 1-1-1.5M18.2 20a2 2 0 0 0 1.5-1q.3-.6.2-2.2v-.3M12.5 4H7.2q-1.6 0-2.1.2a2 2 0 0 0-.9.9Q4 5.6 4 7.2v11.1m16-6.8v5M14 10l2-.4h.4l.2-.2.2-.2L21 5a1.4 1.4 0 0 0-2-2l-4.2 4.2-.2.2-.1.2-.1.4z"/>
                                </svg>
                            </span>
							<div class="sp-admin-header__copy">
								<span class="sp-webp-kicker">ASSETS / OPTIMIZATION</span><h2>Uploads WebP</h2>
								<p>Convert Media Library images to WebP and safely replace stored URLs.</p>
							</div>
                        </div>
                        <div class="sp-webp-admin__actions sp-admin-header__actions">
                            <button type="button" class="sp-webp-btn sp-webp-btn--ghost" id="sp-webp-scan">Scan media</button>
                            <button type="button" class="sp-webp-btn sp-webp-btn--primary" id="sp-webp-start">Start bulk convert</button>
                            <button type="button" class="sp-webp-btn" id="sp-webp-stop" disabled>Stop</button>
                            <button type="button" class="sp-webp-btn" id="sp-webp-reset-progress">Reset progress</button>
                            <button type="button" class="sp-webp-btn sp-webp-btn--primary" id="sp-webp-save">Save settings</button>
                            <span class="sp-webp-saved" id="sp-webp-saved">Saved</span>
                        </div>
                    </header>

                    <div class="sp-webp-admin__body">
                        <aside class="sp-webp-sidebar">
                            <div class="sp-webp-panel sp-admin-card">
                                <div class="sp-admin-card__header"><h2>Conversion settings</h2></div>

                                <div class="sp-webp-field">
                                    <div class="sp-webp-toggle-row">
                                        <span class="sp-webp-label" style="margin:0">Enable on upload</span>
                                        <label class="sp-webp-ios-toggle">
                                            <input type="checkbox" id="cfg-enabled-upload" <?php checked( ! empty( $cfg['enabled_upload'] ) ); ?>>
                                            <span class="sp-webp-ios-track"><span class="sp-webp-ios-thumb"></span></span>
                                        </label>
                                    </div>
                                    <p class="sp-webp-hint">Automatic conversion for newly uploaded images.</p>
                                </div>

                                <div class="sp-webp-field sp-webp-field--range">
                                    <div class="sp-webp-range-header">
                                        <label class="sp-webp-label">Quality</label>
                                        <span class="sp-webp-range-val" id="cfg-quality-v"><?php echo (int) $cfg['quality']; ?></span>
                                    </div>
                                    <input type="range" id="cfg-quality" class="sp-webp-range" min="60" max="100" value="<?php echo (int) $cfg['quality']; ?>" oninput="document.getElementById('cfg-quality-v').textContent=this.value">
                                    <p class="sp-webp-hint">90 by default: high quality with good compression.</p>
                                </div>

                                <div class="sp-webp-field sp-webp-field--range">
                                    <div class="sp-webp-range-header">
                                        <label class="sp-webp-label">Max side (px)</label>
                                        <span class="sp-webp-range-val" id="cfg-max-side-v"><?php echo (int) $cfg['max_side']; ?>px</span>
                                    </div>
                                    <input type="range" id="cfg-max-side" class="sp-webp-range" min="320" max="8000" step="10" value="<?php echo (int) $cfg['max_side']; ?>" oninput="document.getElementById('cfg-max-side-v').textContent=this.value+'px'">
                                    <p class="sp-webp-hint">Large images are resized proportionally before conversion.</p>
                                </div>

                                <div class="sp-webp-field">
                                    <div class="sp-webp-toggle-row">
                                        <span class="sp-webp-label" style="margin:0">Delete original source file</span>
                                        <label class="sp-webp-ios-toggle">
                                            <input type="checkbox" id="cfg-delete-original" <?php checked( ! empty( $cfg['delete_original'] ) ); ?>>
                                            <span class="sp-webp-ios-track"><span class="sp-webp-ios-thumb"></span></span>
                                        </label>
                                    </div>
                                    <p class="sp-webp-hint">Recommended for minimum disk usage.</p>
                                </div>

                                <div class="sp-webp-field">
                                    <div class="sp-webp-toggle-row">
                                        <span class="sp-webp-label" style="margin:0">Skip animated GIF</span>
                                        <label class="sp-webp-ios-toggle">
                                            <input type="checkbox" id="cfg-skip-animated" <?php checked( ! empty( $cfg['skip_animated_gif'] ) ); ?>>
                                            <span class="sp-webp-ios-track"><span class="sp-webp-ios-thumb"></span></span>
                                        </label>
                                    </div>
                                    <p class="sp-webp-hint">Prevents losing animation unexpectedly.</p>
                                </div>

                                <div class="sp-webp-field">
                                    <label class="sp-webp-label">Batch size</label>
                                    <input type="number" id="cfg-batch-size" class="sp-webp-input" min="1" max="100" value="<?php echo (int) $cfg['batch_size']; ?>">
                                    <p class="sp-webp-hint">Number of attachments processed per request.</p>
                                </div>

                            </div>

                            <div class="sp-webp-panel sp-webp-panel--usage sp-admin-card">
                                <div class="sp-admin-card__header"><h2>Safety notes</h2></div>
                                <p class="sp-webp-hint">Run bulk conversion on staging first when possible.</p>
                                <p class="sp-webp-hint">If old image URLs are hardcoded, convert in small batches and verify pages.</p>
                                <p class="sp-webp-hint">For max disk savings keep "Delete original source file" enabled.</p>
                            </div>
                        </aside>

                        <main class="sp-webp-main">
                            <div class="sp-webp-panel">
                                <div class="sp-admin-card__header"><h2>Bulk conversion status</h2></div>
                                <div class="sp-webp-stats">
                                    <div class="sp-webp-stat"><div class="sp-webp-stat__label">Total in queue</div><div class="sp-webp-stat__value" id="spc-total">0</div></div>
                                    <div class="sp-webp-stat"><div class="sp-webp-stat__label">Converted</div><div class="sp-webp-stat__value" id="spc-converted">0</div></div>
                                    <div class="sp-webp-stat"><div class="sp-webp-stat__label">Skipped</div><div class="sp-webp-stat__value" id="spc-skipped">0</div></div>
                                    <div class="sp-webp-stat"><div class="sp-webp-stat__label">Errors</div><div class="sp-webp-stat__value" id="spc-errors">0</div></div>
                                    <div class="sp-webp-stat"><div class="sp-webp-stat__label">Saved</div><div class="sp-webp-stat__value" id="spc-saved-size">0 B</div></div>
                                </div>

                                <div class="sp-webp-progress-wrap">
                                    <div class="sp-webp-progress"><span id="spc-progress-bar"></span></div>
                                    <div class="sp-webp-progress-meta">
                                        <span id="spc-progress-text">0%</span>
                                        <span id="spc-status">Click "Scan media" to start.</span>
                                    </div>
                                </div>

                                <div class="sp-webp-log" id="sp-webp-log"></div>
                            </div>

                            <div class="sp-webp-panel" style="margin-top:16px;">
                                <div class="sp-admin-card__header">
									<h2>Database URL replacement (Gutenberg + fields)</h2>
									<div class="sp-admin-card__actions">
										<button type="button" class="sp-webp-btn sp-webp-btn--primary" id="sp-webp-replace-all">Replace all URLs to WebP</button>
									</div>
								</div>
                                <div class="sp-webp-progress-meta" style="margin-bottom:10px;">
                                    <span id="spr-progress-text">0%</span>
                                    <span id="spr-status">Click to replace old image URLs with WebP URLs.</span>
                                </div>
                                <div class="sp-webp-progress" style="margin-bottom:12px;"><span id="spr-progress-bar"></span></div>

                                <div class="sp-webp-stats" >
                                    <div class="sp-webp-stat"><div class="sp-webp-stat__label">Rows scanned</div><div class="sp-webp-stat__value" id="spr-processed">0</div></div>
                                    <div class="sp-webp-stat"><div class="sp-webp-stat__label">Rows changed</div><div class="sp-webp-stat__value" id="spr-changed">0</div></div>
                                    <div class="sp-webp-stat"><div class="sp-webp-stat__label">URL hits</div><div class="sp-webp-stat__value" id="spr-hits">0</div></div>
                                    <div class="sp-webp-stat"><div class="sp-webp-stat__label">Map size</div><div class="sp-webp-stat__value" id="spr-map">0</div></div>
                                </div>

                                <div class="sp-webp-log" id="sp-webp-replace-log" style="height:220px;"></div>
                            </div>

                            <div class="sp-webp-panel" style="margin-top:16px;">
                                <div class="sp-admin-card__header">
									<h2>Unused Images Finder</h2>
									<div class="sp-webp-unused-actions sp-admin-card__actions">
										<button type="button" class="sp-webp-btn sp-webp-btn--primary" id="sp-webp-unused-scan">Scan unused images</button>
										<button type="button" class="sp-webp-btn sp-webp-btn--danger" id="sp-webp-unused-delete-selected" disabled>Delete selected</button>
										<button type="button" class="sp-webp-btn sp-webp-btn--danger" id="sp-webp-unused-delete-all" disabled>Delete all found</button>
										<button type="button" class="sp-webp-btn" id="sp-webp-unused-clear">Clear results</button>
									</div>
								</div>
                                <div class="sp-webp-progress-meta" style="margin-bottom:10px;">
                                    <span id="spu-progress-text">0%</span>
                                    <span id="spu-status">Scan the media library and check the database before deleting.</span>
                                </div>
                                <div class="sp-webp-progress" style="margin-bottom:12px;"><span id="spu-progress-bar"></span></div>

                                <div class="sp-webp-stats" >
                                    <div class="sp-webp-stat"><div class="sp-webp-stat__label">Images scanned</div><div class="sp-webp-stat__value" id="spu-processed">0</div></div>
                                    <div class="sp-webp-stat"><div class="sp-webp-stat__label">Unused found</div><div class="sp-webp-stat__value" id="spu-unused">0</div></div>
                                    <div class="sp-webp-stat"><div class="sp-webp-stat__label">Used / kept</div><div class="sp-webp-stat__value" id="spu-used">0</div></div>
                                    <div class="sp-webp-stat"><div class="sp-webp-stat__label">Errors</div><div class="sp-webp-stat__value" id="spu-errors">0</div></div>
                                    <div class="sp-webp-stat"><div class="sp-webp-stat__label">Custom tables</div><div class="sp-webp-stat__value" id="spu-custom-tables">0</div></div>
                                </div>

                                <p class="sp-webp-hint">The scan is strict: it keeps parented, pathless, missing, uncertain, or referenced attachments; checks ID/path/URL/encoded variants across core and custom DB text columns; scans static theme/plugin/uploads text files; and repeats the usage check immediately before delete.</p>

                                <div class="sp-webp-unused-table-wrap">
                                    <table class="sp-webp-unused-table">
                                        <thead>
                                        <tr>
                                            <th class="sp-webp-unused-table__check"><input type="checkbox" id="sp-webp-unused-select-all" disabled></th>
                                            <th>Preview</th>
                                            <th>Attachment</th>
                                            <th>Why considered unused</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                        </thead>
                                        <tbody id="sp-webp-unused-body">
                                        <tr class="sp-webp-unused-empty">
                                            <td colspan="6">No unused images found yet.</td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div class="sp-webp-log" id="sp-webp-unused-log" style="height:220px;margin-top:12px;"></div>
                            </div>
                        </main>
                    </div>
                </div>

                

                
                <?php
