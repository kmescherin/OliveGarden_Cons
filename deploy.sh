#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="olivegarden"
NETWORK_NAME="olivegarden"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SUPABASE_DIR="$SCRIPT_DIR/deploy/supabase"
MIGRATIONS_DIR="$SCRIPT_DIR/supabase/migrations"
WEB_DIR="$SCRIPT_DIR/apps/web"
SSL_DIR="$SCRIPT_DIR/deploy/nginx/ssl"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { printf "${CYAN}[INFO]${NC}  %s\n" "$*"; }
ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$*"; }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }
err()   { printf "${RED}[ERROR]${NC} %s\n" "$*" >&2; }
step()  { printf "\n${BOLD}==>%s<==${NC}\n" "$*"; }

check_prerequisites() {
    step "Checking prerequisites"
    local missing=()
    for cmd in docker openssl curl; do
        if ! command -v "$cmd" &>/dev/null; then
            missing+=("$cmd")
        fi
    done
    if ! docker compose version &>/dev/null && ! docker-compose version &>/dev/null; then
        missing+=("docker-compose (plugin or standalone)")
    fi
    if [ ${#missing[@]} -gt 0 ]; then
        err "Missing: ${missing[*]}"
        exit 1
    fi
    ok "All prerequisites met"
}

collect_config() {
    step "Configuration"
    if [ -f "$SUPABASE_DIR/.env" ]; then
        warn "Existing deploy/supabase/.env found"
        read -rp "       Re-use existing configuration? [Y/n] " reuse
        if [[ "${reuse,,}" != "n" ]]; then
            REUSE_ENV=true
            DOMAIN=$(grep -E '^API_EXTERNAL_URL=' "$SUPABASE_DIR/.env" | sed 's|.*://||' | sed 's|:.*||' | sed 's|/.*||')
            return
        fi
    fi
    REUSE_ENV=false

    read -rp "       Domain (e.g. olivegarden.example.com) or 'localhost': " DOMAIN
    DOMAIN="${DOMAIN:-localhost}"

    if [ "$DOMAIN" = "localhost" ]; then
        PROTOCOL="http"
        PUBLIC_URL="http://localhost"
        SSL_TYPE="selfsigned"
    else
        PROTOCOL="https"
        PUBLIC_URL="https://$DOMAIN"
        read -rp "       SSL: 'letsencrypt' or 'selfsigned'? [letsencrypt] " SSL_TYPE
        SSL_TYPE="${SSL_TYPE:-letsencrypt}"
    fi

    read -rp "       Site URL [$PUBLIC_URL]: " SITE_URL
    SITE_URL="${SITE_URL:-$PUBLIC_URL}"

    read -rp "       Admin email for first account: " ADMIN_EMAIL
    read -rp "       SMTP host (leave blank to skip email): " SMTP_HOST_INPUT

    if [ -n "$SMTP_HOST_INPUT" ]; then
        read -rp "       SMTP port [587]: " SMTP_PORT_INPUT
        SMTP_PORT_INPUT="${SMTP_PORT_INPUT:-587}"
        read -rp "       SMTP user: " SMTP_USER_INPUT
        read -rsp "       SMTP password: " SMTP_PASS_INPUT
        echo
        read -rp "       SMTP from address [noreply@$DOMAIN]: " SMTP_FROM_INPUT
        SMTP_FROM_INPUT="${SMTP_FROM_INPUT:-noreply@$DOMAIN}"
    fi
}

gen_hex()   { openssl rand -hex "$1"; }
gen_base64() { openssl rand -base64 "$1"; }

base64_url_encode() {
    openssl enc -base64 -A | tr '+/' '-_' | tr -d '='
}

gen_token() {
    local payload="$1"
    local payload_base64 header_base64 signed_content signature
    payload_base64=$(printf '%s' "$payload" | base64_url_encode)
    header_base64=$(printf '%s' "$header" | base64_url_encode)
    signed_content="${header_base64}.${payload_base64}"
    signature=$(printf '%s' "$signed_content" | openssl dgst -binary -sha256 -hmac "$jwt_secret" | base64_url_encode)
    printf '%s' "${signed_content}.${signature}"
}

generate_secrets() {
    step "Generating secrets"
    jwt_secret="$(gen_base64 30)"
    header='{"alg":"HS256","typ":"JWT"}'
    local iat exp
    iat=$(date +%s)
    exp=$((iat + 5 * 3600 * 24 * 365))
    local anon_payload="{\"role\":\"anon\",\"iss\":\"supabase\",\"iat\":$iat,\"exp\":$exp}"
    local service_payload="{\"role\":\"service_role\",\"iss\":\"supabase\",\"iat\":$iat,\"exp\":$exp}"
    ANON_KEY=$(gen_token "$anon_payload")
    SERVICE_ROLE_KEY=$(gen_token "$service_payload")
    POSTGRES_PASSWORD=$(gen_hex 16)
    DASHBOARD_PASSWORD=$(gen_hex 16)
    SECRET_KEY_BASE=$(gen_base64 48)
    VAULT_ENC_KEY=$(gen_hex 16)
    PG_META_CRYPTO_KEY=$(gen_base64 24)
    LOGFLARE_PUBLIC=$(gen_base64 24)
    LOGFLARE_PRIVATE=$(gen_base64 24)
    S3_ACCESS_KEY=$(gen_hex 16)
    S3_SECRET_KEY=$(gen_hex 32)
    POOLER_TENANT_ID=$(gen_hex 8)
    ok "Secrets generated"
}

write_supabase_env() {
    step "Writing Supabase environment"
    cp "$SUPABASE_DIR/.env.example" "$SUPABASE_DIR/.env"
    local env_file="$SUPABASE_DIR/.env"
    sed -i \
        -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" \
        -e "s|^JWT_SECRET=.*|JWT_SECRET=${jwt_secret}|" \
        -e "s|^ANON_KEY=.*|ANON_KEY=${ANON_KEY}|" \
        -e "s|^SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}|" \
        -e "s|^DASHBOARD_PASSWORD=.*|DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}|" \
        -e "s|^SECRET_KEY_BASE=.*|SECRET_KEY_BASE=${SECRET_KEY_BASE}|" \
        -e "s|^VAULT_ENC_KEY=.*|VAULT_ENC_KEY=${VAULT_ENC_KEY}|" \
        -e "s|^PG_META_CRYPTO_KEY=.*|PG_META_CRYPTO_KEY=${PG_META_CRYPTO_KEY}|" \
        -e "s|^LOGFLARE_PUBLIC_ACCESS_TOKEN=.*|LOGFLARE_PUBLIC_ACCESS_TOKEN=${LOGFLARE_PUBLIC}|" \
        -e "s|^LOGFLARE_PRIVATE_ACCESS_TOKEN=.*|LOGFLARE_PRIVATE_ACCESS_TOKEN=${LOGFLARE_PRIVATE}|" \
        -e "s|^S3_PROTOCOL_ACCESS_KEY_ID=.*|S3_PROTOCOL_ACCESS_KEY_ID=${S3_ACCESS_KEY}|" \
        -e "s|^S3_PROTOCOL_ACCESS_KEY_SECRET=.*|S3_PROTOCOL_ACCESS_KEY_SECRET=${S3_SECRET_KEY}|" \
        -e "s|^POOLER_TENANT_ID=.*|POOLER_TENANT_ID=${POOLER_TENANT_ID}|" \
        "$env_file"
    if [ "$DOMAIN" = "localhost" ]; then
        sed -i \
            -e "s|^SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=http://localhost:8000|" \
            -e "s|^API_EXTERNAL_URL=.*|API_EXTERNAL_URL=http://localhost:8000|" \
            -e "s|^SITE_URL=.*|SITE_URL=http://localhost:3000|" \
            "$env_file"
    else
        sed -i \
            -e "s|^SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=https://${DOMAIN}|" \
            -e "s|^API_EXTERNAL_URL=.*|API_EXTERNAL_URL=https://${DOMAIN}|" \
            -e "s|^SITE_URL=.*|SITE_URL=${SITE_URL}|" \
            -e "s|^ADDITIONAL_REDIRECT_URLS=.*|ADDITIONAL_REDIRECT_URLS=${SITE_URL}/*|" \
            "$env_file"
    fi
    ok "Supabase .env written"
}

write_web_env() {
    step "Writing web app environment"
    local env_file="$WEB_DIR/.env"
    if [ "$DOMAIN" = "localhost" ]; then
        cat > "$env_file" <<ENV
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
ENV
    else
        cat > "$env_file" <<ENV
NEXT_PUBLIC_SITE_URL=${SITE_URL}
NEXT_PUBLIC_SUPABASE_URL=https://${DOMAIN}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
ENV
    fi
    if [ -n "${SMTP_HOST_INPUT:-}" ]; then
        cat >> "$env_file" <<ENV
SMTP_HOST=${SMTP_HOST_INPUT}
SMTP_PORT=${SMTP_PORT_INPUT}
SMTP_USER=${SMTP_USER_INPUT}
SMTP_PASS=${SMTP_PASS_INPUT}
SMTP_FROM=${SMTP_FROM_INPUT}
ENV
    fi
    if [ -n "${VAPID_PUBLIC:-}" ]; then
        cat >> "$env_file" <<ENV
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${VAPID_PUBLIC}
VAPID_PRIVATE_KEY=${VAPID_PRIVATE}
ENV
    fi
    ok "Web app .env written"
}

generate_vapid_keys() {
    step "Generating VAPID keys for Web Push"
    if node -e "const w=require('web-push');w.setVapidDetails('mailto:noreply@${DOMAIN}','test','test')" 2>/dev/null; then
        eval "$(node -e "const w=require('web-push');const k=w.generateVAPIDKeys();console.log('VAPID_PUBLIC='+k.publicKey);console.log('VAPID_PRIVATE='+k.privateKey)" 2>/dev/null)"
        ok "VAPID keys generated"
    else
        warn "web-push not available locally, will generate during build"
        VAPID_PUBLIC=""
        VAPID_PRIVATE=""
    fi
}

generate_ssl() {
    step "SSL certificates"
    mkdir -p "$SSL_DIR"
    if [ "$SSL_TYPE" = "selfsigned" ]; then
        openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
            -keyout "$SSL_DIR/key.pem" \
            -out "$SSL_DIR/cert.pem" \
            -subj "/CN=${DOMAIN}" \
            -addext "subjectAltName=DNS:${DOMAIN},DNS:www.${DOMAIN},IP:127.0.0.1" 2>/dev/null
        ok "Self-signed certificate generated (10 year validity)"
    elif [ "$SSL_TYPE" = "letsencrypt" ]; then
        if ! command -v certbot &>/dev/null; then
            err "certbot not installed. Install it: apt install certbot"
            err "Then run: certbot certonly --standalone -d $DOMAIN"
            err "And copy certs to deploy/nginx/ssl/"
            warn "Generating self-signed cert as placeholder"
            openssl req -x509 -nodes -days 30 -newkey rsa:2048 \
                -keyout "$SSL_DIR/key.pem" \
                -out "$SSL_DIR/cert.pem" \
                -subj "/CN=${DOMAIN}" 2>/dev/null
        else
            certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos -m "admin@${DOMAIN}" || true
            if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
                cp "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" "$SSL_DIR/cert.pem"
                cp "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" "$SSL_DIR/key.pem"
                ok "Let's Encrypt certificate installed"
            else
                warn "Let's Encrypt failed, using self-signed"
                openssl req -x509 -nodes -days 30 -newkey rsa:2048 \
                    -keyout "$SSL_DIR/key.pem" \
                    -out "$SSL_DIR/cert.pem" \
                    -subj "/CN=${DOMAIN}" 2>/dev/null
            fi
        fi
    fi
}

create_network() {
    step "Creating Docker network"
    if docker network inspect "$NETWORK_NAME" &>/dev/null; then
        ok "Network '$NETWORK_NAME' already exists"
    else
        docker network create "$NETWORK_NAME"
        ok "Network '$NETWORK_NAME' created"
    fi
}

start_supabase() {
    step "Starting Supabase stack"
    docker compose \
        -f "$SUPABASE_DIR/docker-compose.yml" \
        -f "$SUPABASE_DIR/docker-compose.override.yml" \
        --env-file "$SUPABASE_DIR/.env" \
        up -d
    ok "Supabase containers starting"
}

wait_for_db() {
    step "Waiting for database"
    local max=60 i=1
    while [ $i -le $max ]; do
        if docker compose \
            -f "$SUPABASE_DIR/docker-compose.yml" \
            --env-file "$SUPABASE_DIR/.env" \
            exec -T db pg_isready -U supabase_admin &>/dev/null; then
            ok "Database is ready"
            return
        fi
        printf "       Waiting... (%d/%d)\r" "$i" "$max"
        sleep 2
        i=$((i + 1))
    done
    err "Database did not become ready in time"
    err "Check: docker compose -f $SUPABASE_DIR/docker-compose.yml logs db"
    exit 1
}

apply_migrations() {
    step "Applying database migrations"
    local count=0
    for f in "$MIGRATIONS_DIR"/*.sql; do
        [ -f "$f" ] || continue
        local basename
        basename=$(basename "$f")
        printf "       %-55s" "$basename"
        if docker compose \
            -f "$SUPABASE_DIR/docker-compose.yml" \
            --env-file "$SUPABASE_DIR/.env" \
            exec -T db psql -U supabase_admin -d postgres -f - < "$f" > /dev/null 2>&1; then
            printf "${GREEN}OK${NC}\n"
            count=$((count + 1))
        else
            printf "${YELLOW}SKIP (may already exist)${NC}\n"
        fi
    done
    ok "${count} migration(s) applied"
}

build_and_start_web() {
    step "Building and starting web application"
    info "Building Docker image (this may take a few minutes)..."
    docker compose -f "$SCRIPT_DIR/docker-compose.yml" build web
    ok "Web image built"

    if [ -z "${VAPID_PUBLIC:-}" ] || [ -z "${VAPID_PRIVATE:-}" ]; then
        info "Generating VAPID keys from built image..."
        eval "$(docker compose -f "$SCRIPT_DIR/docker-compose.yml" run --rm web node -e "
const w=require('web-push');
const k=w.generateVAPIDKeys();
console.log('VAPID_PUBLIC='+k.publicKey);
console.log('VAPID_PRIVATE='+k.privateKey);
" 2>/dev/null || echo "VAPID_PUBLIC= VAPID_PRIVATE=")"
        if [ -n "${VAPID_PUBLIC:-}" ]; then
            echo "NEXT_PUBLIC_VAPID_PUBLIC_KEY=${VAPID_PUBLIC}" >> "$WEB_DIR/.env"
            echo "VAPID_PRIVATE_KEY=${VAPID_PRIVATE}" >> "$WEB_DIR/.env"
            ok "VAPID keys appended to web .env"
        fi
    fi

    docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d
    ok "Web + Nginx containers started"
}

grant_admin() {
    step "First admin account"
    if [ -z "${ADMIN_EMAIL:-}" ]; then
        warn "No admin email provided — skipping"
        info "You can grant admin later:"
        info "  bash deploy/supabase/scripts/grant-admin-by-email.sh user@example.com"
        return
    fi
    info "Will grant admin role to: $ADMIN_EMAIL"
    info "The user must register first, then run:"
    info "  bash deploy/supabase/scripts/grant-admin-by-email.sh $ADMIN_EMAIL"
}

print_summary() {
    step "Deployment Summary"
    echo ""
    printf "  ${BOLD}Application:${NC}     ${SITE_URL}\n"
    if [ "$DOMAIN" = "localhost" ]; then
        printf "  ${BOLD}Supabase API:${NC}    http://localhost:8000\n"
        printf "  ${BOLD}Supabase Studio:${NC} http://localhost:8000 (DASHBOARD_PASSWORD in .env)\n"
    else
        printf "  ${BOLD}Supabase API:${NC}    https://${DOMAIN}\n"
        printf "  ${BOLD}Supabase Studio:${NC} https://${DOMAIN} → Basic Auth (supabase / see .env)\n"
    fi
    echo ""
    printf "  ${BOLD}Next steps:${NC}\n"
    printf "  1. Register at ${SITE_URL}/tr/register\n"
    printf "  2. Grant admin:\n"
    printf "     bash deploy/supabase/scripts/grant-admin-by-email.sh YOUR_EMAIL\n"
    printf "  3. Open ${SITE_URL}/tr/admin to manage roles\n"
    printf "  4. Open ${SITE_URL}/tr/board/content to configure content\n"
    echo ""
    printf "  ${BOLD}Useful commands:${NC}\n"
    printf "     View logs:       docker compose logs -f\n"
    printf "     Stop all:        docker compose -f %s down\n" "$SCRIPT_DIR/docker-compose.yml"
    printf "     Restart web:     docker compose -f %s restart web\n" "$SCRIPT_DIR/docker-compose.yml"
    printf "     DB shell:        docker compose exec db psql -U supabase_admin\n"
    echo ""
    printf "  ${BOLD}Important files:${NC}\n"
    printf "     %s\n" "$SUPABASE_DIR/.env"
    printf "     %s\n" "$WEB_DIR/.env"
    printf "     %s\n" "$SSL_DIR/cert.pem"
    echo ""
}

main() {
    echo ""
    printf "${BOLD}${CYAN}"
    echo "  ╔═══════════════════════════════════════════════════════════╗"
    echo "  ║            Olive Garden Concierge — Deploy               ║"
    echo "  ╚═══════════════════════════════════════════════════════════╝"
    printf "${NC}"
    echo ""

    check_prerequisites
    collect_config

    if [ "$REUSE_ENV" != "true" ]; then
        generate_secrets
        generate_vapid_keys
        write_supabase_env
        generate_ssl
        write_web_env
    fi

    create_network

    start_supabase
    wait_for_db
    apply_migrations

    build_and_start_web

    grant_admin
    print_summary

    ok "Deployment complete!"
}

main "$@"
