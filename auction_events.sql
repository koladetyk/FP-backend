--
-- PostgreSQL database dump
--

-- Dumped from database version 15.12 (Homebrew)
-- Dumped by pg_dump version 15.12 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auction_events; Type: TABLE; Schema: public; Owner: nounsuser
--

CREATE TABLE public.auction_events (
    id integer NOT NULL,
    event_type text NOT NULL,
    block_number integer NOT NULL,
    tx_hash text NOT NULL,
    noun_id integer NOT NULL,
    eth_price double precision NOT NULL,
    usd_price double precision NOT NULL,
    bidder_address text NOT NULL,
    bidder_ens text,
    winner_address text,
    winner_ens text,
    thumbnail_url text,
    headline text NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.auction_events OWNER TO nounsuser;

--
-- Name: auction_events_id_seq; Type: SEQUENCE; Schema: public; Owner: nounsuser
--

CREATE SEQUENCE public.auction_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.auction_events_id_seq OWNER TO nounsuser;

--
-- Name: auction_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: nounsuser
--

ALTER SEQUENCE public.auction_events_id_seq OWNED BY public.auction_events.id;


--
-- Name: auction_events id; Type: DEFAULT; Schema: public; Owner: nounsuser
--

ALTER TABLE ONLY public.auction_events ALTER COLUMN id SET DEFAULT nextval('public.auction_events_id_seq'::regclass);


--
-- Data for Name: auction_events; Type: TABLE DATA; Schema: public; Owner: nounsuser
--

COPY public.auction_events (id, event_type, block_number, tx_hash, noun_id, eth_price, usd_price, bidder_address, bidder_ens, winner_address, winner_ens, thumbnail_url, headline, "timestamp", created_at) FROM stdin;
3	AuctionCreated	12345678	0xtesttxhash2	1	69.42	248000	0xabc...	vitalik.eth	0xabc...	vitalik.eth	https://nouns.wtf/noun1.png	Noun #1 sold for 69.42 ETH to vitalik.eth	2025-08-04 05:18:59.611	2025-08-04 01:18:59.621004
4	AuctionCreated	12345678	0xtesthash-bullmq	42	69.42	248000	0xabc123...	vitalik.eth	0xabc123...	vitalik.eth	https://nouns.wtf/noun42.png	Noun #42 sold for 69.42 ETH to vitalik.eth	2025-08-04 05:52:21.156	2025-08-04 01:52:21.183234
6382	AuctionCreated	12345678	0xtestworker1754460680469	99	3626.7	248000	0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045	vitalik.eth	0x0BC3807Ec262cB779b38D65b38158acC3bfedE10	\N	https://nouns.wtf/noun99.png	Noun #99 sold for 69.42 ETH ($248,000)	2025-08-06 06:11:20.469	2025-08-06 06:11:20.469
\.


--
-- Name: auction_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: nounsuser
--

SELECT pg_catalog.setval('public.auction_events_id_seq', 8, true);


--
-- Name: auction_events auction_events_pkey; Type: CONSTRAINT; Schema: public; Owner: nounsuser
--

ALTER TABLE ONLY public.auction_events
    ADD CONSTRAINT auction_events_pkey PRIMARY KEY (id);


--
-- Name: auction_events auction_events_tx_hash_unique; Type: CONSTRAINT; Schema: public; Owner: nounsuser
--

ALTER TABLE ONLY public.auction_events
    ADD CONSTRAINT auction_events_tx_hash_unique UNIQUE (tx_hash);


--
-- Name: auction_events unique_event_per_noun_block; Type: CONSTRAINT; Schema: public; Owner: nounsuser
--

ALTER TABLE ONLY public.auction_events
    ADD CONSTRAINT unique_event_per_noun_block UNIQUE (event_type, noun_id, block_number);


--
-- PostgreSQL database dump complete
--

