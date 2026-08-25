"""Initial schema – all V1 tables

Revision ID: 001
Revises: None
Create Date: 2026-06-30
"""
from alembic import op

revision = '001'
down_revision = None

def upgrade():
    # Extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

    # ENUMs
    op.execute("""
        CREATE TYPE order_status AS ENUM (
            'created', 'waiting_acceptance', 'accepted', 'preparing',
            'ready_for_delivery', 'out_for_delivery', 'arrived',
            'customer_confirmed_delivery', 'payment_pending', 'paid',
            'completed', 'delivery_failed', 'cancelled'
        );
    """)
    op.execute("""
        CREATE TYPE payment_status AS ENUM ('pending', 'verified', 'failed');
    """)
    op.execute("""
        CREATE TYPE payment_type AS ENUM ('FINAL_PAYMENT');
    """)  # V2 will add DEPOSIT
    op.execute("""
        CREATE TYPE settlement_status AS ENUM ('pending', 'processing', 'completed', 'failed');
    """)
    op.execute("""
        CREATE TYPE rider_status AS ENUM ('pending', 'active', 'inactive');
    """)
    op.execute("""
        CREATE TYPE user_role AS ENUM ('owner', 'rider', 'admin');
    """)
    op.execute("""
        CREATE TYPE delivery_attempt_status AS ENUM (
            'successful', 'failed', 'customer_unavailable',
            'customer_refused', 'wrong_location'
        );
    """)
    op.execute("""
        CREATE TYPE notification_type AS ENUM ('pwa_push', 'sms', 'whatsapp');
    """)
    op.execute("""
        CREATE TYPE recipient_type AS ENUM ('customer', 'business', 'rider');
    """)
    op.execute("""
        CREATE TYPE ledger_transaction_type AS ENUM (
            'payment_in', 'hakika_fee', 'business_settlement', 'refund', 'adjustment'
        );
    """)
    op.execute("""
        CREATE TYPE trust_subject_type AS ENUM ('customer', 'business', 'rider');
    """)
    op.execute("""
        CREATE TYPE assignment_status AS ENUM ('assigned', 'unassigned');
    """)
    op.execute("""
        CREATE TYPE payment_method_type AS ENUM ('paybill', 'till');
    """)

    # Tables
    op.execute("""
        CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email VARCHAR UNIQUE NOT NULL,
            password_hash VARCHAR NOT NULL,
            phone VARCHAR,
            role user_role NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE customers (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            phone_original VARCHAR NOT NULL,
            phone_normalized VARCHAR UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            trust_score DECIMAL(5,2) DEFAULT 100
        );
    """)

    op.execute("""
        CREATE TABLE categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR UNIQUE NOT NULL,
            acceptance_timeout_minutes INT NOT NULL,
            requires_deposit BOOLEAN DEFAULT FALSE
        );
    """)

    op.execute("""
        CREATE TABLE businesses (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            owner_id UUID REFERENCES users(id),
            name VARCHAR NOT NULL,
            category_id INT REFERENCES categories(id),
            logo_url VARCHAR,
            description TEXT,
            trust_score DECIMAL(5,2) DEFAULT 80,
            deleted_at TIMESTAMP
        );
    """)

    op.execute("""
        CREATE TABLE locations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            business_id UUID REFERENCES businesses(id),
            coordinates GEOGRAPHY(POINT,4326) NOT NULL,
            address_text VARCHAR,
            is_primary BOOLEAN DEFAULT TRUE
        );
    """)

    op.execute("""
        CREATE TABLE operating_hours (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            business_id UUID REFERENCES businesses(id),
            day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
            opens_at TIME,
            closes_at TIME,
            is_closed BOOLEAN DEFAULT FALSE
        );
    """)

    op.execute("""
        CREATE TABLE products (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            business_id UUID REFERENCES businesses(id),
            name VARCHAR NOT NULL,
            description TEXT,
            original_price DECIMAL NOT NULL,
            discount_price DECIMAL,
            image_url VARCHAR,
            is_available BOOLEAN DEFAULT TRUE,
            deleted_at TIMESTAMP
        );
    """)

    op.execute("""
        CREATE TABLE orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_number VARCHAR UNIQUE NOT NULL,
            customer_id UUID REFERENCES customers(id),
            business_id UUID REFERENCES businesses(id),
            status order_status NOT NULL DEFAULT 'created',
            subtotal DECIMAL NOT NULL,
            delivery_fee DECIMAL NOT NULL DEFAULT 0,
            total_amount DECIMAL NOT NULL,
            delivery_coordinates GEOGRAPHY(POINT,4326),
            requires_deposit BOOLEAN DEFAULT FALSE,
            deposit_amount DECIMAL,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE order_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_id UUID REFERENCES orders(id),
            product_name VARCHAR NOT NULL,
            unit_price DECIMAL NOT NULL,
            quantity INT NOT NULL,
            product_id UUID  -- nullable, reference may be deleted later
        );
    """)

    op.execute("""
        CREATE TABLE riders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id),
            business_id UUID REFERENCES businesses(id),
            name VARCHAR,
            email VARCHAR,
            phone VARCHAR,
            status rider_status DEFAULT 'pending'
        );
    """)

    op.execute("""
        CREATE TABLE delivery_assignments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_id UUID REFERENCES orders(id),
            rider_id UUID REFERENCES riders(id),
            assigned_at TIMESTAMP DEFAULT NOW(),
            status assignment_status DEFAULT 'assigned'
        );
    """)

    op.execute("""
        CREATE TABLE delivery_attempts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_id UUID REFERENCES orders(id),
            rider_id UUID,
            status delivery_attempt_status NOT NULL,
            photo_url VARCHAR,
            gps_point GEOGRAPHY(POINT,4326),
            attempt_time TIMESTAMP DEFAULT NOW(),
            evidence_required BOOLEAN DEFAULT TRUE
        );
    """)

    op.execute("""
        CREATE TABLE payment_methods (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            business_id UUID REFERENCES businesses(id),
            type payment_method_type NOT NULL,
            encrypted_account_number VARCHAR NOT NULL,
            last_four_digits VARCHAR,
            is_active BOOLEAN DEFAULT TRUE,
            effective_from TIMESTAMP DEFAULT NOW(),
            effective_to TIMESTAMP
        );
    """)

    op.execute("""
        CREATE TABLE payments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_id UUID REFERENCES orders(id),
            provider VARCHAR,
            provider_reference VARCHAR,
            idempotency_key VARCHAR UNIQUE NOT NULL,
            amount DECIMAL NOT NULL,
            payment_type payment_type NOT NULL DEFAULT 'FINAL_PAYMENT',
            status payment_status DEFAULT 'pending',
            provider_specific_data JSONB,
            last_checked_at TIMESTAMP
        );
    """)

    op.execute("""
        CREATE TABLE ledger_entries (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            transaction_type ledger_transaction_type NOT NULL,
            amount DECIMAL NOT NULL,
            order_id UUID,
            payment_id UUID,
            business_id UUID,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE settlements (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            business_id UUID NOT NULL,
            amount DECIMAL NOT NULL,
            status settlement_status DEFAULT 'pending',
            retry_count INT DEFAULT 0,
            last_retry_at TIMESTAMP
        );
    """)

    op.execute("""
        CREATE TABLE trust_events (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            subject_type trust_subject_type NOT NULL,
            subject_id UUID NOT NULL,
            event_type VARCHAR NOT NULL,
            score_change DECIMAL NOT NULL,
            reason TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            recipient_id UUID NOT NULL,
            recipient_type recipient_type NOT NULL,
            type notification_type NOT NULL,
            title VARCHAR,
            body TEXT,
            status VARCHAR DEFAULT 'sent',
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE audit_logs (
            id SERIAL PRIMARY KEY,
            table_name VARCHAR NOT NULL,
            record_id UUID,
            action VARCHAR NOT NULL,
            changed_by UUID,
            old_values JSONB,
            new_values JSONB,
            timestamp TIMESTAMP DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE customer_contact_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            business_id UUID,
            customer_id UUID,
            order_id UUID,
            revealed_by UUID,
            reason VARCHAR,
            timestamp TIMESTAMP DEFAULT NOW()
        );
    """)

def downgrade():
    op.execute("DROP TABLE IF EXISTS customer_contact_logs;")
    op.execute("DROP TABLE IF EXISTS audit_logs;")
    op.execute("DROP TABLE IF EXISTS notifications;")
    op.execute("DROP TABLE IF EXISTS trust_events;")
    op.execute("DROP TABLE IF EXISTS settlements;")
    op.execute("DROP TABLE IF EXISTS ledger_entries;")
    op.execute("DROP TABLE IF EXISTS payments;")
    op.execute("DROP TABLE IF EXISTS payment_methods;")
    op.execute("DROP TABLE IF EXISTS delivery_attempts;")
    op.execute("DROP TABLE IF EXISTS delivery_assignments;")
    op.execute("DROP TABLE IF EXISTS riders;")
    op.execute("DROP TABLE IF EXISTS order_items;")
    op.execute("DROP TABLE IF EXISTS orders;")
    op.execute("DROP TABLE IF EXISTS products;")
    op.execute("DROP TABLE IF EXISTS operating_hours;")
    op.execute("DROP TABLE IF EXISTS locations;")
    op.execute("DROP TABLE IF EXISTS businesses;")
    op.execute("DROP TABLE IF EXISTS categories;")
    op.execute("DROP TABLE IF EXISTS customers;")
    op.execute("DROP TABLE IF EXISTS users;")

    # Drop enums
    op.execute("DROP TYPE IF EXISTS payment_method_type;")
    op.execute("DROP TYPE IF EXISTS assignment_status;")
    op.execute("DROP TYPE IF EXISTS trust_subject_type;")
    op.execute("DROP TYPE IF EXISTS ledger_transaction_type;")
    op.execute("DROP TYPE IF EXISTS recipient_type;")
    op.execute("DROP TYPE IF EXISTS notification_type;")
    op.execute("DROP TYPE IF EXISTS delivery_attempt_status;")
    op.execute("DROP TYPE IF EXISTS user_role;")
    op.execute("DROP TYPE IF EXISTS rider_status;")
    op.execute("DROP TYPE IF EXISTS settlement_status;")
    op.execute("DROP TYPE IF EXISTS payment_type;")
    op.execute("DROP TYPE IF EXISTS payment_status;")
    op.execute("DROP TYPE IF EXISTS order_status;")
