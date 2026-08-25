#!/bin/bash
# Hakika Development Database Reset Utility
# Removes all application data while preserving schema, migrations, and reference data.
# DEVELOPMENT USE ONLY.

set -e

# ---- Environment Guard ----
if [ "$APP_ENV" != "development" ]; then
    echo "ERROR: This utility only runs in the development environment."
    echo "Current APP_ENV: ${APP_ENV:-not set}"
    exit 1
fi

# ---- Confirmation ----
echo "======================================================"
echo "        HAKIKA DEVELOPMENT DATABASE RESET"
echo "======================================================"
echo ""
echo "The following data WILL BE DELETED:"
echo "  • users"
echo "  • businesses"
echo "  • riders"
echo "  • products"
echo "  • product_images"
echo "  • orders"
echo "  • order_items"
echo "  • customers"
echo "  • payments"
echo "  • payment_attempts"
echo "  • payment_methods"
echo "  • settlements"
echo "  • ledger_entries"
echo "  • delivery_assignments"
echo "  • delivery_attempts"
echo "  • delivery_evidence"
echo "  • disputes"
echo "  • trust_events"
echo "  • notifications"
echo "  • refresh_tokens"
echo "  • audit_logs"
echo "  • locations"
echo "  • operating_hours"
echo ""
echo "The following WILL BE PRESERVED:"
echo "  • categories"
echo "  • alembic_version"
echo ""

read -p "Type DELETE to continue: " CONFIRM

if [ "$CONFIRM" != "DELETE" ]; then
    echo "Operation cancelled."
    exit 0
fi

# ---- Backup ----
BACKUP_FILE="/tmp/hakika_dev_backup_$(date +%Y%m%d_%H%M%S).sql"

echo ""
echo "Creating backup..."
sudo -u postgres pg_dump -d hakika_db > "$BACKUP_FILE"

echo "Backup saved to:"
echo "$BACKUP_FILE"

# ---- Reset ----
echo ""
echo "Resetting database..."

sudo -u postgres psql -d hakika_db <<SQL
TRUNCATE TABLE
    audit_logs,
    businesses,
    customers,
    delivery_assignments,
    delivery_attempts,
    delivery_evidence,
    disputes,
    ledger_entries,
    locations,
    notifications,
    operating_hours,
    order_items,
    orders,
    payment_attempts,
    payment_methods,
    payments,
    product_images,
    products,
    refresh_tokens,
    riders,
    settlements,
    trust_events,
    users
RESTART IDENTITY CASCADE;
SQL

# ---- Verification ----
echo ""
echo "Running verification..."

sudo -u postgres psql -d hakika_db <<SQL
SELECT 'businesses',COUNT(*) FROM businesses
UNION ALL
SELECT 'riders',COUNT(*) FROM riders
UNION ALL
SELECT 'products',COUNT(*) FROM products
UNION ALL
SELECT 'orders',COUNT(*) FROM orders
UNION ALL
SELECT 'users',COUNT(*) FROM users
UNION ALL
SELECT 'categories',COUNT(*) FROM categories
ORDER BY 1;
SQL

echo ""
echo "======================================"
echo "Development reset completed."
echo "Categories should remain at 1 row."
echo "If verification is incorrect, restore:"
echo ""
echo "sudo -u postgres psql -d hakika_db < $BACKUP_FILE"
echo "======================================"
