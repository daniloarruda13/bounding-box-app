# Deploying Boxroom

Boxroom is a static browser app. It has no backend, database, build dependencies, or secrets to configure.

## GitHub Pages

The repository includes a workflow based on [GitHub's custom Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

1. Create a public GitHub repository and push this project to its `main` branch.
2. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
3. Open **Actions → GitHub Pages → Run workflow** if the initial push ran before Pages was enabled.
4. After deployment succeeds, use the URL shown in the deployment's `github-pages` environment.

The Pages workflow runs tests and syntax checks before packaging the four browser assets and deploying. Pull requests run the separate test workflow; they cannot deploy to Pages. No personal access token is stored in the repository.

All asset paths are relative, so the app works under a project path such as `/bounding-box-app/` as well as at a domain root. GitHub Pages serves over HTTPS, which allows clipboard access subject to browser permissions.

## Other static hosts

```sh
npm run build
```

Upload the contents of `_site/` to a static host. The entry point is `index.html`. Configure JavaScript files to be served with a JavaScript MIME type. Use HTTPS for clipboard support. No server-side route fallback is needed.

The Node server in `server.js` is intended for local previews. Production hosting only needs the static assets.

## Updating

Push changes to `main`; the Pages workflow tests and deploys the new version. Export in-progress annotations before refreshing, since editing state is held in memory.
