# Asset and screen budget

The production asset inventory is reviewed in CI and documented here for the few
intentional exceptions to the 150 KB PNG target:

| Asset | Approx. size | Justification |
| --- | ---: | --- |
| `assets/images/icon.png` | 799 KB | Android/iOS application icon source; retained at source resolution for platform adaptive-icon generation. |
| `assets/images/logo-glow.png` | 332 KB | Branded splash/hero artwork with alpha transparency; lossy conversion would create visible halos. |

The remaining production PNG assets are below 150 KB. These two source assets are not
downloaded by the web runtime as page content and are consumed during the native build.
The infrastructure workflow publishes reproducible build evidence, while the frontend
CI keeps the source inventory reviewable in pull requests.

The student dashboard remains a large route module because it currently coordinates
authentication, tracking, notifications, safe zones, QR linking, and responsive layout
in one protected route. Splitting it is tracked as a separate refactor so this release
does not change navigation or mobile behavior while closing the deployment evidence gap.
