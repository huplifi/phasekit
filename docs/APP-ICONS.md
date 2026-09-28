# Stable install icon, 0.2.1

This patch copies the approved stable SVG and its 192/512 px PNGs from beta
revision `ea7641b899fff13ff5e04326c72d0d73510895b2`. It does not promote beta
features or change browser storage. The stable mark has no BETA badge.

Source: `design/icons/app-icon.svg`. The snowflake/wrench is centred on the
2000 px canvas with original wave geometry and clearer tonal separation:
mark #245873, waves #B8DCE8, background #EAF7FA. PNGs are opaque Sharp 0.35.x
exports resized to the filename's square dimensions. Native corner masks are
not baked in.

The stable manifest and Apple touch metadata reference versioned v3 filenames.
Previous icons remain available. Beta-preview builds retain their existing beta
identity; stable production uses the new non-beta icon. The production hostname
must be verified after deployment, independently of the preview channel.

The web app supplies a bitmap, not native layered Dark/Clear/Tinted assets.
iOS controls those treatments and can retain an installed Home Screen icon after
an app update. Physical iPhone appearance remains a device check. Do not clear
website data to refresh an icon: saved reports belong to browser storage.
