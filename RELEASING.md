# Publishing

Package: `soinproduction-gutenberg`.
Repository: `soinproduction/soinproduction-gutenberg`.
Workflow: `.github/workflows/publish.yml`.

## One-time npm account setup

1. Sign in with the owning npm account and publish the initial checked version with `npm publish --access public` (npm may request account verification/2FA).
2. Open the package's Settings → Trusted publishing → GitHub Actions.
3. Set organization/user `soinproduction`, repository `soinproduction-gutenberg`, workflow filename `publish.yml`; leave environment blank. Allow `npm publish`.
4. Run the **Publish npm package** workflow for the next version or push its matching version tag.

The workflow uses GitHub OIDC with `id-token: write`. No persistent `NPM_TOKEN` secret is required. npm requires a recent npm CLI and Node; the workflow uses Node 24. Public GitHub builds receive npm provenance automatically.

The first successful trusted-publisher publish must occur within npm's activation window after the connection is created. Do not create the connection long before a release is ready.

## Subsequent releases

```sh
npm version patch
 git push origin main --follow-tags
```

`npm version minor` and `npm version major` are available for larger changes. The tag must match the package version exactly. CI publishes only after checks and a build succeed. A manual workflow dispatch is also available on `main`, for the checked-in version. Publishing an already-published version fails; bump the version first.

Do not commit `.npmrc`, environment credentials or consumer-generated connection files.
