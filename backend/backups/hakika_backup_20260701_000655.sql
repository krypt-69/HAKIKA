--
-- PostgreSQL database dump
--

\restrict gSGMgDX4FTbjIVKKBLG8t46PUY77RiqajQ5DRfO3w4BE7ciA0Kp69j6Bf2knyqN

-- Dumped from database version 18.3 (Debian 18.3-1+b1)
-- Dumped by pg_dump version 18.3 (Debian 18.3-1+b1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: assignment_status; Type: TYPE; Schema: public; Owner: hakika
--

CREATE TYPE public.assignment_status AS ENUM (
    'assigned',
    'unassigned'
);


ALTER TYPE public.assignment_status OWNER TO hakika;

--
-- Name: delivery_attempt_status; Type: TYPE; Schema: public; Owner: hakika
--

CREATE TYPE public.delivery_attempt_status AS ENUM (
    'successful',
    'failed',
    'customer_unavailable',
    'customer_refused',
    'wrong_location'
);


ALTER TYPE public.delivery_attempt_status OWNER TO hakika;

--
-- Name: dispute_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.dispute_status AS ENUM (
    'pending',
    'under_review',
    'resolved_customer',
    'resolved_business'
);


ALTER TYPE public.dispute_status OWNER TO postgres;

--
-- Name: ledger_transaction_type; Type: TYPE; Schema: public; Owner: hakika
--

CREATE TYPE public.ledger_transaction_type AS ENUM (
    'payment_in',
    'hakika_fee',
    'business_settlement',
    'refund',
    'adjustment'
);


ALTER TYPE public.ledger_transaction_type OWNER TO hakika;

--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: hakika
--

CREATE TYPE public.notification_type AS ENUM (
    'pwa_push',
    'sms',
    'whatsapp'
);


ALTER TYPE public.notification_type OWNER TO hakika;

--
-- Name: order_status; Type: TYPE; Schema: public; Owner: hakika
--

CREATE TYPE public.order_status AS ENUM (
    'created',
    'waiting_acceptance',
    'accepted',
    'preparing',
    'ready_for_delivery',
    'out_for_delivery',
    'arrived',
    'customer_confirmed_delivery',
    'payment_pending',
    'paid',
    'completed',
    'delivery_failed',
    'cancelled',
    'dispute_review'
);


ALTER TYPE public.order_status OWNER TO hakika;

--
-- Name: payment_attempt_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_attempt_status AS ENUM (
    'initiated',
    'sent',
    'failed'
);


ALTER TYPE public.payment_attempt_status OWNER TO postgres;

--
-- Name: payment_method_type; Type: TYPE; Schema: public; Owner: hakika
--

CREATE TYPE public.payment_method_type AS ENUM (
    'paybill',
    'till'
);


ALTER TYPE public.payment_method_type OWNER TO hakika;

--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: hakika
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'verified',
    'failed'
);


ALTER TYPE public.payment_status OWNER TO hakika;

--
-- Name: payment_type; Type: TYPE; Schema: public; Owner: hakika
--

CREATE TYPE public.payment_type AS ENUM (
    'FINAL_PAYMENT'
);


ALTER TYPE public.payment_type OWNER TO hakika;

--
-- Name: recipient_type; Type: TYPE; Schema: public; Owner: hakika
--

CREATE TYPE public.recipient_type AS ENUM (
    'customer',
    'business',
    'rider'
);


ALTER TYPE public.recipient_type OWNER TO hakika;

--
-- Name: rider_status; Type: TYPE; Schema: public; Owner: hakika
--

CREATE TYPE public.rider_status AS ENUM (
    'pending',
    'active',
    'inactive'
);


ALTER TYPE public.rider_status OWNER TO hakika;

--
-- Name: settlement_status; Type: TYPE; Schema: public; Owner: hakika
--

CREATE TYPE public.settlement_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);


ALTER TYPE public.settlement_status OWNER TO hakika;

--
-- Name: trust_subject_type; Type: TYPE; Schema: public; Owner: hakika
--

CREATE TYPE public.trust_subject_type AS ENUM (
    'customer',
    'business',
    'rider'
);


ALTER TYPE public.trust_subject_type OWNER TO hakika;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: hakika
--

CREATE TYPE public.user_role AS ENUM (
    'owner',
    'rider',
    'admin'
);


ALTER TYPE public.user_role OWNER TO hakika;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO hakika;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    table_name character varying NOT NULL,
    record_id uuid,
    action character varying NOT NULL,
    changed_by uuid,
    old_values jsonb,
    new_values jsonb,
    "timestamp" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.audit_logs OWNER TO hakika;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: hakika
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO hakika;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hakika
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: businesses; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.businesses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    owner_id uuid,
    name character varying NOT NULL,
    category_id integer,
    logo_url character varying,
    description text,
    trust_score numeric(5,2) DEFAULT 80,
    deleted_at timestamp without time zone
);


ALTER TABLE public.businesses OWNER TO hakika;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying NOT NULL,
    acceptance_timeout_minutes integer NOT NULL,
    requires_deposit boolean DEFAULT false
);


ALTER TABLE public.categories OWNER TO hakika;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: hakika
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO hakika;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hakika
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: customer_contact_logs; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.customer_contact_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    business_id uuid,
    customer_id uuid,
    order_id uuid,
    revealed_by uuid,
    reason character varying,
    "timestamp" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.customer_contact_logs OWNER TO hakika;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.customers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    phone_original character varying NOT NULL,
    phone_normalized character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    trust_score numeric(5,2) DEFAULT 100
);


ALTER TABLE public.customers OWNER TO hakika;

--
-- Name: delivery_assignments; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.delivery_assignments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid,
    rider_id uuid,
    assigned_at timestamp without time zone DEFAULT now(),
    status public.assignment_status DEFAULT 'assigned'::public.assignment_status
);


ALTER TABLE public.delivery_assignments OWNER TO hakika;

--
-- Name: delivery_attempts; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.delivery_attempts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid,
    rider_id uuid,
    status public.delivery_attempt_status NOT NULL,
    photo_url character varying,
    gps_point public.geography(Point,4326),
    attempt_time timestamp without time zone DEFAULT now(),
    evidence_required boolean DEFAULT true
);


ALTER TABLE public.delivery_attempts OWNER TO hakika;

--
-- Name: disputes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disputes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid,
    customer_id uuid,
    reason text,
    status public.dispute_status DEFAULT 'pending'::public.dispute_status NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    resolved_at timestamp without time zone,
    resolved_by uuid
);


ALTER TABLE public.disputes OWNER TO postgres;

--
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.ledger_entries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    transaction_type public.ledger_transaction_type NOT NULL,
    amount numeric NOT NULL,
    order_id uuid,
    payment_id uuid,
    business_id uuid,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ledger_entries OWNER TO hakika;

--
-- Name: locations; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.locations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    business_id uuid,
    coordinates public.geography(Point,4326) NOT NULL,
    address_text character varying,
    is_primary boolean DEFAULT true
);


ALTER TABLE public.locations OWNER TO hakika;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    recipient_id uuid NOT NULL,
    recipient_type public.recipient_type NOT NULL,
    type public.notification_type NOT NULL,
    title character varying,
    body text,
    status character varying DEFAULT 'sent'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO hakika;

--
-- Name: operating_hours; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.operating_hours (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    business_id uuid,
    day_of_week integer,
    opens_at time without time zone,
    closes_at time without time zone,
    is_closed boolean DEFAULT false,
    CONSTRAINT operating_hours_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


ALTER TABLE public.operating_hours OWNER TO hakika;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.order_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid,
    product_name character varying NOT NULL,
    unit_price numeric NOT NULL,
    quantity integer NOT NULL,
    product_id uuid
);


ALTER TABLE public.order_items OWNER TO hakika;

--
-- Name: order_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_number_seq OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_number character varying NOT NULL,
    customer_id uuid,
    business_id uuid,
    status public.order_status DEFAULT 'created'::public.order_status NOT NULL,
    subtotal numeric NOT NULL,
    delivery_fee numeric DEFAULT 0 NOT NULL,
    total_amount numeric NOT NULL,
    delivery_coordinates public.geography(Point,4326),
    requires_deposit boolean DEFAULT false,
    deposit_amount numeric,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.orders OWNER TO hakika;

--
-- Name: payment_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_attempts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    payment_id uuid,
    attempt_number integer DEFAULT 1 NOT NULL,
    provider_response jsonb,
    status public.payment_attempt_status DEFAULT 'initiated'::public.payment_attempt_status NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payment_attempts OWNER TO postgres;

--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.payment_methods (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    business_id uuid,
    type public.payment_method_type NOT NULL,
    encrypted_account_number character varying NOT NULL,
    last_four_digits character varying,
    is_active boolean DEFAULT true,
    effective_from timestamp without time zone DEFAULT now(),
    effective_to timestamp without time zone
);


ALTER TABLE public.payment_methods OWNER TO hakika;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid,
    provider character varying,
    provider_reference character varying,
    idempotency_key character varying NOT NULL,
    amount numeric NOT NULL,
    payment_type public.payment_type DEFAULT 'FINAL_PAYMENT'::public.payment_type NOT NULL,
    status public.payment_status DEFAULT 'pending'::public.payment_status,
    provider_specific_data jsonb,
    last_checked_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payments OWNER TO hakika;

--
-- Name: products; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    business_id uuid,
    name character varying NOT NULL,
    description text,
    original_price numeric NOT NULL,
    discount_price numeric,
    image_url character varying,
    is_available boolean DEFAULT true,
    deleted_at timestamp without time zone
);


ALTER TABLE public.products OWNER TO hakika;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    revoked boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.refresh_tokens OWNER TO hakika;

--
-- Name: riders; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.riders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    business_id uuid,
    name character varying,
    email character varying,
    phone character varying,
    status public.rider_status DEFAULT 'pending'::public.rider_status
);


ALTER TABLE public.riders OWNER TO hakika;

--
-- Name: settlements; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.settlements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    business_id uuid NOT NULL,
    amount numeric NOT NULL,
    status public.settlement_status DEFAULT 'pending'::public.settlement_status,
    retry_count integer DEFAULT 0,
    last_retry_at timestamp without time zone,
    order_id uuid,
    payment_id uuid,
    provider_reference character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.settlements OWNER TO hakika;

--
-- Name: trust_events; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.trust_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    subject_type public.trust_subject_type NOT NULL,
    subject_id uuid NOT NULL,
    event_type character varying NOT NULL,
    score_change numeric NOT NULL,
    reason text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.trust_events OWNER TO hakika;

--
-- Name: users; Type: TABLE; Schema: public; Owner: hakika
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying NOT NULL,
    password_hash character varying NOT NULL,
    phone character varying,
    role public.user_role NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO hakika;

--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.alembic_version (version_num) FROM stdin;
002
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.audit_logs (id, table_name, record_id, action, changed_by, old_values, new_values, "timestamp") FROM stdin;
1	orders	7370a10a-91bf-42f3-bb82-7a5a0233bc98	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 16:13:03.966053
2	disputes	83abd85d-9bd9-4551-b499-1bb83e8f779f	DISPUTE_CREATED	\N	\N	{"reason": "Damaged item", "order_id": "13ada0bd-9645-4cef-8955-cbf4d2610929"}	2026-06-30 16:13:06.693963
3	orders	fcccb9a0-e13c-4e90-bb69-b355db546358	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 16:19:46.563395
4	orders	3df2233b-45ac-499b-b0e7-77976b6a36a6	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 16:20:06.448444
5	settlements	c30f5a4c-ffe0-4946-ac55-524a139aa645	ADMIN_SETTLEMENT_COMPLETED	952fe8c4-7212-4500-9884-cc8f76ba4c07	\N	{"status": "completed"}	2026-06-30 16:31:29.709884
6	orders	2045a40b-4977-4f40-a3fb-1056195953f0	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 17:36:08.464738
7	orders	a1e3f27b-de38-4133-87fc-eff8354d6806	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 17:37:49.968531
8	orders	6aa48881-ed0d-4e96-9866-81cba1d4e558	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 18:37:43.050773
9	orders	362407bf-c542-44b5-8720-602499e0f6fb	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 18:39:40.434951
10	orders	370782a0-6088-4eff-954e-a905c3641c49	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 18:41:27.790098
11	orders	318869ba-1d62-4512-87fc-bce93acce47b	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 18:50:08.425255
12	orders	63485c94-7bc6-46b5-bef0-6620b005cd3f	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 18:52:59.504155
13	orders	07008c76-3768-47a5-8d16-40b8bfbd5d2f	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 18:55:03.38917
14	orders	9fbe9c37-711d-4c4f-b4b4-45f8e51777ff	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 18:55:22.332472
15	orders	c771d27b-ce56-4025-a453-b6f39c0a7126	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 18:57:36.80355
16	orders	0d236f38-ab01-443f-9681-5472c536bbc6	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 18:59:07.328545
17	orders	cc12defb-3292-48f5-a266-89283db66f77	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 20:09:17.084456
18	orders	02fadb83-e0c9-41df-9026-3ecc72c7b8ad	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 20:10:29.053116
19	orders	6c60d5f3-27e7-469f-b2fa-a10c401cf4e0	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 20:14:47.028961
20	orders	27bf52ca-d2e6-4e44-bd34-1a3befd9c3ac	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 20:19:32.100494
21	orders	2d1e87ff-d8a5-49b8-927b-6e69e2036b26	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 20:20:42.717263
22	orders	c78c3994-030e-4f63-a2d1-359aeee2f0f3	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 20:28:50.370025
23	orders	fb91bf6b-1adb-410b-a98d-47d6e41af802	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 20:31:28.665172
24	orders	ba034e21-775c-4486-9ae8-ce71a567e95c	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 20:34:29.818054
25	orders	5d21d8da-4612-4e29-83f6-68d5e77dcef2	CUSTOMER_CONFIRMED_DELIVERY	\N	\N	{"status": "customer_confirmed_delivery"}	2026-06-30 20:36:40.689286
26	settlements	b59cd82e-c8f6-461d-bd91-06c60ebc419f	ADMIN_SETTLEMENT_COMPLETED	952fe8c4-7212-4500-9884-cc8f76ba4c07	\N	{"status": "completed"}	2026-06-30 20:44:16.522903
\.


--
-- Data for Name: businesses; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.businesses (id, owner_id, name, category_id, logo_url, description, trust_score, deleted_at) FROM stdin;
f9680f9a-5412-424b-ab1c-e6441059d046	cf855762-353f-4bfa-9c6b-c938ec69292e	Mama Jane Super Store	1	\N	Your trusted supermarket	80.00	2026-06-30 15:17:24.366746
78eecc19-cc12-41b4-b274-c12f560881d4	cf855762-353f-4bfa-9c6b-c938ec69292e	Test Discovery Store	1	\N	For discovery testing	80.00	2026-06-30 15:25:31.087132
fc2be946-7d8e-4eda-bf6d-f714a7cec5b7	f147c221-af05-4be8-8e87-4c6e9f8f13bd	Other Store	1	\N	\N	80.00	\N
b03f3d97-a285-4377-b750-2aa9cb60c5ed	cf855762-353f-4bfa-9c6b-c938ec69292e	Mama Jane Supermarket	1	\N	Your trusted supermarket	75.00	\N
010fbaf6-2caf-40a2-8566-806f5bb2e075	9e274543-c23e-4373-9167-7cf9b0ea2bfa	Flow Test Store	1	\N	\N	80.00	\N
3e5553fe-9be2-44a0-a9a7-2560e4d57a42	02b77dc6-4011-4078-9ff3-cb474c1273e7	Flow Test Store	1	\N	\N	80.00	\N
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.categories (id, name, acceptance_timeout_minutes, requires_deposit) FROM stdin;
1	Supermarket	30	f
\.


--
-- Data for Name: customer_contact_logs; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.customer_contact_logs (id, business_id, customer_id, order_id, revealed_by, reason, "timestamp") FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.customers (id, phone_original, phone_normalized, created_at, trust_score) FROM stdin;
c4ff9bcc-61cd-4dfb-b5fb-76a0b38e44bf	0712345678	+254712345678	2026-06-30 17:49:15.894682	100.00
856e8729-4d72-4bee-b555-e9b410436420	0722222222	+254722222222	2026-06-30 18:32:03.837788	100.00
2aab7654-fb04-41b4-8d1e-5eaf953daf2e	0744444444	+254744444444	2026-06-30 18:32:19.530278	100.00
06f12134-0bd2-4f4d-a9c1-f59a5e2189af	0711111111	+254711111111	2026-06-30 18:31:31.12388	100.00
26459185-29b8-4152-b553-8fc6916efb2e	0733333333	+254733333333	2026-06-30 18:32:09.55364	95.00
6d1bde9a-f95c-4663-8c3e-f15b9e6cbdc5	0710000000	+254710000000	2026-06-30 19:19:45.821689	100.00
70fbfcda-0981-4629-aecd-49dd05b94d62	0755555555	+254755555555	2026-06-30 19:13:05.985773	100.00
9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	0715982985	+254715982985	2026-06-30 21:41:26.837482	100.00
\.


--
-- Data for Name: delivery_assignments; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.delivery_assignments (id, order_id, rider_id, assigned_at, status) FROM stdin;
2d09fc39-1714-4cd0-b891-4ddbdfa035c7	7370a10a-91bf-42f3-bb82-7a5a0233bc98	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 16:07:52.138674	assigned
36b8d728-938b-4b6e-845a-f434edd7ce16	13ada0bd-9645-4cef-8955-cbf4d2610929	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 16:13:06.368068	assigned
d08d3e64-77f0-41d3-b0dc-b9691919c2fb	fcccb9a0-e13c-4e90-bb69-b355db546358	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 16:19:46.231634	assigned
6cf0a32b-a9ab-4b86-ae70-6d39f2bae182	3df2233b-45ac-499b-b0e7-77976b6a36a6	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 16:20:06.063233	assigned
539eed28-8b02-4079-8b47-092814c563be	2045a40b-4977-4f40-a3fb-1056195953f0	ba4c5264-5d33-4732-801a-04621b44bc10	2026-06-30 17:36:08.333528	assigned
d5dbeffe-8d8a-43d6-a869-2ec082c46ae3	a1e3f27b-de38-4133-87fc-eff8354d6806	ae003685-4948-4df5-8963-69a46610e34a	2026-06-30 17:37:49.900328	assigned
14200c78-89f6-4dce-8c40-201a9998cce7	6aa48881-ed0d-4e96-9866-81cba1d4e558	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 18:37:42.426588	assigned
1002aeb9-eb96-4360-88b3-2e7f5d113941	362407bf-c542-44b5-8720-602499e0f6fb	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 18:39:39.814057	assigned
c9f31169-098f-402d-9bdc-3225414c1a7f	370782a0-6088-4eff-954e-a905c3641c49	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 18:41:27.138712	assigned
60b72e82-610d-4603-a869-34c1c129cd12	318869ba-1d62-4512-87fc-bce93acce47b	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 18:50:07.776826	assigned
b5d5de9b-74b3-44b0-90b1-bf913ae4f5e3	63485c94-7bc6-46b5-bef0-6620b005cd3f	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 18:52:58.889216	assigned
5b221c90-b2e7-4241-93f7-0826df232941	07008c76-3768-47a5-8d16-40b8bfbd5d2f	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 18:55:02.790582	assigned
b67c72d1-9100-4e56-b8d8-82e4f24f6eb5	9fbe9c37-711d-4c4f-b4b4-45f8e51777ff	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 18:55:21.748613	assigned
d38fe3cb-7341-4d04-a821-7480ec4f181f	c771d27b-ce56-4025-a453-b6f39c0a7126	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 18:57:15.710003	assigned
f73de5f8-c36b-4a39-807d-d06760eb7b89	0d236f38-ab01-443f-9681-5472c536bbc6	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 18:59:06.732282	assigned
1124d0bf-12ef-4f91-a27a-0df8b4c2b870	cc12defb-3292-48f5-a266-89283db66f77	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 20:09:16.756006	assigned
8b7d836d-7bad-4adc-948e-1e7de73fe18f	02fadb83-e0c9-41df-9026-3ecc72c7b8ad	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 20:10:28.705072	assigned
4f5a25cd-f308-493a-a9cd-008bd9480a75	6c60d5f3-27e7-469f-b2fa-a10c401cf4e0	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 20:14:46.656304	assigned
50765414-ffe4-4070-9574-e6902026ca1b	27bf52ca-d2e6-4e44-bd34-1a3befd9c3ac	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 20:19:31.777004	assigned
059f164b-13fe-4eea-a599-6cd4b7df6587	2d1e87ff-d8a5-49b8-927b-6e69e2036b26	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 20:20:42.381875	assigned
a1c74c7a-5308-4cea-80cb-c37436f1e16e	c78c3994-030e-4f63-a2d1-359aeee2f0f3	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 20:28:50.03579	assigned
808f677c-ba82-441d-a807-a33577a90f61	fb91bf6b-1adb-410b-a98d-47d6e41af802	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 20:31:28.361608	assigned
d1ab5754-a970-4d0c-9dac-74348e62eff7	ba034e21-775c-4486-9ae8-ce71a567e95c	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 20:34:29.477942	assigned
df7231e0-c192-4e1e-88d6-4469a0546218	5d21d8da-4612-4e29-83f6-68d5e77dcef2	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	2026-06-30 20:36:40.350818	assigned
\.


--
-- Data for Name: delivery_attempts; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.delivery_attempts (id, order_id, rider_id, status, photo_url, gps_point, attempt_time, evidence_required) FROM stdin;
93f88b73-01f7-42b1-91c9-522d03012351	7370a10a-91bf-42f3-bb82-7a5a0233bc98	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 16:09:16.973799	f
8c3c5678-92f3-4696-9ff8-c66bf7b3bfc2	13ada0bd-9645-4cef-8955-cbf4d2610929	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 16:13:06.652618	f
35ed1b6d-fe6b-4760-bcab-81190d63e83d	fcccb9a0-e13c-4e90-bb69-b355db546358	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 16:19:46.504972	f
7574d4b1-98d2-424b-b54c-3d50782e3c85	3df2233b-45ac-499b-b0e7-77976b6a36a6	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 16:20:06.419274	f
5fc9d967-c957-4830-8d35-8a4a5c87cd53	2045a40b-4977-4f40-a3fb-1056195953f0	ba4c5264-5d33-4732-801a-04621b44bc10	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 17:36:08.365243	f
1257c433-e165-4a73-aa64-7f17b6ba0c41	a1e3f27b-de38-4133-87fc-eff8354d6806	ae003685-4948-4df5-8963-69a46610e34a	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 17:37:49.919544	f
67ecfa5f-8b9f-4937-9b00-72842234d719	6aa48881-ed0d-4e96-9866-81cba1d4e558	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 18:37:42.94838	f
a4ba7845-6254-4776-8ab1-34b48d1a3103	362407bf-c542-44b5-8720-602499e0f6fb	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 18:39:40.367677	f
da666fd9-5ef7-4db4-81ce-fff1c8a34755	370782a0-6088-4eff-954e-a905c3641c49	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 18:41:27.722942	f
bfebb908-18b7-4f4c-96db-057bca82b89f	318869ba-1d62-4512-87fc-bce93acce47b	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 18:50:08.356441	f
9907aed8-fff2-4804-a717-caa3a2646614	63485c94-7bc6-46b5-bef0-6620b005cd3f	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 18:52:59.435889	f
e63ab060-7636-4b05-8848-6e4fd7f9466a	07008c76-3768-47a5-8d16-40b8bfbd5d2f	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 18:55:03.322637	f
e262fef2-d0d4-49b3-8b52-bf1b19715349	9fbe9c37-711d-4c4f-b4b4-45f8e51777ff	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 18:55:22.262259	f
a65b229d-6894-43bd-8b4f-84781edf9254	c771d27b-ce56-4025-a453-b6f39c0a7126	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 18:57:28.925108	f
61a975ca-1761-4f06-90b6-2ee3782d6966	0d236f38-ab01-443f-9681-5472c536bbc6	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 18:59:07.294188	f
31deeebb-1250-457a-b1c6-e004968536b1	cc12defb-3292-48f5-a266-89283db66f77	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 20:09:17.032588	f
3361b6cb-9c46-467d-aa1f-4b3b8b04381b	02fadb83-e0c9-41df-9026-3ecc72c7b8ad	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 20:10:28.993192	f
783be9b5-416e-45da-8a47-7a6a76cefd2b	6c60d5f3-27e7-469f-b2fa-a10c401cf4e0	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 20:14:46.9461	f
3953196b-8fa9-4b88-8401-3acf7fa9a20a	27bf52ca-d2e6-4e44-bd34-1a3befd9c3ac	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 20:19:32.052995	f
6a228d39-e9c3-4255-b8e3-eda3361f394b	2d1e87ff-d8a5-49b8-927b-6e69e2036b26	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 20:20:42.666804	f
4b5f3157-eced-478a-bef8-c87052c1e1df	c78c3994-030e-4f63-a2d1-359aeee2f0f3	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 20:28:50.313776	f
521cac4f-114c-4872-b843-3314f6ce903e	fb91bf6b-1adb-410b-a98d-47d6e41af802	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 20:31:28.63445	f
8dac6574-a769-4ed1-87dd-4561d03e0090	ba034e21-775c-4486-9ae8-ce71a567e95c	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 20:34:29.761452	f
2aedf130-a26f-4953-a714-07e3ecc80ced	5d21d8da-4612-4e29-83f6-68d5e77dcef2	94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	successful	\N	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	2026-06-30 20:36:40.632355	f
\.


--
-- Data for Name: disputes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.disputes (id, order_id, customer_id, reason, status, created_at, resolved_at, resolved_by) FROM stdin;
83abd85d-9bd9-4551-b499-1bb83e8f779f	13ada0bd-9645-4cef-8955-cbf4d2610929	70fbfcda-0981-4629-aecd-49dd05b94d62	Damaged item	pending	2026-06-30 16:13:06.68501	\N	\N
\.


--
-- Data for Name: ledger_entries; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.ledger_entries (id, transaction_type, amount, order_id, payment_id, business_id, created_at) FROM stdin;
7f745520-3b00-43e6-9347-e6bfb1e18daf	payment_in	90	fcccb9a0-e13c-4e90-bb69-b355db546358	f6f5937c-751c-4c50-ad5a-ffc40fe728b4	b03f3d97-a285-4377-b750-2aa9cb60c5ed	2026-06-30 16:28:50.67797
b3aa0ec1-b4a7-4c24-a4e6-ec2ba60600dd	hakika_fee	-1.8000000000000000444089209850062616169452667236328125	fcccb9a0-e13c-4e90-bb69-b355db546358	f6f5937c-751c-4c50-ad5a-ffc40fe728b4	b03f3d97-a285-4377-b750-2aa9cb60c5ed	2026-06-30 16:28:50.687162
12ed0406-74d5-47d6-a490-aad927ff3fe4	payment_in	90	3df2233b-45ac-499b-b0e7-77976b6a36a6	a65dac0b-5534-4353-908d-344c84a1e8da	b03f3d97-a285-4377-b750-2aa9cb60c5ed	2026-06-30 16:30:19.52875
58a13dac-fc0c-4b29-8f4d-bcdd77ea348c	hakika_fee	-1.8000000000000000444089209850062616169452667236328125	3df2233b-45ac-499b-b0e7-77976b6a36a6	a65dac0b-5534-4353-908d-344c84a1e8da	b03f3d97-a285-4377-b750-2aa9cb60c5ed	2026-06-30 16:30:19.539986
bd386c4b-8e92-49ba-aa37-c6de011fb4ae	business_settlement	-88.2000000000000028421709430404007434844970703125	3df2233b-45ac-499b-b0e7-77976b6a36a6	f6f5937c-751c-4c50-ad5a-ffc40fe728b4	b03f3d97-a285-4377-b750-2aa9cb60c5ed	2026-06-30 16:31:29.705244
2f725283-0610-4f76-9e8a-7ea614a08b58	payment_in	90	0d236f38-ab01-443f-9681-5472c536bbc6	b03d39f9-960d-4793-bbb0-965228d182dc	b03f3d97-a285-4377-b750-2aa9cb60c5ed	2026-06-30 19:02:31.211331
4e910d93-ffe9-4ba8-b6ed-473719f216dc	hakika_fee	-1.8000000000000000444089209850062616169452667236328125	0d236f38-ab01-443f-9681-5472c536bbc6	b03d39f9-960d-4793-bbb0-965228d182dc	b03f3d97-a285-4377-b750-2aa9cb60c5ed	2026-06-30 19:02:31.243268
776761cd-3809-42db-b9f9-8b0851e0f4c5	payment_in	1	ba034e21-775c-4486-9ae8-ce71a567e95c	6569e068-6934-4d68-8f65-c5a83a33d7d8	b03f3d97-a285-4377-b750-2aa9cb60c5ed	2026-06-30 20:35:36.396615
8f1cfeda-7e36-4aba-ad29-5d272bef19e1	hakika_fee	-0.0200000000000000004163336342344337026588618755340576171875	ba034e21-775c-4486-9ae8-ce71a567e95c	6569e068-6934-4d68-8f65-c5a83a33d7d8	b03f3d97-a285-4377-b750-2aa9cb60c5ed	2026-06-30 20:35:36.405981
e1ba78a1-2ccb-4fff-8ece-90729c06224a	business_settlement	-88.2000000000000028421709430404007434844970703125	0d236f38-ab01-443f-9681-5472c536bbc6	b03d39f9-960d-4793-bbb0-965228d182dc	b03f3d97-a285-4377-b750-2aa9cb60c5ed	2026-06-30 20:44:16.513823
\.


--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.locations (id, business_id, coordinates, address_text, is_primary) FROM stdin;
e929a61a-1a90-470b-9a63-db8b3d374ad4	f9680f9a-5412-424b-ab1c-e6441059d046	0101000020E6100000FE4465C39A68424041F2CEA10C95F4BF	Nairobi West	t
7b76f368-3301-4c41-9283-b601c7e2825d	b03f3d97-a285-4377-b750-2aa9cb60c5ed	0101000020E6100000FE4465C39A68424041F2CEA10C95F4BF	Nairobi West	t
8bbef9a0-b151-4ed9-8a7d-f4a9bbf91f7d	78eecc19-cc12-41b4-b274-c12f560881d4	0101000020E610000062105839B46842408FC2F5285C8FF4BF	Near Nairobi West	t
56298a46-cea4-4f5c-90ab-a25a8471538a	fc2be946-7d8e-4eda-bf6d-f714a7cec5b7	0101000020E610000048E17A14AE674240A4703D0AD7A3F4BF	Elsewhere	t
13782530-5b9e-4b36-8bc7-21ae1ea974b6	010fbaf6-2caf-40a2-8566-806f5bb2e075	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	Test	t
85b4dff7-89bc-4072-90f7-14b57d0fd3e0	3e5553fe-9be2-44a0-a9a7-2560e4d57a42	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	Test	t
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.notifications (id, recipient_id, recipient_type, type, title, body, status, created_at) FROM stdin;
\.


--
-- Data for Name: operating_hours; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.operating_hours (id, business_id, day_of_week, opens_at, closes_at, is_closed) FROM stdin;
45a3e6b9-859a-4968-b96c-09edc63d9ce5	f9680f9a-5412-424b-ab1c-e6441059d046	0	08:00:00	20:00:00	f
d8e4664f-cac5-46db-befd-911a2d817608	f9680f9a-5412-424b-ab1c-e6441059d046	1	08:00:00	20:00:00	f
3c70120b-c49a-4bca-9272-f9dab06e19ad	b03f3d97-a285-4377-b750-2aa9cb60c5ed	0	08:00:00	20:00:00	f
a0801a30-9d1c-4c3d-8a63-a6ac156a16b0	b03f3d97-a285-4377-b750-2aa9cb60c5ed	1	08:00:00	20:00:00	f
fc43f143-517f-4c88-8f66-6ef2c66edebd	78eecc19-cc12-41b4-b274-c12f560881d4	0	08:00:00	20:00:00	f
38ffdf8c-2c8a-43ba-9cc3-fa7c8c360eab	010fbaf6-2caf-40a2-8566-806f5bb2e075	0	08:00:00	20:00:00	f
a2ad0fb2-6e90-439c-8c6d-28be033064b5	3e5553fe-9be2-44a0-a9a7-2560e4d57a42	0	08:00:00	20:00:00	f
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.order_items (id, order_id, product_name, unit_price, quantity, product_id) FROM stdin;
79ff240f-2117-4670-8f5c-a42e0fc131de	7370a10a-91bf-42f3-bb82-7a5a0233bc98	Milk	90	2	f45f12af-3725-4ca7-b054-68ece45f9b33
a247ffd8-cd84-4d85-838f-90f1783a7bb9	560999f6-231e-4d1d-8b68-1076547dfc41	Milk	90	2	f45f12af-3725-4ca7-b054-68ece45f9b33
9865c199-2305-4af9-a514-8ea7d4d51ede	49decf67-c20b-4efb-b531-c2a873f605ac	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
19d3c9d8-3834-43f8-88a4-988cfe5d38f4	8dda7025-d2ed-4ea5-969b-46d7ff6dbdae	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
5aa64e59-c989-43c1-88f9-fcb9b4a75a26	f6c24f0c-e383-4873-8e4b-24d727c7dfd5	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
1e2c3ed9-258d-4cd7-9492-f1a0e6b4b5a3	13ada0bd-9645-4cef-8955-cbf4d2610929	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
2bf1df55-29ef-475b-8a6a-9aad81f3784c	fcccb9a0-e13c-4e90-bb69-b355db546358	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
6a8f477d-81ce-4f4b-b6ca-8f2cb669bc21	3df2233b-45ac-499b-b0e7-77976b6a36a6	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
e24208f1-4f95-428f-ac0e-3a1c8eb8610c	2045a40b-4977-4f40-a3fb-1056195953f0	Test Product	100	1	1c6c1349-ad82-47df-bc89-a0a5c669bc8b
7c8cfd98-672f-4ab3-8a8f-f160a9178253	a1e3f27b-de38-4133-87fc-eff8354d6806	Test Product	100	1	de115b20-d38e-44a0-9e87-f4b0500c304e
a210a54d-88aa-4de2-96e5-920b8b3682ff	6aa48881-ed0d-4e96-9866-81cba1d4e558	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
8ca6ab07-f3ec-42c6-8987-ec95c1e2f899	362407bf-c542-44b5-8720-602499e0f6fb	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
88d3d0bc-2fad-456d-997c-8c6274f85f10	370782a0-6088-4eff-954e-a905c3641c49	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
be401516-679c-4441-8fde-f6cd363d1a4c	318869ba-1d62-4512-87fc-bce93acce47b	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
de18a00b-fb75-4a18-9d3b-ff14f558737d	63485c94-7bc6-46b5-bef0-6620b005cd3f	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
89bb5d50-4a77-4071-b9b9-eb3f8c774bdc	07008c76-3768-47a5-8d16-40b8bfbd5d2f	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
dd7505ec-ef6b-4a3a-873e-b1e14478e5a7	9fbe9c37-711d-4c4f-b4b4-45f8e51777ff	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
def266d8-ad75-4f44-83de-a2e273337191	c771d27b-ce56-4025-a453-b6f39c0a7126	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
b43195bf-21d1-46b1-9585-3078f1f88613	0d236f38-ab01-443f-9681-5472c536bbc6	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
4ed138c9-24f9-4570-9a5c-19686ab7268a	cc12defb-3292-48f5-a266-89283db66f77	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
33abd09b-a6ef-4275-b831-20832fd7e548	02fadb83-e0c9-41df-9026-3ecc72c7b8ad	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
3bbfda17-db47-434a-a035-d661543a2342	6c60d5f3-27e7-469f-b2fa-a10c401cf4e0	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
142d6339-07d5-4027-a2f0-a5ad37c90c39	27bf52ca-d2e6-4e44-bd34-1a3befd9c3ac	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
bd1b51b3-721f-4584-9f2d-22bde1a9217d	2d1e87ff-d8a5-49b8-927b-6e69e2036b26	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
d45c43e1-9ac0-4d4c-a8cc-4b0388a66be5	c78c3994-030e-4f63-a2d1-359aeee2f0f3	Milk	90	1	f45f12af-3725-4ca7-b054-68ece45f9b33
ab5e493c-d487-4a06-96a0-aee8f29fabe2	fb91bf6b-1adb-410b-a98d-47d6e41af802	Test Item 1 KES	1	1	f7cd7e71-0949-4919-b428-fc81612220dd
df4d82fb-ffaa-43b0-83a1-ea3306ff5d05	ba034e21-775c-4486-9ae8-ce71a567e95c	Test Item 1 KES	1	1	f7cd7e71-0949-4919-b428-fc81612220dd
e2c218be-c07b-4a4d-8a9b-41081fe11919	5d21d8da-4612-4e29-83f6-68d5e77dcef2	Test Item 1 KES	1	1	f7cd7e71-0949-4919-b428-fc81612220dd
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.orders (id, order_number, customer_id, business_id, status, subtotal, delivery_fee, total_amount, delivery_coordinates, requires_deposit, deposit_amount, created_at) FROM stdin;
560999f6-231e-4d1d-8b68-1076547dfc41	HK-000004	06f12134-0bd2-4f4d-a9c1-f59a5e2189af	b03f3d97-a285-4377-b750-2aa9cb60c5ed	accepted	180	0	180	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 15:36:45.689054
49decf67-c20b-4efb-b531-c2a873f605ac	HK-000005	856e8729-4d72-4bee-b555-e9b410436420	b03f3d97-a285-4377-b750-2aa9cb60c5ed	cancelled	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 15:36:55.983563
8dda7025-d2ed-4ea5-969b-46d7ff6dbdae	HK-000006	26459185-29b8-4152-b553-8fc6916efb2e	b03f3d97-a285-4377-b750-2aa9cb60c5ed	cancelled	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 15:37:45.330461
f6c24f0c-e383-4873-8e4b-24d727c7dfd5	HK-000007	2aab7654-fb04-41b4-8d1e-5eaf953daf2e	b03f3d97-a285-4377-b750-2aa9cb60c5ed	cancelled	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 15:38:05.632247
6aa48881-ed0d-4e96-9866-81cba1d4e558	HK-000013	c4ff9bcc-61cd-4dfb-b5fb-76a0b38e44bf	b03f3d97-a285-4377-b750-2aa9cb60c5ed	payment_pending	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 18:37:42.082045
7370a10a-91bf-42f3-bb82-7a5a0233bc98	HK-000003	06f12134-0bd2-4f4d-a9c1-f59a5e2189af	b03f3d97-a285-4377-b750-2aa9cb60c5ed	payment_pending	180	0	180	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 15:36:39.866916
9fbe9c37-711d-4c4f-b4b4-45f8e51777ff	HK-000019	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	b03f3d97-a285-4377-b750-2aa9cb60c5ed	payment_pending	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 18:55:21.564171
fb91bf6b-1adb-410b-a98d-47d6e41af802	HK-000028	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	b03f3d97-a285-4377-b750-2aa9cb60c5ed	payment_pending	1	0	1	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 20:31:28.282622
13ada0bd-9645-4cef-8955-cbf4d2610929	HK-000008	70fbfcda-0981-4629-aecd-49dd05b94d62	b03f3d97-a285-4377-b750-2aa9cb60c5ed	dispute_review	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 16:13:06.002585
6c60d5f3-27e7-469f-b2fa-a10c401cf4e0	HK-000024	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	b03f3d97-a285-4377-b750-2aa9cb60c5ed	payment_pending	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 20:14:46.522452
362407bf-c542-44b5-8720-602499e0f6fb	HK-000014	c4ff9bcc-61cd-4dfb-b5fb-76a0b38e44bf	b03f3d97-a285-4377-b750-2aa9cb60c5ed	payment_pending	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 18:39:39.525777
c771d27b-ce56-4025-a453-b6f39c0a7126	HK-000020	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	b03f3d97-a285-4377-b750-2aa9cb60c5ed	payment_pending	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 18:56:57.147435
370782a0-6088-4eff-954e-a905c3641c49	HK-000015	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	b03f3d97-a285-4377-b750-2aa9cb60c5ed	payment_pending	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 18:41:26.859067
fcccb9a0-e13c-4e90-bb69-b355db546358	HK-000009	6d1bde9a-f95c-4663-8c3e-f15b9e6cbdc5	b03f3d97-a285-4377-b750-2aa9cb60c5ed	paid	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 16:19:45.84009
3df2233b-45ac-499b-b0e7-77976b6a36a6	HK-000010	6d1bde9a-f95c-4663-8c3e-f15b9e6cbdc5	b03f3d97-a285-4377-b750-2aa9cb60c5ed	paid	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 16:20:05.73774
27bf52ca-d2e6-4e44-bd34-1a3befd9c3ac	HK-000025	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	b03f3d97-a285-4377-b750-2aa9cb60c5ed	payment_pending	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 20:19:31.675827
318869ba-1d62-4512-87fc-bce93acce47b	HK-000016	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	b03f3d97-a285-4377-b750-2aa9cb60c5ed	payment_pending	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 18:50:07.475265
2045a40b-4977-4f40-a3fb-1056195953f0	HK-000011	06f12134-0bd2-4f4d-a9c1-f59a5e2189af	010fbaf6-2caf-40a2-8566-806f5bb2e075	payment_pending	100	0	100	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 17:36:08.278069
0d236f38-ab01-443f-9681-5472c536bbc6	HK-000021	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	b03f3d97-a285-4377-b750-2aa9cb60c5ed	paid	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 18:59:06.5954
a1e3f27b-de38-4133-87fc-eff8354d6806	HK-000012	06f12134-0bd2-4f4d-a9c1-f59a5e2189af	3e5553fe-9be2-44a0-a9a7-2560e4d57a42	payment_pending	100	0	100	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 17:37:49.846494
63485c94-7bc6-46b5-bef0-6620b005cd3f	HK-000017	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	b03f3d97-a285-4377-b750-2aa9cb60c5ed	payment_pending	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 18:52:58.633755
ba034e21-775c-4486-9ae8-ce71a567e95c	HK-000029	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	b03f3d97-a285-4377-b750-2aa9cb60c5ed	paid	1	0	1	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 20:34:29.086197
cc12defb-3292-48f5-a266-89283db66f77	HK-000022	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	b03f3d97-a285-4377-b750-2aa9cb60c5ed	payment_pending	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 20:09:16.62751
07008c76-3768-47a5-8d16-40b8bfbd5d2f	HK-000018	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	b03f3d97-a285-4377-b750-2aa9cb60c5ed	payment_pending	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 18:55:02.506647
2d1e87ff-d8a5-49b8-927b-6e69e2036b26	HK-000026	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	b03f3d97-a285-4377-b750-2aa9cb60c5ed	payment_pending	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 20:20:42.205955
02fadb83-e0c9-41df-9026-3ecc72c7b8ad	HK-000023	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	b03f3d97-a285-4377-b750-2aa9cb60c5ed	payment_pending	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 20:10:28.571536
c78c3994-030e-4f63-a2d1-359aeee2f0f3	HK-000027	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	b03f3d97-a285-4377-b750-2aa9cb60c5ed	payment_pending	90	0	90	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 20:28:49.915486
5d21d8da-4612-4e29-83f6-68d5e77dcef2	HK-000030	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	b03f3d97-a285-4377-b750-2aa9cb60c5ed	payment_pending	1	0	1	0101000020E6100000295C8FC2F56842407B14AE47E17AF4BF	f	\N	2026-06-30 20:36:40.217499
\.


--
-- Data for Name: payment_attempts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_attempts (id, payment_id, attempt_number, provider_response, status, created_at) FROM stdin;
0a44336e-fdd0-47f3-87aa-40ad376f43d5	f6f5937c-751c-4c50-ad5a-ffc40fe728b4	1	{"error": "Client error '404 Not Found' for url 'https://sandbox.intasend.com/api/v1/payment/stk-push/'\\nFor more information check: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404"}	failed	2026-06-30 16:19:46.598161
eb026718-9fda-49fb-b820-a419f716c1b4	a65dac0b-5534-4353-908d-344c84a1e8da	1	{"error": "Client error '404 Not Found' for url 'https://sandbox.intasend.com/api/v1/payment/stk-push/'\\nFor more information check: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404"}	failed	2026-06-30 16:20:06.462667
bf91eb61-875c-4019-89ce-3a1db3872819	f2c0ffbb-34b1-4b0d-b744-6d108a97438c	1	null	initiated	2026-06-30 17:36:08.56503
f9a453f9-6367-4139-88cc-109dc12d2174	f2c0ffbb-34b1-4b0d-b744-6d108a97438c	1	{"error": "Client error '404 Not Found' for url 'https://sandbox.intasend.com/api/v1/payment/stk-push/'\\nFor more information check: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404"}	failed	2026-06-30 17:36:09.795257
be466872-4733-4769-a30a-fc342073e01c	035d4ec3-2a58-4639-ae76-9be6b0ea3af4	1	null	initiated	2026-06-30 17:37:50.012293
41d76bbd-4f27-4e64-a7db-beff467f0803	035d4ec3-2a58-4639-ae76-9be6b0ea3af4	1	{"error": "Client error '404 Not Found' for url 'https://sandbox.intasend.com/api/v1/payment/stk-push/'\\nFor more information check: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404"}	failed	2026-06-30 17:37:55.443441
06236c2e-fe4c-46a2-b984-08a3ade70ad6	54412579-2cf1-4615-be7d-7bba4f91aaf7	1	null	initiated	2026-06-30 18:37:43.104336
c4674e8a-d5d0-43b6-84c2-a9c230fdabd5	54412579-2cf1-4615-be7d-7bba4f91aaf7	1	{"error": "IntaSend STK Push failed: <!DOCTYPE html>\\n\\n\\n\\n<html lang=\\"en\\">\\n\\n<head>\\n    <meta charset=\\"utf-8\\">\\n    <meta http-equiv=\\"X-UA-Compatible\\" content=\\"IE=edge\\">\\n    <meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1\\">\\n    <meta name=\\"description\\" content=\\"\\">\\n    <meta name=\\"author\\" content=\\"\\">\\n    <title>Make payment with IntaSend</title>\\n\\n    <!-- MAIN CSS -->\\n    \\n<link href=\\"https://intasend-staging-static.s3.amazonaws.com/css/tailwind.css\\" rel=\\"stylesheet\\" type=\\"text/css\\" />\\n    <link rel=\\"stylesheet\\" href=\\"https://intasend-staging-static.s3.amazonaws.com/css/theme.css\\">\\n    \\n    \\n</head>\\n\\n<body class=\\"bg-base-200 overflow-auto\\">\\n    <!-- BEGIN CONTAINER -->\\n    <div class=\\"flex flex-col\\">\\n        <div class=\\"self-center flex flex-row min-h-screen px-2 lg:px-0\\">\\n            <div class=\\"self-center flex flex-col\\">\\n                <div class=\\"flex flex-col text-center space-y-6\\">\\n                    <div class=\\"w-full text-gray-700\\">\\n                        \\n<div class=\\"text-6xl\\">\\n    404\\n</div>\\n<div class=\\"text-2xl\\">\\n    Page not found\\n</div>\\n\\n                    </div>\\n                    <div class=\\"w-full space-x-4\\">\\n                        \\n                        \\n<a href=\\"https://intasend.com/contact\\" target=\\"_blank\\" \\n    class=\\"btn btn-sm btn-light \\">\\n    \\n    <span class=\\"\\">\\n    Contact support\\n    </span>\\n</a>\\n\\n\\n                    </div>\\n                </div>\\n                \\n<!-- <div class=\\"py-4 hidden lg:flex\\">\\n    <img src=\\"https://intasend-staging-static.s3.amazonaws.com/img/intasend-trust-light.png\\" class=\\"w-2/3 h-auto\\" alt=\\"IntaSend trust badge\\" />\\n</div> -->\\n            </div>\\n        </div>\\n    </div>\\n\\n    <!-- Bootstrap Core JavaScript -->\\n    \\n\\n<script src=\\"https://code.jquery.com/jquery-3.6.0.min.js\\" crossorigin=\\"anonymous\\">\\n</script>\\n\\n<!-- IntaSend Inline SDK Setup -->\\n<script src=\\"https://unpkg.com/intasend-inlinejs-sdk@4.0.7/build/intasend-inline.js\\"></script>\\n    \\n    \\n</body>\\n\\n</html>"}	failed	2026-06-30 18:37:45.249515
60bf133e-db48-455e-b128-cd527d71d748	2004a66e-2eff-425f-81c5-8180b6b626b0	1	null	initiated	2026-06-30 18:39:40.480129
3d460616-3d49-4c14-8601-5577ab60a9f2	2004a66e-2eff-425f-81c5-8180b6b626b0	1	{"error": "IntaSend STK Push failed: {\\"type\\":\\"client_error\\",\\"errors\\":[{\\"code\\":\\"authentication_failed\\",\\"detail\\":\\"Session expired\\",\\"attr\\":null}]}"}	failed	2026-06-30 18:39:41.394947
aa51efa5-0da1-4b9d-9895-29bf1239eca6	b601b660-0e3e-4ec4-868c-7328bdca1538	1	null	initiated	2026-06-30 18:41:27.832215
1a51d9cf-8af0-4f93-96d7-2fce5bdcec39	b601b660-0e3e-4ec4-868c-7328bdca1538	1	{"error": "IntaSend STK Push failed: {\\"type\\":\\"client_error\\",\\"errors\\":[{\\"code\\":\\"method_not_allowed\\",\\"detail\\":\\"Method \\\\\\"POST\\\\\\" not allowed.\\",\\"attr\\":null}]}"}	failed	2026-06-30 18:41:29.282963
4ec309f3-84fd-4431-9de2-0c2f37faa9c5	a41ccf5b-a180-43b9-8953-07b9c99cba6a	1	null	initiated	2026-06-30 18:50:08.47549
a1d33010-09f5-4e15-a1cf-5d39314a1640	a41ccf5b-a180-43b9-8953-07b9c99cba6a	1	{"error": "IntaSend Checkout failed: <!DOCTYPE html>\\n\\n\\n\\n<html lang=\\"en\\">\\n\\n<head>\\n    <meta charset=\\"utf-8\\">\\n    <meta http-equiv=\\"X-UA-Compatible\\" content=\\"IE=edge\\">\\n    <meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1\\">\\n    <meta name=\\"description\\" content=\\"\\">\\n    <meta name=\\"author\\" content=\\"\\">\\n    <title>Make payment with IntaSend</title>\\n\\n    <!-- MAIN CSS -->\\n    \\n<link href=\\"https://intasend-staging-static.s3.amazonaws.com/css/tailwind.css\\" rel=\\"stylesheet\\" type=\\"text/css\\" />\\n    <link rel=\\"stylesheet\\" href=\\"https://intasend-staging-static.s3.amazonaws.com/css/theme.css\\">\\n    \\n    \\n</head>\\n\\n<body class=\\"bg-base-200 overflow-auto\\">\\n    <!-- BEGIN CONTAINER -->\\n    <div class=\\"flex flex-col\\">\\n        <div class=\\"self-center flex flex-row min-h-screen px-2 lg:px-0\\">\\n            <div class=\\"self-center flex flex-col\\">\\n                <div class=\\"flex flex-col text-center space-y-6\\">\\n                    <div class=\\"w-full text-gray-700\\">\\n                        \\n<div class=\\"text-6xl\\">\\n    404\\n</div>\\n<div class=\\"text-2xl\\">\\n    Page not found\\n</div>\\n\\n                    </div>\\n                    <div class=\\"w-full space-x-4\\">\\n                        \\n                        \\n<a href=\\"https://intasend.com/contact\\" target=\\"_blank\\" \\n    class=\\"btn btn-sm btn-light \\">\\n    \\n    <span class=\\"\\">\\n    Contact support\\n    </span>\\n</a>\\n\\n\\n                    </div>\\n                </div>\\n                \\n<!-- <div class=\\"py-4 hidden lg:flex\\">\\n    <img src=\\"https://intasend-staging-static.s3.amazonaws.com/img/intasend-trust-light.png\\" class=\\"w-2/3 h-auto\\" alt=\\"IntaSend trust badge\\" />\\n</div> -->\\n            </div>\\n        </div>\\n    </div>\\n\\n    <!-- Bootstrap Core JavaScript -->\\n    \\n\\n<script src=\\"https://code.jquery.com/jquery-3.6.0.min.js\\" crossorigin=\\"anonymous\\">\\n</script>\\n\\n<!-- IntaSend Inline SDK Setup -->\\n<script src=\\"https://unpkg.com/intasend-inlinejs-sdk@4.0.7/build/intasend-inline.js\\"></script>\\n    \\n    \\n</body>\\n\\n</html>"}	failed	2026-06-30 18:50:10.16822
a3c33795-d793-46d5-ba1e-310533985006	eb3d0bd7-6759-464c-b918-b234dce6a316	1	null	initiated	2026-06-30 18:52:59.560648
c6d98ecf-d5a4-4020-8ffd-7688e5eb75c2	4e8459bf-f549-4f33-aa51-39aa5c76166b	1	null	initiated	2026-06-30 18:55:03.43544
34fdbc5c-e408-4224-9e53-41f7a83f632c	d4f5ff0b-6fbb-4213-adba-e097813ae93c	1	null	initiated	2026-06-30 18:55:22.376356
b243dca1-a64d-4f4c-ae61-8840635f0cb0	13f81bcb-fb16-45df-b414-9d96a95a099a	1	null	initiated	2026-06-30 18:57:36.887967
de0e4f69-d832-4fea-8e6e-991298614665	b03d39f9-960d-4793-bbb0-965228d182dc	1	null	initiated	2026-06-30 18:59:07.346749
5fb12150-2730-4a4e-a423-ee73b696cab4	b03d39f9-960d-4793-bbb0-965228d182dc	2	null	initiated	2026-06-30 18:59:20.387956
6955eaba-704c-49fb-a67e-98816569fee5	bb6d932c-3414-4eba-9bed-ee550ec1b041	1	null	initiated	2026-06-30 20:09:17.119803
83aa6bc0-2d80-4fe7-b285-fd007d1dd680	bb6d932c-3414-4eba-9bed-ee550ec1b041	1	{"error": "IntaSend Checkout failed: <!DOCTYPE html>\\n\\n\\n\\n<html lang=\\"en\\">\\n\\n<head>\\n    <meta charset=\\"utf-8\\">\\n    <meta http-equiv=\\"X-UA-Compatible\\" content=\\"IE=edge\\">\\n    <meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1\\">\\n    <meta name=\\"description\\" content=\\"\\">\\n    <meta name=\\"author\\" content=\\"\\">\\n    <title>Make payment with IntaSend</title>\\n\\n    <!-- MAIN CSS -->\\n    \\n<link href=\\"https://intasend-staging-static.s3.amazonaws.com/css/tailwind.css\\" rel=\\"stylesheet\\" type=\\"text/css\\" />\\n    <link rel=\\"stylesheet\\" href=\\"https://intasend-staging-static.s3.amazonaws.com/css/theme.css\\">\\n    \\n    \\n</head>\\n\\n<body class=\\"bg-base-200 overflow-auto\\">\\n    <!-- BEGIN CONTAINER -->\\n    <div class=\\"flex flex-col\\">\\n        <div class=\\"self-center flex flex-row min-h-screen px-2 lg:px-0\\">\\n            <div class=\\"self-center flex flex-col\\">\\n                <div class=\\"flex flex-col text-center space-y-6\\">\\n                    <div class=\\"w-full text-gray-700\\">\\n                        \\n<div class=\\"text-6xl\\">\\n    404\\n</div>\\n<div class=\\"text-2xl\\">\\n    Page not found\\n</div>\\n\\n                    </div>\\n                    <div class=\\"w-full space-x-4\\">\\n                        \\n                        \\n<a href=\\"https://intasend.com/contact\\" target=\\"_blank\\" \\n    class=\\"btn btn-sm btn-light \\">\\n    \\n    <span class=\\"\\">\\n    Contact support\\n    </span>\\n</a>\\n\\n\\n                    </div>\\n                </div>\\n                \\n<!-- <div class=\\"py-4 hidden lg:flex\\">\\n    <img src=\\"https://intasend-staging-static.s3.amazonaws.com/img/intasend-trust-light.png\\" class=\\"w-2/3 h-auto\\" alt=\\"IntaSend trust badge\\" />\\n</div> -->\\n            </div>\\n        </div>\\n    </div>\\n\\n    <!-- Bootstrap Core JavaScript -->\\n    \\n\\n<script src=\\"https://code.jquery.com/jquery-3.6.0.min.js\\" crossorigin=\\"anonymous\\">\\n</script>\\n\\n<!-- IntaSend Inline SDK Setup -->\\n<script src=\\"https://unpkg.com/intasend-inlinejs-sdk@4.0.7/build/intasend-inline.js\\"></script>\\n    \\n    \\n</body>\\n\\n</html>"}	failed	2026-06-30 20:09:17.932324
264181ab-ce08-49d8-ad62-448544b46b52	f9fd2e3a-64d3-4501-ab27-33f1f7339aef	1	null	initiated	2026-06-30 20:10:29.08848
796bad3a-d697-481e-b02a-c4aeee11b2d0	16c43bfc-6a64-47e1-8445-5c0b684e90b5	1	null	initiated	2026-06-30 20:14:47.063057
eee03900-860a-4213-8c3a-7b8d78a0bc6c	16c43bfc-6a64-47e1-8445-5c0b684e90b5	2	null	initiated	2026-06-30 20:15:18.715995
8769326b-bd67-4d7c-994f-73ec6ad3a849	16c43bfc-6a64-47e1-8445-5c0b684e90b5	3	null	initiated	2026-06-30 20:15:59.06554
e913b494-d16c-4ffa-a8df-09afa4749dd8	bb6d932c-3414-4eba-9bed-ee550ec1b041	3	null	initiated	2026-06-30 20:18:06.128742
b19710bd-2cfc-459f-b005-e08c4ce41e50	bb6d932c-3414-4eba-9bed-ee550ec1b041	4	null	initiated	2026-06-30 20:18:49.89317
bb60e131-a7fe-48a8-bb7f-ad649aafc5be	72916c3e-d5cf-4d2e-94a8-94f04c5bf244	1	null	initiated	2026-06-30 20:19:32.117959
195f2ea8-cd19-4d84-8da8-a0255152f1ea	a417493f-e6ae-4b6c-a2a5-790d2cf9136a	1	null	initiated	2026-06-30 20:20:42.752342
91f05d02-5673-4acc-8ea0-c95e833f35eb	0c5b4374-83a7-4ee6-802d-9860232302bf	1	null	initiated	2026-06-30 20:28:50.404946
e330c42a-4c8b-4037-90ae-eedb06b4df26	120e0767-c834-44a9-8f48-62e6ad68090e	1	null	initiated	2026-06-30 20:31:28.679589
b7f9f47e-f9b3-4108-9adc-1432bd53cc60	6569e068-6934-4d68-8f65-c5a83a33d7d8	1	null	initiated	2026-06-30 20:34:29.852378
8e6ee75c-71bb-4b06-8f77-205e1a9a6fc1	4080eb13-3a83-4dfb-9507-f7f7fc502c4e	1	null	initiated	2026-06-30 20:36:40.724551
\.


--
-- Data for Name: payment_methods; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.payment_methods (id, business_id, type, encrypted_account_number, last_four_digits, is_active, effective_from, effective_to) FROM stdin;
b9870f45-fc7c-4ed0-867c-a3031a1a0b6a	f9680f9a-5412-424b-ab1c-e6441059d046	till	123456	3456	t	2026-06-30 15:12:37.388774	\N
3e1bf6f7-2eb1-4e5a-bee1-cab92686ad84	b03f3d97-a285-4377-b750-2aa9cb60c5ed	till	123456	3456	t	2026-06-30 15:14:52.178609	\N
75728687-4c4b-49b9-a77f-ceb5c28bfde0	78eecc19-cc12-41b4-b274-c12f560881d4	till	111111	1111	t	2026-06-30 15:25:19.139656	\N
ba079805-ba1e-4717-867e-8f4d57a4e3ae	fc2be946-7d8e-4eda-bf6d-f714a7cec5b7	till	000000	0000	t	2026-06-30 15:32:33.582964	\N
e810ec0c-7dfc-46b7-9532-8155acf153a8	010fbaf6-2caf-40a2-8566-806f5bb2e075	till	123456	3456	t	2026-06-30 17:36:07.327054	\N
b0c57ca5-cbaa-4f12-a40f-1cc88e9a6a3d	3e5553fe-9be2-44a0-a9a7-2560e4d57a42	till	123456	3456	t	2026-06-30 17:37:48.966959	\N
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.payments (id, order_id, provider, provider_reference, idempotency_key, amount, payment_type, status, provider_specific_data, last_checked_at, created_at) FROM stdin;
f6f5937c-751c-4c50-ad5a-ffc40fe728b4	fcccb9a0-e13c-4e90-bb69-b355db546358	INTASEND	simulated-b8d52e06-3b95-4bc5-9efa-1b832c17358d	f81347e7-832f-468f-8d11-a396cbafddbe	90	FINAL_PAYMENT	verified	\N	\N	2026-06-30 19:20:48.51972
a65dac0b-5534-4353-908d-344c84a1e8da	3df2233b-45ac-499b-b0e7-77976b6a36a6	INTASEND	\N	22c238c9-40dc-4a62-bace-3a24235128f9	90	FINAL_PAYMENT	verified	\N	\N	2026-06-30 19:20:48.51972
f2c0ffbb-34b1-4b0d-b744-6d108a97438c	2045a40b-4977-4f40-a3fb-1056195953f0	INTASEND	\N	c3234924-25a1-46f2-a8b2-675fbe944b4f	100	FINAL_PAYMENT	pending	\N	\N	2026-06-30 20:36:08.485648
035d4ec3-2a58-4639-ae76-9be6b0ea3af4	a1e3f27b-de38-4133-87fc-eff8354d6806	INTASEND	\N	dd1b213e-4067-4ff6-83fc-d82fdc3a0685	100	FINAL_PAYMENT	pending	\N	\N	2026-06-30 20:37:49.97989
54412579-2cf1-4615-be7d-7bba4f91aaf7	6aa48881-ed0d-4e96-9866-81cba1d4e558	INTASEND	\N	e3d1635c-f6ef-4708-8933-f49d31c89d68	90	FINAL_PAYMENT	pending	\N	\N	2026-06-30 21:37:43.064983
2004a66e-2eff-425f-81c5-8180b6b626b0	362407bf-c542-44b5-8720-602499e0f6fb	INTASEND	\N	8a50f986-18be-41ce-afc1-4c2e6a376f58	90	FINAL_PAYMENT	pending	\N	\N	2026-06-30 21:39:40.446026
b601b660-0e3e-4ec4-868c-7328bdca1538	370782a0-6088-4eff-954e-a905c3641c49	INTASEND	\N	16a1a156-32a0-4f14-b28d-8b0c9cec3c92	90	FINAL_PAYMENT	pending	\N	\N	2026-06-30 21:41:27.800612
a41ccf5b-a180-43b9-8953-07b9c99cba6a	318869ba-1d62-4512-87fc-bce93acce47b	INTASEND	\N	75b93026-1648-42fd-8d2b-93f33ee4e5e8	90	FINAL_PAYMENT	pending	\N	\N	2026-06-30 21:50:08.436631
eb3d0bd7-6759-464c-b918-b234dce6a316	63485c94-7bc6-46b5-bef0-6620b005cd3f	INTASEND	mock-662be399-f6da-4b09-975f-d1f0d130d911	3740d8dd-6363-4672-b62c-7a05dcefed09	90	FINAL_PAYMENT	pending	\N	\N	2026-06-30 21:52:59.515237
4e8459bf-f549-4f33-aa51-39aa5c76166b	07008c76-3768-47a5-8d16-40b8bfbd5d2f	INTASEND	mock-4b0e9770-1b25-44e9-b9aa-780ca2126904	b1bd969c-c359-4e18-a69a-45ca9ecbea31	90	FINAL_PAYMENT	pending	\N	\N	2026-06-30 21:55:03.400429
d4f5ff0b-6fbb-4213-adba-e097813ae93c	9fbe9c37-711d-4c4f-b4b4-45f8e51777ff	INTASEND	mock-3444e570-4d6e-4865-92a8-a7a584a9f24f	0e0df8af-4a60-4e58-bc44-b765854905b1	90	FINAL_PAYMENT	pending	\N	\N	2026-06-30 21:55:22.342603
13f81bcb-fb16-45df-b414-9d96a95a099a	c771d27b-ce56-4025-a453-b6f39c0a7126	INTASEND	mock-3677b514-9cf5-48bd-b668-60a837ecb1c1	72b3061c-79fb-4d43-864d-d51a7c8365fd	90	FINAL_PAYMENT	pending	\N	\N	2026-06-30 21:57:36.824439
b03d39f9-960d-4793-bbb0-965228d182dc	0d236f38-ab01-443f-9681-5472c536bbc6	INTASEND	mock-5d29743e-f181-4722-a1bb-af3bc960b873	8a2a6dac-8948-4667-ba0f-ccd2fa62c834	90	FINAL_PAYMENT	verified	\N	\N	2026-06-30 21:59:07.337884
f9fd2e3a-64d3-4501-ab27-33f1f7339aef	02fadb83-e0c9-41df-9026-3ecc72c7b8ad	INTASEND	406ae952-a717-46d1-813b-3daec5a4ac5a	88177d1a-98c3-410c-af19-0ac8fe543642	90	FINAL_PAYMENT	pending	\N	\N	2026-06-30 23:10:29.062428
16c43bfc-6a64-47e1-8445-5c0b684e90b5	6c60d5f3-27e7-469f-b2fa-a10c401cf4e0	INTASEND	0f64e44d-fa64-47a0-a308-30878b435687	a7f4a958-2f1a-4bc0-856f-005260faf4fd	90	FINAL_PAYMENT	pending	\N	\N	2026-06-30 23:14:47.037457
bb6d932c-3414-4eba-9bed-ee550ec1b041	cc12defb-3292-48f5-a266-89283db66f77	INTASEND	bd6ec9a0-eb0b-47ee-8f00-0eab2f701f96	1701d5a7-43ee-4c5b-8a22-85a1d50cc1a8	90	FINAL_PAYMENT	pending	\N	\N	2026-06-30 23:09:17.093889
72916c3e-d5cf-4d2e-94a8-94f04c5bf244	27bf52ca-d2e6-4e44-bd34-1a3befd9c3ac	INTASEND	d8d24ee2-2817-4a5a-b4ab-ee84498af686	02a2c9a6-a7f8-4e35-98c3-25e0bf0fa33b	90	FINAL_PAYMENT	pending	\N	\N	2026-06-30 23:19:32.109404
a417493f-e6ae-4b6c-a2a5-790d2cf9136a	2d1e87ff-d8a5-49b8-927b-6e69e2036b26	INTASEND	48584078-c7b8-4143-acd1-be60f18431e2	0d849b2c-9311-437e-9152-26f3b81a881c	90	FINAL_PAYMENT	pending	\N	\N	2026-06-30 23:20:42.725729
0c5b4374-83a7-4ee6-802d-9860232302bf	c78c3994-030e-4f63-a2d1-359aeee2f0f3	INTASEND	9ad5207f-32d9-42a2-b064-a41d33e847f5	c1a542a0-22fb-400c-9c97-afc23a5549cf	90	FINAL_PAYMENT	pending	\N	\N	2026-06-30 23:28:50.37948
120e0767-c834-44a9-8f48-62e6ad68090e	fb91bf6b-1adb-410b-a98d-47d6e41af802	INTASEND	b8272964-d0ba-4a16-8af1-d6645be50368	d2cb1d62-06a0-4d81-b69e-f15037220d13	1	FINAL_PAYMENT	pending	\N	\N	2026-06-30 23:31:28.672532
6569e068-6934-4d68-8f65-c5a83a33d7d8	ba034e21-775c-4486-9ae8-ce71a567e95c	INTASEND	79ce67d6-4eee-4879-877a-41918409f1e7	f3782b2e-0d5b-40d1-b9df-66c0dd9ef953	1	FINAL_PAYMENT	verified	\N	\N	2026-06-30 23:34:29.826893
4080eb13-3a83-4dfb-9507-f7f7fc502c4e	5d21d8da-4612-4e29-83f6-68d5e77dcef2	INTASEND	492ff116-2927-48cd-9c90-41705b9d04ef	3f69e20a-38af-45d9-85dd-e049530b5fd9	1	FINAL_PAYMENT	pending	\N	\N	2026-06-30 23:36:40.698132
0217aec3-e9c8-4094-aa78-5ef078653f32	ba034e21-775c-4486-9ae8-ce71a567e95c	INTASEND	recon-test-b05262d9-28c6-4f4a-acde-39be62361eae	recon-test-key	1	FINAL_PAYMENT	pending	\N	\N	2026-06-30 23:44:08.119373
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.products (id, business_id, name, description, original_price, discount_price, image_url, is_available, deleted_at) FROM stdin;
e2c96f17-15f1-475c-81aa-f3977769c9c2	b03f3d97-a285-4377-b750-2aa9cb60c5ed	Milk 500ml	\N	110	90	\N	t	2026-06-30 15:22:04.785802
e5360057-c39d-44c7-a4f7-d2e57b465008	78eecc19-cc12-41b4-b274-c12f560881d4	Bread	\N	50	\N	\N	t	\N
f45f12af-3725-4ca7-b054-68ece45f9b33	b03f3d97-a285-4377-b750-2aa9cb60c5ed	Milk	\N	100	90	\N	t	\N
1c6c1349-ad82-47df-bc89-a0a5c669bc8b	010fbaf6-2caf-40a2-8566-806f5bb2e075	Test Product	\N	100	\N	\N	t	\N
de115b20-d38e-44a0-9e87-f4b0500c304e	3e5553fe-9be2-44a0-a9a7-2560e4d57a42	Test Product	\N	100	\N	\N	t	\N
f7cd7e71-0949-4919-b428-fc81612220dd	b03f3d97-a285-4377-b750-2aa9cb60c5ed	Test Item 1 KES	\N	1	\N	\N	t	\N
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at) FROM stdin;
998a1612-60d0-444c-ac67-0973b43029d8	cf855762-353f-4bfa-9c6b-c938ec69292e	873cdf1efc9ca33cde29315ff4c010adb9da52472edb3c6701831f71f7809b05	2026-07-30 15:01:13.013105	t	2026-06-30 18:01:12.771353
6a3b1148-5906-4d96-afff-ebfda4197cbe	cf855762-353f-4bfa-9c6b-c938ec69292e	85bd8fc71be5579d3333f086291348c1c8566f782fd3095514d8a33b5d1235cf	2026-07-30 15:02:45.13655	f	2026-06-30 18:02:45.135002
937da643-78c9-4e9c-a9a4-5c4025fe1a05	cf855762-353f-4bfa-9c6b-c938ec69292e	cf643ed6bab9bb1d3d2f18e042d7af94cf009bd531065c7a50461d1498c77c7b	2026-07-30 15:11:02.431538	f	2026-06-30 18:11:02.182623
65e4936f-2946-4618-b77f-d5ba184a4805	f147c221-af05-4be8-8e87-4c6e9f8f13bd	50dcf8817e18358550fc58deffc20235fe093396391d005f75fd577e99bae942	2026-07-30 15:11:59.905236	f	2026-06-30 18:11:59.666836
45379b8c-a3c2-4634-a332-441a609e8503	f147c221-af05-4be8-8e87-4c6e9f8f13bd	ed7b1a7b3d5c4dc470747cc97be389eb4b428fb27dfe4404eadf0b0559909baf	2026-07-30 15:14:05.531235	f	2026-06-30 18:14:05.286537
0f92abe2-5bea-40d0-9d4c-11524401b9c0	cf855762-353f-4bfa-9c6b-c938ec69292e	fbd0bade21aa63ef90bb84c0b65a1a7ca2de2d858e14bc2ee3016d8190a864a8	2026-07-30 15:14:46.343959	f	2026-06-30 18:14:46.106577
17f3e718-a739-4a9e-be20-23fc0e9b8d2e	f147c221-af05-4be8-8e87-4c6e9f8f13bd	0d75fac80d1152b0f70d486ff5840de03391e2f9ccd55fc7086155806575d53a	2026-07-30 15:15:13.778947	f	2026-06-30 18:15:13.417596
4b09a435-ce9a-4aca-a90d-137ef7b4f9bc	cf855762-353f-4bfa-9c6b-c938ec69292e	40cc485f80be70c2effb6d8f3f43812b3c7e8a2d3e8c43fa373cccd31dc1cdd4	2026-07-30 15:16:54.113919	f	2026-06-30 18:16:53.87059
109d39a9-dab4-4db7-84bf-0e2f5f21e229	f147c221-af05-4be8-8e87-4c6e9f8f13bd	cd16840f237672f3591da7c117865a14bbbb4c1659624d686a6f3e68adbb4713	2026-07-30 15:17:18.604257	f	2026-06-30 18:17:18.366225
8c7255ff-b7cd-461e-b4ac-84a22594b107	cf855762-353f-4bfa-9c6b-c938ec69292e	6b9c37e7c9b68fcad2691253047a9ff5fbea889cdc52b9bd92d658b8293cf3ca	2026-07-30 15:20:07.385164	f	2026-06-30 18:20:07.15629
1c6a8aef-6511-4773-b2c7-b99af1697f8b	f147c221-af05-4be8-8e87-4c6e9f8f13bd	3c4010c2cf74fe988d201adcc2a8f45c6036d3a07f042e0ab51fb9c89d218d58	2026-07-30 15:20:45.045367	f	2026-06-30 18:20:44.81736
2e9aaaa1-81a1-4864-9354-ece19e921697	f147c221-af05-4be8-8e87-4c6e9f8f13bd	3d535bae7a6ddda75150ebe7a69265b88e48ffe946bdc57a9d621b6c9b799360	2026-07-30 15:22:04.74832	f	2026-06-30 18:22:04.502344
11fe8090-0e5d-4a2f-a938-d351adb18b90	cf855762-353f-4bfa-9c6b-c938ec69292e	94782e7cc517287e09636b2d5b9b8f23685367ae1b1bd2568281a6e2f2589f35	2026-07-30 15:25:18.980975	f	2026-06-30 18:25:18.715666
a731fb55-5f54-4318-8f2b-c9175cfc8734	cf855762-353f-4bfa-9c6b-c938ec69292e	8d52c259a0df120b5ed53e12d7e46ef5449f8fde80229452f79f6e2e0fd841c0	2026-07-30 15:29:36.713517	f	2026-06-30 18:29:36.470966
0e708c84-4b27-47cd-be3f-fc890d99077a	cf855762-353f-4bfa-9c6b-c938ec69292e	b81fdda7ffbf9261bb6e66e995d5ed6476aa2104ce385d88846ee8dae67aeb3c	2026-07-30 15:31:57.976751	f	2026-06-30 18:31:57.721868
1153781d-25ca-489b-a20f-4b94a503f482	f147c221-af05-4be8-8e87-4c6e9f8f13bd	069d055173b65780d7a0808aa94518d02b05d903bc445d8095dd2958b79310ba	2026-07-30 15:32:33.522871	f	2026-06-30 18:32:33.292249
fac8325a-9b24-4c31-9f31-e57a7d13960a	cf855762-353f-4bfa-9c6b-c938ec69292e	71f1bd723c9020eaf13b1c481636b5f7641570af87dabbeb19d903a666d383bb	2026-07-30 15:36:51.443722	f	2026-06-30 18:36:51.204399
ee9ea5a4-d2b5-4ea8-8981-90ff3fdb1363	f147c221-af05-4be8-8e87-4c6e9f8f13bd	da89b5b859ec38d1ad1365ca4dd78cab5b994bde2ea1155770952bde445a55dd	2026-07-30 15:38:21.285126	f	2026-06-30 18:38:21.053087
c0f03558-76f3-45d6-9494-ea23d73b28e6	cf855762-353f-4bfa-9c6b-c938ec69292e	a04251d2912014ed5c6914166350e38c8525b725175f9962052f3ef7e8536681	2026-07-30 16:05:16.842248	f	2026-06-30 19:05:16.605943
6083a560-f4fc-4c49-a9be-41ab0a8358ea	15298dbf-65d1-4213-93c4-2effe4bbe069	e6f9e5a5271c7ab334be4346136a90ce5a9600234c64036ac91c277cd7918347	2026-07-30 16:07:57.942367	f	2026-06-30 19:07:57.696281
a00bce6f-ec0d-4770-9db5-17a20145aa08	cf855762-353f-4bfa-9c6b-c938ec69292e	25fcd3aef8822b8837d8115133121b7c925bb6acee071c2b7f1319281c25d183	2026-07-30 16:13:06.298144	f	2026-06-30 19:13:06.059074
d778fe93-50ef-4459-a247-ccdd3f7bbd9b	15298dbf-65d1-4213-93c4-2effe4bbe069	d21677f347e1fd492f64c26722f394c40d8ecf5b970322f796664d7b5dd4d63a	2026-07-30 16:13:06.628744	f	2026-06-30 19:13:06.390248
1d66d42b-73f1-4dba-a788-7533db57b218	cf855762-353f-4bfa-9c6b-c938ec69292e	28f02d4238e16a24d359340ab9a5957c1ba927afaac9b825435ec17be9235b3b	2026-07-30 16:19:46.164924	f	2026-06-30 19:19:45.925985
22fc7511-4ff5-4b7d-91d3-e9f571805ff1	15298dbf-65d1-4213-93c4-2effe4bbe069	ee6d181bfb640eef227dad7cef3a47261f335a14f6ac9ca56c8b9b48e4ea9728	2026-07-30 16:19:46.482388	f	2026-06-30 19:19:46.253917
40dd8070-8bab-474f-b15e-9dc0b3994784	cf855762-353f-4bfa-9c6b-c938ec69292e	c6e504700eeead31280e830381670b65233cd17b18d3c2b11b2b30e857427cab	2026-07-30 16:20:06.018899	f	2026-06-30 19:20:05.790119
770eb2f4-c571-4895-a12a-ce0c9f51207a	15298dbf-65d1-4213-93c4-2effe4bbe069	fc4e6d7888f3f3b381b5ff0f02d857a0dc54843d5b5bcd9810a4da498a622619	2026-07-30 16:20:06.394473	f	2026-06-30 19:20:06.151814
049baee6-c6b5-441b-b658-f8c2eec4e1e4	952fe8c4-7212-4500-9884-cc8f76ba4c07	f166b20dc0adc0d6bfb23bbbfc17d6637f04e73393028ec65da737a30aa27625	2026-07-30 16:27:44.217245	f	2026-06-30 19:27:43.975951
bf8a0e5b-9495-4272-89c3-0f014cb54215	952fe8c4-7212-4500-9884-cc8f76ba4c07	a4c2c254468290428cbec670233742fc61651279048682bfc4d7fc97f04f34ea	2026-07-30 16:31:29.652113	f	2026-06-30 19:31:29.413521
8cfc6778-62c3-4ee4-a591-1ebc55dca18b	9e274543-c23e-4373-9167-7cf9b0ea2bfa	d66099162d33cd52b21b6e0fdaed8719891c7b43007b1f2500437f5253ea2261	2026-07-30 17:36:07.251395	f	2026-06-30 20:36:06.844301
9b6ff585-917b-41db-a6e2-589c66b729de	84ac1d7d-6024-4da4-baa3-00c5378b69af	381a32f4d96131483c66bef37a9f3f4a121ef09b7525ca22b10cb52920f8ed8d	2026-07-30 17:36:08.25842	f	2026-06-30 20:36:07.876588
13b011bc-f864-4eee-ae11-8eb9ab309acd	02b77dc6-4011-4078-9ff3-cb474c1273e7	ea9ad70f2d22d5e655c829b002eeaa998eb5624a528ab27fa8f807e65ad9ae01	2026-07-30 17:37:48.893293	f	2026-06-30 20:37:48.486244
f6c61e69-6d5e-4f99-a46c-78d294ae5779	43c42949-469d-4f98-8024-83b1e72620b1	aad6555a00fea9cdea87ed6f15a7c5fc06b2d16360affc79b62b867b18304389	2026-07-30 17:37:49.825483	f	2026-06-30 20:37:49.438
f6e73e97-86b1-4dd9-a843-ec8dfc5f67d9	cf855762-353f-4bfa-9c6b-c938ec69292e	5f92a1f782b619f7c6d049133df3ef72b9203c4c2bdf0f9933bf65494c95e975	2026-07-30 18:37:42.024913	f	2026-06-30 21:37:41.556203
abd36997-0776-4708-98a0-b2336db575cf	15298dbf-65d1-4213-93c4-2effe4bbe069	2c54e3f969d8e80b5bfe8501fa02328f0472a84ae286cc2b91b5e5b1ef306f72	2026-07-30 18:37:42.914285	f	2026-06-30 21:37:42.468517
9cfd243e-38e4-41ac-90f7-2e478a0d002f	cf855762-353f-4bfa-9c6b-c938ec69292e	1741a52bd8339902f258b8b61a949a129ab295344974802be14163a7ca636f34	2026-07-30 18:39:39.472654	f	2026-06-30 21:39:39.044992
675890cf-7678-485a-ab28-09e1b00913f6	15298dbf-65d1-4213-93c4-2effe4bbe069	09a24fdb4c543e4615b5e011147cd31c574b348d66bae80a3a10a508316a08db	2026-07-30 18:39:40.33364	f	2026-06-30 21:39:39.873206
5b1527ec-bb68-4dbe-9395-e9ad71138e4f	cf855762-353f-4bfa-9c6b-c938ec69292e	c7dfc3c930d62f74905e96ee71cabaa40dfb894518834d4f5edf1d274a928673	2026-07-30 18:41:26.798758	f	2026-06-30 21:41:26.336091
1079cdd1-b266-45e1-bf5e-310976c38a99	15298dbf-65d1-4213-93c4-2effe4bbe069	a8274ab9903c110f4a451322ff11ae9895ad06f95bc572a3faf672dd5def5852	2026-07-30 18:41:27.689671	f	2026-06-30 21:41:27.196263
3e7a8ef9-03e2-4491-aa99-680c49327cd7	cf855762-353f-4bfa-9c6b-c938ec69292e	26c85c4f80b90aae4a60cfa94727180d23eafd93d031ef08729315df1caf6635	2026-07-30 18:50:07.422734	f	2026-06-30 21:50:06.905027
43715768-27b8-49cb-a85c-0c020a0f693c	15298dbf-65d1-4213-93c4-2effe4bbe069	87e3c98d27b0822fd6eb6b8aaa977b2b7be705cc6973f0812efb04a9785474e5	2026-07-30 18:50:08.320018	f	2026-06-30 21:50:07.834914
49f19fd4-b48b-453e-9e43-d6fd92ca39cb	cf855762-353f-4bfa-9c6b-c938ec69292e	920e9bf6f923cdc46bf3af77a0e993e21aac3db92d50ce4ec21d4e5028991479	2026-07-30 18:52:58.582468	f	2026-06-30 21:52:58.160481
879cb322-1afc-42d1-b6be-53c7b2d5b0bf	15298dbf-65d1-4213-93c4-2effe4bbe069	dff35720374ed4578bea3443c3852b351e9570a8e920601ecbc26bf6954642ed	2026-07-30 18:52:59.403077	f	2026-06-30 21:52:58.942918
eff861fb-f972-4c27-9353-91716178efc9	cf855762-353f-4bfa-9c6b-c938ec69292e	cdd97e32c6d53df14c92bec397dd60b6eee86bcfcb62a9200c205e33346f7641	2026-07-30 18:55:02.455285	f	2026-06-30 21:55:02.04365
92bc9367-b5e9-4f0f-93f9-e8701e3a2212	15298dbf-65d1-4213-93c4-2effe4bbe069	116f565385115c7666f11c5369ae7821fc21dbcc532c04ef518a3f6ced55f1c7	2026-07-30 18:55:03.290907	f	2026-06-30 21:55:02.846397
c90c35e2-89ec-4a83-b2b6-50708a773229	cf855762-353f-4bfa-9c6b-c938ec69292e	c4d1cfe6a7203fd49f3ae5b4934ede8e7037a4166c0d4eae49eee6c90b302764	2026-07-30 18:55:21.510108	f	2026-06-30 21:55:21.013601
c42ff9d6-9b21-4e25-9681-f5516ed206ef	15298dbf-65d1-4213-93c4-2effe4bbe069	dfdfd3fa426570ffeaf146deb2fa82c118dd0d48f8117353aa506c46fffe5472	2026-07-30 18:55:22.225488	f	2026-06-30 21:55:21.782721
6d1a54bd-3cea-49f0-9aa2-ea027b8bf5fa	cf855762-353f-4bfa-9c6b-c938ec69292e	8dc4fffe6cf12dae9b83a5ccf6cfc513e4923322e77b86340e6267f3900e9f56	2026-07-30 18:56:49.203596	f	2026-06-30 21:56:48.720828
02e27afd-04de-43f3-b581-e3d26ebad08e	15298dbf-65d1-4213-93c4-2effe4bbe069	8ad917465dcbd35d49c23e19013a09c9587e10e96633eb7dae1d8d3e9e349d0a	2026-07-30 18:57:22.833598	f	2026-06-30 21:57:22.328393
ea361226-e3fd-4878-a92d-93887231b0dc	cf855762-353f-4bfa-9c6b-c938ec69292e	26d6a05f1a2f847f38285ff3cda696390334f5c16cdc6076e50b869e443ee620	2026-07-30 18:59:06.561965	f	2026-06-30 21:59:06.129401
de64e61d-4681-4e6f-b2a1-48f8b7166187	15298dbf-65d1-4213-93c4-2effe4bbe069	495b261ccaf27bfda9c6edd85632136425b6491e301164ee1bda5eda7bec1b7c	2026-07-30 18:59:07.260773	f	2026-06-30 21:59:06.784292
41a25c1e-a40c-47eb-b057-2354ab637703	cf855762-353f-4bfa-9c6b-c938ec69292e	d32fcd36173ab99f7102f33049e9453fad98b94e4787b0ed0938c7ace41ecbf2	2026-07-30 20:09:16.587778	f	2026-06-30 23:09:16.351761
349d4c36-eafa-4a4f-b6f4-0a889bc0bda5	15298dbf-65d1-4213-93c4-2effe4bbe069	1796841b764361ca6e6cce56376e23345c465e480f489e4e60ad0d1ec9041640	2026-07-30 20:09:17.008155	f	2026-06-30 23:09:16.779016
ee3d1343-9490-46f2-8085-741512f295ab	cf855762-353f-4bfa-9c6b-c938ec69292e	1b4fe67c3d68dcf76f16458535b112543a02ed0e3a2687add3802f830314fc1b	2026-07-30 20:10:28.530293	f	2026-06-30 23:10:28.298727
02443d3b-7b6b-4f8e-98bf-6f8edf8ff6ca	15298dbf-65d1-4213-93c4-2effe4bbe069	2807b57ddab8638006c858ffe469dfb15729f4be345baac0eeaef88161e3c8d8	2026-07-30 20:10:28.967628	f	2026-06-30 23:10:28.729267
a2d65558-b9d6-4aca-8f8a-0bc096c8e0a1	cf855762-353f-4bfa-9c6b-c938ec69292e	adbd4a01e8433dbce47c6c37ee1ff0dfc02ee821ce48e32f69e14c99ae39d269	2026-07-30 20:14:46.481162	f	2026-06-30 23:14:46.250607
0dfbc7ad-c842-4035-91b8-4029ed89b448	15298dbf-65d1-4213-93c4-2effe4bbe069	e0f0cd84cef33af0544764fdaf8a4a17f998c99c347b3ee3d423a764362e7c12	2026-07-30 20:14:46.922415	f	2026-06-30 23:14:46.682073
4de657b0-beb3-45f7-9fc9-f53f04ead5f1	cf855762-353f-4bfa-9c6b-c938ec69292e	c6f0af439d31deda13ee31e16219a918e4308a1ef4cb14bf9c1f51d84fff36c3	2026-07-30 20:19:31.640413	f	2026-06-30 23:19:31.410269
ca9d92ad-5ff3-448b-a67c-b9c2250922f3	15298dbf-65d1-4213-93c4-2effe4bbe069	62379ba2ce7c7176e8c099912adb3981e4a84ba9da0bc144fddb5ad624561952	2026-07-30 20:19:32.028908	f	2026-06-30 23:19:31.800438
36544e0c-f9df-4de2-a99d-443c60f102d1	cf855762-353f-4bfa-9c6b-c938ec69292e	df1ed2fcbd60634ac32bc20755064208434557ad731af239a7777bfa22268395	2026-07-30 20:20:42.164586	f	2026-06-30 23:20:41.933643
208a8e02-25e3-4831-a8cf-d326bc518e74	15298dbf-65d1-4213-93c4-2effe4bbe069	978b6dec6aa6142a2c680486d29e54cb646765ec613c3302609f91b8b8ef21a7	2026-07-30 20:20:42.643635	f	2026-06-30 23:20:42.404697
1718adb3-3cf7-449d-a962-f680397bed95	cf855762-353f-4bfa-9c6b-c938ec69292e	21fae504c6a4a9794ee222a3fa6b055593a57f78709200c71c45ac8386f432a9	2026-07-30 20:28:49.875348	f	2026-06-30 23:28:49.638325
f8ddacee-a455-4b0d-bc1b-6114f8f1a9dc	15298dbf-65d1-4213-93c4-2effe4bbe069	ccabd625cd414188b286f674f459420bc69f10bb99b3272c23213b1d50cdb1cf	2026-07-30 20:28:50.29034	f	2026-06-30 23:28:50.058817
bbf59422-bf18-4225-ba9c-a8cf36df261e	cf855762-353f-4bfa-9c6b-c938ec69292e	afe544080d0fb6b8d7f130af7820ba54b94e09474a5d4f2299c3ad45d413cdce	2026-07-30 20:31:28.189442	f	2026-06-30 23:31:27.961899
8b7aec5f-97f7-4e03-af26-1fb61fa5f1a5	15298dbf-65d1-4213-93c4-2effe4bbe069	c636d4dd426cfadb6cdf60cc1128a7f33d118549e7489d4f346cf1ba17223cca	2026-07-30 20:31:28.609678	f	2026-06-30 23:31:28.380451
a928b89c-45af-4d9c-97ef-89776015225c	cf855762-353f-4bfa-9c6b-c938ec69292e	0683f0ca3073d3c9073c4565d2fa2782e508bd59cfe92e8099126d414c203657	2026-07-30 20:34:29.408261	f	2026-06-30 23:34:29.175635
1e88822b-7d8c-4b0c-a960-f87cbcae96aa	15298dbf-65d1-4213-93c4-2effe4bbe069	ebdbdda7e3b724523d27b677213460eda2fe4dcfa29db8f711e2aaded4dc43b1	2026-07-30 20:34:29.736227	f	2026-06-30 23:34:29.503552
9321796f-7a15-463f-88e7-c40f31c031bf	cf855762-353f-4bfa-9c6b-c938ec69292e	675b886a656841ea8f28d37c708ad3822c8c2e0ed400dbaac81ce8f93a9dbd87	2026-07-30 20:36:40.177602	f	2026-06-30 23:36:39.947211
1e3909a5-ecf6-4ad8-94c1-f32e0bf5e637	15298dbf-65d1-4213-93c4-2effe4bbe069	70168fb1c2a7f2efc701472b9cf7149631dc2136b0d99a5053ec2b2f6d2cac16	2026-07-30 20:36:40.608206	f	2026-06-30 23:36:40.375358
7f47e6e1-b4fa-4675-8bbd-728d88762275	952fe8c4-7212-4500-9884-cc8f76ba4c07	59aaf12492be2ae28b8aeb91e29b959a294501d1bd84e177822c069bb051629f	2026-07-30 20:44:16.457776	f	2026-06-30 23:44:16.224575
\.


--
-- Data for Name: riders; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.riders (id, user_id, business_id, name, email, phone, status) FROM stdin;
94c4bcdc-d2ad-4f5a-bad6-dec10bc78a6e	15298dbf-65d1-4213-93c4-2effe4bbe069	b03f3d97-a285-4377-b750-2aa9cb60c5ed	Peter Rider	rider@test.com	0700000000	active
ba4c5264-5d33-4732-801a-04621b44bc10	84ac1d7d-6024-4da4-baa3-00c5378b69af	010fbaf6-2caf-40a2-8566-806f5bb2e075	Rider X	rider-b38b7f6d-3acd-43eb-8fd0-8b3ba8c43e1a@test.com	0700000001	active
ae003685-4948-4df5-8963-69a46610e34a	43c42949-469d-4f98-8024-83b1e72620b1	3e5553fe-9be2-44a0-a9a7-2560e4d57a42	Rider X	rider-09a543b2-2120-4d85-ade0-e66af91c4f3a@test.com	0700000001	active
\.


--
-- Data for Name: settlements; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.settlements (id, business_id, amount, status, retry_count, last_retry_at, order_id, payment_id, provider_reference, created_at) FROM stdin;
c30f5a4c-ffe0-4946-ac55-524a139aa645	b03f3d97-a285-4377-b750-2aa9cb60c5ed	88.2000000000000028421709430404007434844970703125	completed	1	2026-06-30 16:31:29.680281	3df2233b-45ac-499b-b0e7-77976b6a36a6	a65dac0b-5534-4353-908d-344c84a1e8da	payout-c30f5a4c-ffe0-4946-ac55-524a139aa645	2026-06-30 16:30:19.550922
527580bb-4087-4686-a663-9ed216067c9b	b03f3d97-a285-4377-b750-2aa9cb60c5ed	0.979999999999999982236431605997495353221893310546875	pending	0	\N	ba034e21-775c-4486-9ae8-ce71a567e95c	6569e068-6934-4d68-8f65-c5a83a33d7d8	\N	2026-06-30 20:35:36.414712
b59cd82e-c8f6-461d-bd91-06c60ebc419f	b03f3d97-a285-4377-b750-2aa9cb60c5ed	88.2000000000000028421709430404007434844970703125	completed	1	2026-06-30 20:44:16.493882	0d236f38-ab01-443f-9681-5472c536bbc6	b03d39f9-960d-4793-bbb0-965228d182dc	payout-b59cd82e-c8f6-461d-bd91-06c60ebc419f	2026-06-30 19:02:31.270171
\.


--
-- Data for Name: spatial_ref_sys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text) FROM stdin;
\.


--
-- Data for Name: trust_events; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.trust_events (id, subject_type, subject_id, event_type, score_change, reason, created_at) FROM stdin;
81af3171-fe41-4548-bd6e-6b41ffe7d33d	customer	26459185-29b8-4152-b553-8fc6916efb2e	CUSTOMER_CANCELLED_AFTER_ACCEPT	-5	Customer cancelled after acceptance	2026-06-30 15:37:45.401374
d905bfb8-e0bd-47e5-9e9f-73578fb12938	business	b03f3d97-a285-4377-b750-2aa9cb60c5ed	BUSINESS_CANCELLED_AFTER_ACCEPT	-5	Business cancelled after acceptance	2026-06-30 15:38:05.707136
de4fea48-1ef5-4425-ba00-43cb91ae466a	customer	06f12134-0bd2-4f4d-a9c1-f59a5e2189af	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 16:13:03.954113
efe89888-624f-4ddf-9bc5-370e938ff607	customer	70fbfcda-0981-4629-aecd-49dd05b94d62	CUSTOMER_REPORTED_PROBLEM	0	Damaged item	2026-06-30 16:13:06.690615
a6a41021-8197-4587-a223-c32307234e8e	customer	6d1bde9a-f95c-4663-8c3e-f15b9e6cbdc5	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 16:19:46.54246
e6b7589b-087e-498e-94a3-fd364b0e1721	customer	6d1bde9a-f95c-4663-8c3e-f15b9e6cbdc5	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 16:20:06.443894
9d2f257c-a45c-4451-bddd-b7ff56e624e7	customer	06f12134-0bd2-4f4d-a9c1-f59a5e2189af	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 17:36:08.436509
b81f40c7-5a21-46b2-b70b-4147ca470375	customer	06f12134-0bd2-4f4d-a9c1-f59a5e2189af	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 17:37:49.953852
2b808588-5c57-4b32-97f5-97c8531ed623	customer	c4ff9bcc-61cd-4dfb-b5fb-76a0b38e44bf	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 18:37:43.017656
b918a5d3-c402-4c3d-964a-7277198de516	customer	c4ff9bcc-61cd-4dfb-b5fb-76a0b38e44bf	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 18:39:40.413641
0fe99fc6-c609-401b-840c-752ddec03e2a	customer	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 18:41:27.76885
4a200093-1dda-47b7-8dbe-357a09463931	customer	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 18:50:08.403918
d47b47f7-4e1c-4652-a07b-7ee3bbca842f	customer	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 18:52:59.482714
de1c0dab-8b72-4343-a944-396cc466ab2d	customer	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 18:55:03.368439
8ce9c2fc-1269-4062-8fed-da11e0733752	customer	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 18:55:22.310406
d72f129b-c97e-4551-9d4e-9697def28191	customer	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 18:57:36.760953
345dc42a-306f-44d1-8ebf-c3522989c54f	customer	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 18:59:07.324366
1d644d68-5933-4e7b-917f-272ca91386c0	customer	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 20:09:17.067667
880ac84c-06f0-4557-b9c7-d9ca1850f092	customer	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 20:10:29.034777
54f14c68-c12a-4fa2-a2ac-d751470d6d8d	customer	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 20:14:47.009774
9f4500ae-36dc-4c9b-8519-e9706d0f529b	customer	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 20:19:32.088692
35c96ea9-a223-4190-8df4-472233265e28	customer	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 20:20:42.70209
cda3a732-11ab-49ff-a929-1528e4b0fecc	customer	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 20:28:50.352837
b34e384e-e942-42d6-992a-cf4aeb4ce244	customer	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 20:31:28.659774
566fb570-ee6d-455f-8462-38fdeb55769e	customer	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 20:34:29.800184
7f33e113-49c2-43ed-9125-b70f99141c4a	customer	9acf6e41-9ddd-4074-a207-b2c3f50aeeb0	CUSTOMER_CONFIRMED_DELIVERY	0	Customer confirmed delivery	2026-06-30 20:36:40.671942
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: hakika
--

COPY public.users (id, email, password_hash, phone, role, created_at) FROM stdin;
cf855762-353f-4bfa-9c6b-c938ec69292e	owner@test.com	$2b$12$v9Re5Hi5ohFjOWnInXoi1uL8hhrJfawMMXr4ZMtaStC6amB7.LmX2	\N	owner	2026-06-30 17:55:36.228611
f147c221-af05-4be8-8e87-4c6e9f8f13bd	other@test.com	$2b$12$3m5Ckl1bodqTBhpR26rZJet6BUTqhhIOhlrIsjGn/FlxhWS6EZcfS	\N	owner	2026-06-30 18:11:59.413611
15298dbf-65d1-4213-93c4-2effe4bbe069	rider@test.com	$2b$12$NdXUdDHgavi3SjI3r5miPO.PvFCzmsFdnBwZ5aJyTEajMd32Y9w9G	\N	rider	2026-06-30 19:01:01.64312
952fe8c4-7212-4500-9884-cc8f76ba4c07	admin@hakika.com	$2b$12$ldFMeC0poLg6OScM8zck1.WZUOkghjrU5KyVYPrWr6ocrJAupXoC.	\N	admin	2026-06-30 19:27:38.539205
9e274543-c23e-4373-9167-7cf9b0ea2bfa	owner-63addce0-eac8-4202-a6fc-b5cf99ea4611@test.com	$2b$12$YY8CvFmc71FfEUQ3owE95u0Oji0IHogGe18KhxKBxsE.4dKF/dQTy	\N	owner	2026-06-30 20:36:06.379152
84ac1d7d-6024-4da4-baa3-00c5378b69af	rider-b38b7f6d-3acd-43eb-8fd0-8b3ba8c43e1a@test.com	$2b$12$VhDnkrcz60gwwzdeFpDN..fXvXIXIitDoQFse9O2YwvY8c.oPY8Qi	\N	rider	2026-06-30 20:36:07.40144
02b77dc6-4011-4078-9ff3-cb474c1273e7	owner-97af290c-7052-4da9-98df-bebde81b65a2@test.com	$2b$12$pivV/VYQ0vI8GEEJbB3AjO1uYsKZei78UxF2K2uVqiSjLyhDJpjOq	\N	owner	2026-06-30 20:37:48.046147
43c42949-469d-4f98-8024-83b1e72620b1	rider-09a543b2-2120-4d85-ade0-e66af91c4f3a@test.com	$2b$12$q6oIO.r45b19BAAn2uOuMejfRJ2YYAIYfFiN2nospE0OhI5IpqyQW	\N	rider	2026-06-30 20:37:49.028114
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hakika
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 26, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hakika
--

SELECT pg_catalog.setval('public.categories_id_seq', 1, true);


--
-- Name: order_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_number_seq', 30, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: customer_contact_logs customer_contact_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.customer_contact_logs
    ADD CONSTRAINT customer_contact_logs_pkey PRIMARY KEY (id);


--
-- Name: customers customers_phone_normalized_key; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_phone_normalized_key UNIQUE (phone_normalized);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: delivery_assignments delivery_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.delivery_assignments
    ADD CONSTRAINT delivery_assignments_pkey PRIMARY KEY (id);


--
-- Name: delivery_attempts delivery_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.delivery_attempts
    ADD CONSTRAINT delivery_attempts_pkey PRIMARY KEY (id);


--
-- Name: disputes disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_pkey PRIMARY KEY (id);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: operating_hours operating_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.operating_hours
    ADD CONSTRAINT operating_hours_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment_attempts payment_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_attempts
    ADD CONSTRAINT payment_attempts_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: payments payments_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: riders riders_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.riders
    ADD CONSTRAINT riders_pkey PRIMARY KEY (id);


--
-- Name: settlements settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_pkey PRIMARY KEY (id);


--
-- Name: trust_events trust_events_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.trust_events
    ADD CONSTRAINT trust_events_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_locations_coordinates; Type: INDEX; Schema: public; Owner: hakika
--

CREATE INDEX idx_locations_coordinates ON public.locations USING gist (coordinates);


--
-- Name: businesses businesses_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: businesses businesses_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: delivery_assignments delivery_assignments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.delivery_assignments
    ADD CONSTRAINT delivery_assignments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: delivery_assignments delivery_assignments_rider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.delivery_assignments
    ADD CONSTRAINT delivery_assignments_rider_id_fkey FOREIGN KEY (rider_id) REFERENCES public.riders(id);


--
-- Name: delivery_attempts delivery_attempts_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.delivery_attempts
    ADD CONSTRAINT delivery_attempts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: disputes disputes_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: disputes disputes_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: disputes disputes_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: locations locations_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: operating_hours operating_hours_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.operating_hours
    ADD CONSTRAINT operating_hours_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: orders orders_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: payment_attempts payment_attempts_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_attempts
    ADD CONSTRAINT payment_attempts_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);


--
-- Name: payment_methods payment_methods_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: products products_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: riders riders_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.riders
    ADD CONSTRAINT riders_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: riders riders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.riders
    ADD CONSTRAINT riders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: settlements settlements_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: settlements settlements_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hakika
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);


--
-- Name: TABLE disputes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.disputes TO hakika;


--
-- Name: SEQUENCE order_number_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE public.order_number_seq TO hakika;


--
-- Name: TABLE payment_attempts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_attempts TO hakika;


--
-- PostgreSQL database dump complete
--

\unrestrict gSGMgDX4FTbjIVKKBLG8t46PUY77RiqajQ5DRfO3w4BE7ciA0Kp69j6Bf2knyqN

