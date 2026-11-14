import fs from "node:fs";
import path from "node:path";
import { prepareProject } from "./prepare-project.mjs";

const writeIfMissing = (filePath, content, force = false) => {
  if (fs.existsSync(filePath) && !force) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return true;
};

export function initTheme(projectRoot, options = {}) {
  const isFrontendDir = path.basename(projectRoot) === "frontend";
  const themeRoot = isFrontendDir ? path.dirname(projectRoot) : projectRoot;
  const frontendRoot = isFrontendDir ? projectRoot : path.join(projectRoot, "frontend");
  const force = Boolean(options.force);
  const themeSlug = path.basename(themeRoot);
  const created = [];

  if (
    writeIfMissing(
      path.join(themeRoot, "style.css"),
      `/*
Theme Name: ${themeSlug}
Text Domain: ${themeSlug}
Version: 1.0.0
*/
`,
      force
    )
  ) {
    created.push("style.css");
  }

  if (
    writeIfMissing(
      path.join(themeRoot, "index.php"),
      `<?php
defined(\x27ABSPATH\x27) || exit;
`,
      force
    )
  ) {
    created.push("index.php");
  }

  if (
    writeIfMissing(
      path.join(themeRoot, "functions.php"),
      `<?php
defined(\x27ABSPATH\x27) || exit;
require_once __DIR__ . \x27/inc/bootstrap.php\x27;
`,
      force
    )
  ) {
    created.push("functions.php");
  }

  if (
    writeIfMissing(
      path.join(themeRoot, "render.config.json"),
      JSON.stringify({ mode: "php", revalidateSeconds: 300 }, null, 2) + "\n",
      force
    )
  ) {
    created.push("render.config.json");
  }

  if (
    writeIfMissing(
      path.join(themeRoot, "inc/bootstrap.php"),
      `<?php
namespace SiteTheme;
defined(\x27ABSPATH\x27) || exit;

foreach ([
\t\x27post-types/site.php\x27,
] as $file) {
\t$path = __DIR__ . \x27/\x27 . $file;
\tif (is_readable($path)) {
\t\trequire_once $path;
\t}
}

require_once dirname(__DIR__) . \x27/frontend/kit/bootstrap.php\x27;
`,
      force
    )
  ) {
    created.push("inc/bootstrap.php");
  }

  if (
    writeIfMissing(
      path.join(themeRoot, "inc/post-types/site.php"),
      `<?php
namespace SiteTheme;
defined(\x27ABSPATH\x27) || exit;

// Регистрируй кастомные Post Types темы здесь или через:
// npx soinproduction-kit create post-type <slug>
// Полный пример с паттернами и связями: inc/post-types/example.php
`,
      force
    )
  ) {
    created.push("inc/post-types/site.php");
  }

  const exampleSrc = path.join(frontendRoot, "kit/wordpress/examples/post-type.example.php");
  const fallbackExampleSrc = path.resolve(new URL("../wordpress/examples/post-type.example.php", import.meta.url).pathname);
  const exampleContent = fs.existsSync(exampleSrc)
    ? fs.readFileSync(exampleSrc, "utf8")
    : fs.existsSync(fallbackExampleSrc)
      ? fs.readFileSync(fallbackExampleSrc, "utf8")
      : "";
  if (exampleContent && writeIfMissing(path.join(themeRoot, "inc/post-types/example.php"), exampleContent, force)) {
    created.push("inc/post-types/example.php");
  }

  if (
    writeIfMissing(
      path.join(frontendRoot, "kit.config.json"),
      JSON.stringify(
        {
          modules: {
            adminUi: true,
            icons: true,
            webpUploads: true,
            forms: true,
            modals: true,
            booking: false,
            collections: true,
            siteParts: true,
            archives: true,
            seo: true
          },
          postTypes: [],
          booking: {
            timezone: "Europe/Kyiv",
            timezoneLabel: "Київ",
            phoneCode: "380",
            phoneDigits: 9
          },
          forms: {
            postType: "site_form",
            entryType: "site_entry",
            block: "site/form-builder",
            modalType: "site_modal"
          }
        },
        null,
        2
      ) + "\n",
      force
    )
  ) {
    created.push("frontend/kit.config.json");
  }

  if (
    writeIfMissing(
      path.join(frontendRoot, "config/breakpoints.json"),
      JSON.stringify(
        {
          desktop: 1440,
          laptop: 1200,
          tablet: 991,
          mobile: 479
        },
        null,
        2
      ) + "\n",
      force
    )
  ) {
    created.push("frontend/config/breakpoints.json");
  }

  const prepared = prepareProject(frontendRoot, { force: true });
  return { themeRoot, frontendRoot, created, prepared };
}
