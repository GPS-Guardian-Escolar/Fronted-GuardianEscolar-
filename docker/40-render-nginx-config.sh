#!/bin/sh
set -eu

: "${API_UPSTREAM:=http://backend:8080}"
: "${PUBLIC_SCHEME:=}"
: "${PUBLIC_PORT:=}"

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

envsubst '${API_UPSTREAM} ${PUBLIC_SCHEME} ${PUBLIC_PORT}' \
  < /opt/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

nginx -t
