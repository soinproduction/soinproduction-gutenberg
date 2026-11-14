import fs from "node:fs";
import path from "node:path";

const toTitle = (slug) =>
  slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export function createPostType(projectRoot, rawSlug, options = {}) {
  const slug = String(rawSlug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");
  if (!slug) {
    throw new Error("Usage: soinproduction-kit create post-type <slug> [--collection] [--block site/card-name]");
  }

  const isfrontendDir = path.basename(projectRoot) === "frontend";
  const themeRoot = isfrontendDir ? path.dirname(projectRoot) : projectRoot;
  const frontendRoot = isfrontendDir ? projectRoot : path.join(projectRoot, "frontend");

  const isCollection = Boolean(options.collection);
  const blockName = options.block || `site/${slug.replace(/_/g, "-")}-card`;
  const title = toTitle(slug);
  const pluralKey = slug.endsWith("s") ? slug : `${slug}s`;
  const rewriteSlug = pluralKey.replace(/_/g, "-");

  const targetDir = path.join(themeRoot, "inc", "post-types");
  fs.mkdirSync(targetDir, { recursive: true });
  const targetFile = path.join(targetDir, `${slug}.php`);

  if (fs.existsSync(targetFile) && !options.force) {
    throw new Error(`Post type file already exists: ${targetFile} (use --force to overwrite)`);
  }

  const phpContent = isCollection
    ? `<?php
namespace SiteTheme;
defined(\x27ABSPATH\x27) || exit;

add_action(\x27init\x27, function () {
\tregister_post_type(\x27${slug}\x27, [
\t\t\x27labels\x27        => [
\t\t\t\x27name\x27          => \x27${title}s\x27,
\t\t\t\x27singular_name\x27 => \x27${title}\x27,
\t\t],
\t\t\x27public\x27        => false,
\t\t\x27show_ui\x27       => true,
\t\t\x27show_in_rest\x27  => true,
\t\t\x27menu_icon\x27     => \x27dashicons-index-card\x27,
\t\t\x27supports\x27      => [\x27title\x27, \x27editor\x27, \x27page-attributes\x27, \x27custom-fields\x27],
\t\t\x27template\x27      => [[\x27${blockName}\x27, []]],
\t\t\x27template_lock\x27 => \x27all\x27,
\t]);
});

add_filter(\x27site_public_data\x27, function (array $data): array {
\t$data[\x27${pluralKey}\x27] = collection_records(\x27${slug}\x27);
\treturn $data;
});
`
    : `<?php
namespace SiteTheme;
defined(\x27ABSPATH\x27) || exit;

add_action(\x27init\x27, function () {
\tregister_post_type(\x27${slug}\x27, [
\t\t\x27labels\x27       => [
\t\t\t\x27name\x27          => \x27${title}s\x27,
\t\t\t\x27singular_name\x27 => \x27${title}\x27,
\t\t],
\t\t\x27public\x27       => true,
\t\t\x27has_archive\x27  => false,
\t\t\x27rewrite\x27      => [\x27slug\x27 => \x27${rewriteSlug}\x27, \x27with_front\x27 => false],
\t\t\x27show_in_rest\x27 => true,
\t\t\x27menu_icon\x27    => \x27dashicons-portfolio\x27,
\t\t\x27supports\x27     => [\x27title\x27, \x27editor\x27, \x27excerpt\x27, \x27thumbnail\x27, \x27page-attributes\x27, \x27custom-fields\x27],
\t]);
});

add_filter(\x27site_public_data\x27, function (array $data): array {
\t$data[\x27${pluralKey}\x27] = cards(\x27${slug}\x27);
\treturn $data;
});
`;

  fs.writeFileSync(targetFile, phpContent);

  // Register in frontend/kit.config.json -> postTypes
  const kitConfigPath = path.join(frontendRoot, "kit.config.json");
  if (fs.existsSync(kitConfigPath)) {
    const config = JSON.parse(fs.readFileSync(kitConfigPath, "utf8"));
    const postTypes = new Set(Array.isArray(config.postTypes) ? config.postTypes : []);
    postTypes.add(slug);
    config.postTypes = [...postTypes];
    fs.writeFileSync(kitConfigPath, JSON.stringify(config, null, 2) + "\n");
  }

  // Register in inc/bootstrap.php if present
  const bootstrapPath = path.join(themeRoot, "inc", "bootstrap.php");
  const relPath = `post-types/${slug}.php`;
  if (fs.existsSync(bootstrapPath)) {
    const boot = fs.readFileSync(bootstrapPath, "utf8");
    if (!boot.includes(relPath)) {
      const updated = boot.replace(
        /(\[\s*(?:\x27[^\x27]+\x27\s*,?\s*)+)(\])/,
        `$1\n\t\x27${relPath}\x27,\n$2`
      );
      if (updated !== boot) {
        fs.writeFileSync(bootstrapPath, updated);
      }
    }
  }

  return { slug, file: targetFile, isCollection, pluralKey, blockName };
}
