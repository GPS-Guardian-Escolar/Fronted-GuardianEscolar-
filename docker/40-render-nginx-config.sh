#!/bin/sh
set -eu

: "${API_UPSTREAM:=http://backend:8080}"
: "${PUBLIC_SCHEME:=}"
: "${PUBLIC_PORT:=}"
: "${ANDROID_APP_SHA256_CERT_FINGERPRINT:=}"

# Render terminates TLS before the container and exposes the public URL at
# runtime. Local Docker remains HTTP unless the deployment explicitly opts in.
if [ -z "$PUBLIC_SCHEME" ]; then
    case "${RENDER_EXTERNAL_URL:-}" in
        https://*) PUBLIC_SCHEME=https ;;
        http://*) PUBLIC_SCHEME=http ;;
        *) PUBLIC_SCHEME=http ;;
    esac
fi

if [ -z "$PUBLIC_PORT" ]; then
    if [ "$PUBLIC_SCHEME" = "https" ]; then
        PUBLIC_PORT=443
    else
        PUBLIC_PORT=80
    fi
fi

case "$PUBLIC_SCHEME" in
    http|https) ;;
    *) echo "PUBLIC_SCHEME must be http or https" >&2; exit 1 ;;
esac

case "$PUBLIC_PORT" in
    *[!0-9]*|'') echo "PUBLIC_PORT must be numeric" >&2; exit 1 ;;
esac

export API_UPSTREAM
export PUBLIC_SCHEME PUBLIC_PORT

# Publish Android App Links association only when the release signing
# fingerprint is configured. The certificate fingerprint is public metadata,
# but it must match the key used to sign the installed Android app.
if [ -n "$ANDROID_APP_SHA256_CERT_FINGERPRINT" ]; then
    fingerprint=$(printf '%s' "$ANDROID_APP_SHA256_CERT_FINGERPRINT" | tr 'a-f' 'A-F')
    compact_fingerprint=$(printf '%s' "$fingerprint" | tr -d ':')
    if [ "${#fingerprint}" -ne 95 ] || [ "${#compact_fingerprint}" -ne 64 ] \
        || ! printf '%s' "$fingerprint" | grep -Eq '^[0-9A-F]{2}(:[0-9A-F]{2}){31}$'; then
        echo "ANDROID_APP_SHA256_CERT_FINGERPRINT must be a colon-separated SHA-256 fingerprint" >&2
        exit 1
    fi
    mkdir -p /usr/share/nginx/html/.well-known
    printf '[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"com.guardianescolar.app","sha256_cert_fingerprints":["%s"]}}]\n' \
        "$fingerprint" > /usr/share/nginx/html/.well-known/assetlinks.json
else
    echo "Android App Links are not verified: set ANDROID_APP_SHA256_CERT_FINGERPRINT to the installed app signing fingerprint." >&2
fi

envsubst '${API_UPSTREAM} ${PUBLIC_SCHEME} ${PUBLIC_PORT}' \
  < /opt/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

nginx -t
