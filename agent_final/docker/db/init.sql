--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-05-08 13:03:29

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

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
-- TOC entry 5 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA IF NOT EXISTS public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 5171 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 929 (class 1247 OID 16424)
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'ROLE_USER',
    'ROLE_ADMIN'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- TOC entry 266 (class 1255 OID 25292)
-- Name: analyze_slow_queries(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.analyze_slow_queries() RETURNS TABLE(query text, calls bigint, total_time double precision, mean_time double precision, rows_processed bigint, recommendation text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Assurez-vous que pg_stat_statements est installé
    RETURN QUERY
    SELECT
        substring(query, 1, 100) AS query,
        calls,
        total_time,
        mean_time,
        rows,
        CASE
            WHEN mean_time > 100 AND calls > 100 THEN 'High-impact slow query, optimize immediately'
            WHEN mean_time > 50 THEN 'Moderately slow query, consider optimization'
            WHEN total_time > 5000 AND calls > 1000 THEN 'Frequently called query with significant cumulative time'
            ELSE 'Query performance is acceptable'
        END AS recommendation
    FROM
        pg_stat_statements
    WHERE
        mean_time > 20  -- Focus on slower queries
    ORDER BY
        total_time DESC
    LIMIT 20;
END;
$$;


ALTER FUNCTION public.analyze_slow_queries() OWNER TO postgres;

--
-- TOC entry 299 (class 1255 OID 25275)
-- Name: array_intersect(anyarray, anyarray); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.array_intersect(anyarray, anyarray) RETURNS anyarray
    LANGUAGE sql
    AS $_$
    SELECT ARRAY(
        SELECT UNNEST($1)
        INTERSECT
        SELECT UNNEST($2)
    );
$_$;


ALTER FUNCTION public.array_intersect(anyarray, anyarray) OWNER TO postgres;

--
-- TOC entry 308 (class 1255 OID 25304)
-- Name: check_maintenance_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_maintenance_status() RETURNS TABLE(operation text, last_executed timestamp without time zone, status text, last_duration_ms integer, average_duration_ms numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH last_executions AS (
        SELECT 
            operation,
            MAX(executed_at) AS last_executed
        FROM 
            maintenance_log
        GROUP BY 
            operation
    ),
    last_results AS (
        SELECT 
            ml.operation,
            ml.executed_at,
            ml.success,
            ml.duration_ms
        FROM 
            maintenance_log ml
        JOIN 
            last_executions le ON ml.operation = le.operation AND ml.executed_at = le.last_executed
    ),
    avg_durations AS (
        SELECT 
            operation,
            AVG(duration_ms)::NUMERIC AS avg_duration
        FROM 
            maintenance_log
        WHERE 
            executed_at > NOW() - INTERVAL '7 days'
        GROUP BY 
            operation
    )
    SELECT 
        lr.operation,
        lr.executed_at AS last_executed,
        CASE WHEN lr.success THEN 'SUCCESS' ELSE 'FAILED' END AS status,
        lr.duration_ms AS last_duration_ms,
        ad.avg_duration AS average_duration_ms
    FROM 
        last_results lr
    LEFT JOIN
        avg_durations ad ON lr.operation = ad.operation
    ORDER BY 
        lr.executed_at DESC;
END;
$$;


ALTER FUNCTION public.check_maintenance_status() OWNER TO postgres;

--
-- TOC entry 302 (class 1255 OID 25287)
-- Name: cleanup_old_audit_logs(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_audit_logs(p_days_to_keep integer DEFAULT 90) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    cutoff_date TIMESTAMP;
    deleted_count INTEGER;
BEGIN
    cutoff_date := NOW() - (p_days_to_keep * INTERVAL '1 day');
    
    DELETE FROM security_audit_log
    WHERE timestamp < cutoff_date
    RETURNING COUNT(*) INTO deleted_count;
    
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_old_audit_logs(p_days_to_keep integer) OWNER TO postgres;

--
-- TOC entry 307 (class 1255 OID 25303)
-- Name: execute_and_log_maintenance(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.execute_and_log_maintenance(operation_name text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    success BOOLEAN := true;
    error_details TEXT;
BEGIN
    start_time := clock_timestamp();
    
    BEGIN
        IF operation_name = 'refresh_active_reservations' THEN
            PERFORM refresh_active_reservations();
        ELSIF operation_name = 'refresh_agencies_view' THEN
            PERFORM refresh_agencies_view();
        ELSIF operation_name = 'perform_database_maintenance' THEN
            PERFORM perform_database_maintenance();
        ELSIF operation_name = 'update_query_statistics' THEN
            PERFORM update_query_statistics();
        ELSIF operation_name = 'cleanup_old_audit_logs' THEN
            PERFORM cleanup_old_audit_logs(90);
        ELSE
            RAISE EXCEPTION 'Unknown maintenance operation: %', operation_name;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        success := false;
        error_details := SQLERRM;
    END;
    
    end_time := clock_timestamp();
    
    INSERT INTO maintenance_log (
        operation, 
        executed_at, 
        details, 
        success, 
        duration_ms
    ) VALUES (
        operation_name,
        start_time,
        CASE WHEN success THEN 'Completed successfully' ELSE 'Error: ' || error_details END,
        success,
        EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER
    );
END;
$$;


ALTER FUNCTION public.execute_and_log_maintenance(operation_name text) OWNER TO postgres;

--
-- TOC entry 295 (class 1255 OID 25149)
-- Name: get_agency_availability(bigint, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_agency_availability(p_agency_id bigint, p_date date) RETURNS TABLE(available_slots text[], booked_slots text[])
    LANGUAGE plpgsql
    AS $$
DECLARE
    avail_record availability%ROWTYPE;
    blocked_times TEXT[];
BEGIN
    -- Récupérer l'enregistrement de disponibilité
    SELECT * INTO avail_record FROM availability 
    WHERE agency_id = p_agency_id AND date = p_date;
    
    -- Récupérer les créneaux bloqués manuellement
    SELECT array_agg(to_char(time, 'HH24:MI')) INTO blocked_times 
    FROM blocked_time_slots
    WHERE agency_id = p_agency_id AND date = p_date;
    
    -- Si aucun enregistrement de disponibilité n'existe, renvoyer des tableaux vides
    IF avail_record IS NULL THEN
        available_slots := ARRAY[]::TEXT[];
        booked_slots := ARRAY[]::TEXT[];
    ELSE
        -- Convertir les chaînes en tableaux
        available_slots := string_to_array(avail_record.available_time_slots, ',');
        booked_slots := string_to_array(COALESCE(avail_record.booked_time_slots, ''), ',');
        
        -- Ajouter les créneaux bloqués aux créneaux réservés
        IF blocked_times IS NOT NULL THEN
            booked_slots := booked_slots || blocked_times;
        END IF;
    END IF;
    
    RETURN NEXT;
END;
$$;


ALTER FUNCTION public.get_agency_availability(p_agency_id bigint, p_date date) OWNER TO postgres;

--
-- TOC entry 296 (class 1255 OID 25170)
-- Name: get_agency_reservations_by_status(bigint, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_agency_reservations_by_status(p_agency_id bigint, p_status text) RETURNS TABLE(id bigint, user_name text, user_email text, service text, start_date_time timestamp without time zone, end_date_time timestamp without time zone, agent_name text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        u.username,
        u.email,
        r.service,
        r.start_date_time,
        r.end_date_time,
        agu.username as agent_name
    FROM 
        reservation r
    JOIN 
        users u ON r.user_id = u.id
    LEFT JOIN 
        agent ag ON r.handled_by_agent_id = ag.id
    LEFT JOIN 
        users agu ON ag.user_id = agu.id
    WHERE 
        r.agency_id = p_agency_id 
        AND r.status = p_status::reservation.status
    ORDER BY 
        r.created_at DESC;
END;
$$;


ALTER FUNCTION public.get_agency_reservations_by_status(p_agency_id bigint, p_status text) OWNER TO postgres;

--
-- TOC entry 298 (class 1255 OID 25172)
-- Name: get_agent_stats(bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_agent_stats(p_agent_id bigint) RETURNS TABLE(last_24_hours integer, total_confirmed integer, total_completed integer, total_canceled integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    last_day TIMESTAMP := NOW() - INTERVAL '1 day';
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE updated_at > last_day)::INTEGER AS last_24_hours,
        COUNT(*) FILTER (WHERE status = 'CONFIRMED')::INTEGER AS total_confirmed,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::INTEGER AS total_completed,
        COUNT(*) FILTER (WHERE status = 'CANCELED')::INTEGER AS total_canceled
    FROM
        reservation
    WHERE
        handled_by_agent_id = p_agent_id;
END;
$$;


ALTER FUNCTION public.get_agent_stats(p_agent_id bigint) OWNER TO postgres;

--
-- TOC entry 297 (class 1255 OID 25171)
-- Name: get_user_stats(bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_stats(p_user_id bigint) RETURNS TABLE(total_reservations bigint, pending_reservations bigint, confirmed_reservations bigint, completed_reservations bigint, canceled_reservations bigint, agencies_visited text[])
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH reservation_counts AS (
        SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
            COUNT(*) FILTER (WHERE status = 'CONFIRMED') AS confirmed,
            COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
            COUNT(*) FILTER (WHERE status = 'CANCELED') AS canceled
        FROM
            reservation
        WHERE
            user_id = p_user_id
    ),
    visited_agencies AS (
        SELECT 
            array_agg(DISTINCT a.name) AS agency_names
        FROM 
            reservation r
        JOIN 
            agency a ON r.agency_id = a.id
        WHERE 
            r.user_id = p_user_id
            AND r.status = 'COMPLETED'
    )
    SELECT
        rc.total,
        rc.pending,
        rc.confirmed,
        rc.completed,
        rc.canceled,
        COALESCE(va.agency_names, ARRAY[]::TEXT[])
    FROM
        reservation_counts rc
    CROSS JOIN
        visited_agencies va;
END;
$$;


ALTER FUNCTION public.get_user_stats(p_user_id bigint) OWNER TO postgres;

--
-- TOC entry 305 (class 1255 OID 25290)
-- Name: identify_tables_needing_analyze(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.identify_tables_needing_analyze() RETURNS TABLE(table_name text, last_analyze timestamp without time zone, row_count bigint, recommendation text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.relname::TEXT AS table_name,
        s.last_analyze AS last_analyze,
        c.reltuples::BIGINT AS row_count,
        CASE
            WHEN s.last_analyze IS NULL THEN 'Table never analyzed, run ANALYZE'
            WHEN s.last_analyze < NOW() - INTERVAL '1 day' AND c.reltuples > 1000 THEN 'Table should be analyzed'
            ELSE 'Table analysis is up to date'
        END AS recommendation
    FROM
        pg_class c
    JOIN
        pg_namespace n ON c.relnamespace = n.oid
    LEFT JOIN
        pg_stat_user_tables s ON c.relname = s.relname AND n.nspname = s.schemaname
    WHERE
        c.relkind = 'r'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY
        CASE WHEN s.last_analyze IS NULL THEN 0 ELSE 1 END,
        s.last_analyze NULLS FIRST;
END;
$$;


ALTER FUNCTION public.identify_tables_needing_analyze() OWNER TO postgres;

--
-- TOC entry 306 (class 1255 OID 25291)
-- Name: identify_unused_indexes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.identify_unused_indexes() RETURNS TABLE(index_name text, table_name text, index_size text, index_scans bigint, recommendation text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.indexrelname::TEXT AS index_name,
        s.relname::TEXT AS table_name,
        pg_size_pretty(pg_relation_size(s.indexrelid)) AS index_size,
        s.idx_scan AS index_scans,
        CASE
            WHEN s.idx_scan < 10 AND pg_relation_size(s.indexrelid) > 10 * 1024 * 1024 
                THEN 'Consider dropping this large, rarely used index'
            WHEN s.idx_scan = 0 AND NOT i.indisprimary AND NOT i.indisunique 
                THEN 'Consider dropping this unused, non-primary/unique index'
            WHEN s.idx_scan < 50 AND NOT i.indisprimary 
                THEN 'Monitor usage of this index'
            ELSE 'Index is being used adequately'
        END AS recommendation
    FROM
        pg_stat_user_indexes s
    JOIN
        pg_index i ON s.indexrelid = i.indexrelid
    WHERE
        s.idx_scan < 100  -- Focus on indexes with few scans
    ORDER BY
        s.idx_scan,
        pg_relation_size(s.indexrelid) DESC;
END;
$$;


ALTER FUNCTION public.identify_unused_indexes() OWNER TO postgres;

--
-- TOC entry 301 (class 1255 OID 25281)
-- Name: insert_audit_log(text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.insert_audit_log(p_user_email text, p_action text, p_resource_type text, p_resource_id text, p_details text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO security_audit_log (
        timestamp,
        user_email,
        action,
        resource_type,
        resource_id,
        details
    ) VALUES (
        NOW(),
        p_user_email,
        p_action,
        p_resource_type,
        p_resource_id,
        p_details
    );
END;
$$;


ALTER FUNCTION public.insert_audit_log(p_user_email text, p_action text, p_resource_type text, p_resource_id text, p_details text) OWNER TO postgres;

--
-- TOC entry 303 (class 1255 OID 25288)
-- Name: perform_database_maintenance(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.perform_database_maintenance() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Raffraîchir les vues matérialisées
    REFRESH MATERIALIZED VIEW mv_active_reservations;
    REFRESH MATERIALIZED VIEW mv_agencies_with_services;
    
    -- Nettoyer les entrées d'audit anciennes (garder 90 jours)
    PERFORM cleanup_old_audit_logs(90);
    
    -- Nettoyer les verrous de réservation expirés
    DELETE FROM reservation_lock
    WHERE active = true AND expires_at < NOW();
    
    -- Nettoyer les codes de vérification expirés
    DELETE FROM verification_code
    WHERE (expires_at < NOW() OR used = true) AND created_at < NOW() - INTERVAL '7 days';
    
    -- Nettoyer les utilisateurs en attente expirés
    DELETE FROM pending_user
    WHERE expires_at < NOW();
    
    -- Analyser les tables importantes pour mettre à jour les statistiques du planificateur
    ANALYZE reservation;
    ANALYZE agency;
    ANALYZE users;
    ANALYZE availability;
    ANALYZE agent;
    
    -- Enregistrer que la maintenance a été effectuée
    INSERT INTO security_audit_log (timestamp, user_email, action, resource_type, resource_id, details)
    VALUES (NOW(), 'system', 'MAINTENANCE', 'DATABASE', 'all', 'Routine database maintenance performed');
END;
$$;


ALTER FUNCTION public.perform_database_maintenance() OWNER TO postgres;

--
-- TOC entry 255 (class 1255 OID 25169)
-- Name: refresh_active_reservations(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_active_reservations() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_active_reservations;
END;
$$;


ALTER FUNCTION public.refresh_active_reservations() OWNER TO postgres;

--
-- TOC entry 265 (class 1255 OID 25273)
-- Name: refresh_agencies_view(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_agencies_view() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_agencies_with_services;
END;
$$;


ALTER FUNCTION public.refresh_agencies_view() OWNER TO postgres;

--
-- TOC entry 300 (class 1255 OID 25274)
-- Name: search_agencies(text, integer[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_agencies(p_city text, p_service_ids integer[] DEFAULT NULL::integer[]) RETURNS TABLE(agency_id bigint, agency_name text, city text, address text, phone_number text, email text, description text, service_names text[], agent_count integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF p_service_ids IS NULL THEN
        RETURN QUERY
        SELECT 
            a.agency_id,
            a.agency_name,
            a.city,
            a.address,
            a.phone_number,
            a.email,
            a.description,
            a.service_names,
            a.agent_count
        FROM 
            mv_agencies_with_services a
        WHERE 
            LOWER(a.city) = LOWER(p_city)
        ORDER BY 
            a.agency_name;
    ELSE
        RETURN QUERY
        SELECT 
            a.agency_id,
            a.agency_name,
            a.city,
            a.address,
            a.phone_number,
            a.email,
            a.description,
            a.service_names,
            a.agent_count
        FROM 
            mv_agencies_with_services a
        WHERE 
            LOWER(a.city) = LOWER(p_city)
            AND a.service_ids && p_service_ids::INTEGER[]
        ORDER BY 
            a.agency_name,
            -- Prioritiser les agences qui offrent plus de services demandés
            array_length(array_intersect(a.service_ids, p_service_ids::INTEGER[]), 1) DESC NULLS LAST;
    END IF;
END;
$$;


ALTER FUNCTION public.search_agencies(p_city text, p_service_ids integer[]) OWNER TO postgres;

--
-- TOC entry 304 (class 1255 OID 25289)
-- Name: update_query_statistics(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_query_statistics() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Récupérer les statistiques des requêtes
    ANALYZE;
END;
$$;


ALTER FUNCTION public.update_query_statistics() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 227 (class 1259 OID 24876)
-- Name: agency; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agency (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    address character varying(255) NOT NULL,
    city character varying(255) NOT NULL,
    phone_number character varying(255) NOT NULL,
    email character varying(255),
    description character varying(255)
);


ALTER TABLE public.agency OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 24883)
-- Name: agency_business_hours; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agency_business_hours (
    agency_id bigint NOT NULL,
    day character varying(255) NOT NULL,
    opening_time character varying(255),
    closing_time character varying(255),
    closed boolean DEFAULT false NOT NULL
);


ALTER TABLE public.agency_business_hours OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 24875)
-- Name: agency_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.agency ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.agency_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 233 (class 1259 OID 24966)
-- Name: agency_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agency_services (
    agency_id bigint NOT NULL,
    service_id smallint NOT NULL
);


ALTER TABLE public.agency_services OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 24893)
-- Name: agent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agent (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    agency_id bigint,
    available boolean DEFAULT true NOT NULL
);


ALTER TABLE public.agent OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 24892)
-- Name: agent_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.agent ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.agent_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 235 (class 1259 OID 25006)
-- Name: availability; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.availability (
    id bigint NOT NULL,
    agency_id bigint,
    date date NOT NULL,
    available_time_slots text,
    booked_time_slots text
);


ALTER TABLE public.availability OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 25005)
-- Name: availability_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.availability ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.availability_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 241 (class 1259 OID 25075)
-- Name: blocked_time_slots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blocked_time_slots (
    id bigint NOT NULL,
    agency_id bigint NOT NULL,
    date date NOT NULL,
    "time" time without time zone NOT NULL,
    reason character varying(255),
    blocked_by bigint,
    blocked_at timestamp without time zone NOT NULL
);


ALTER TABLE public.blocked_time_slots OWNER TO postgres;

--
-- TOC entry 5172 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE blocked_time_slots; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.blocked_time_slots IS 'Stores manually blocked time slots that are unavailable for booking';


--
-- TOC entry 240 (class 1259 OID 25074)
-- Name: blocked_time_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.blocked_time_slots ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.blocked_time_slots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 245 (class 1259 OID 25112)
-- Name: contact_message; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contact_message (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    subject character varying(255) NOT NULL,
    message character varying(2000) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    read boolean DEFAULT false NOT NULL
);


ALTER TABLE public.contact_message OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 25111)
-- Name: contact_message_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contact_message_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contact_message_id_seq OWNER TO postgres;

--
-- TOC entry 5173 (class 0 OID 0)
-- Dependencies: 244
-- Name: contact_message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contact_message_id_seq OWNED BY public.contact_message.id;


--
-- TOC entry 239 (class 1259 OID 25049)
-- Name: security_audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.security_audit_log (
    id bigint NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    user_email character varying(255),
    action character varying(255) NOT NULL,
    resource_type character varying(255),
    resource_id character varying(255),
    details text
);


ALTER TABLE public.security_audit_log OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 25282)
-- Name: login_statistics; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.login_statistics AS
 SELECT date_trunc('day'::text, "timestamp") AS login_date,
    count(*) FILTER (WHERE ((action)::text = 'LOGIN_SUCCESS'::text)) AS successful_logins,
    count(*) FILTER (WHERE ((action)::text = 'LOGIN_FAILURE'::text)) AS failed_logins,
    count(DISTINCT user_email) FILTER (WHERE ((action)::text = 'LOGIN_SUCCESS'::text)) AS unique_users
   FROM public.security_audit_log
  WHERE (((action)::text = ANY ((ARRAY['LOGIN_SUCCESS'::character varying, 'LOGIN_FAILURE'::character varying])::text[])) AND ("timestamp" > (now() - '30 days'::interval)))
  GROUP BY (date_trunc('day'::text, "timestamp"))
  ORDER BY (date_trunc('day'::text, "timestamp")) DESC;


ALTER VIEW public.login_statistics OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 24582)
-- Name: reservation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reservation (
    id bigint NOT NULL,
    created_at timestamp(6) without time zone,
    description character varying(255),
    end_date_time timestamp(6) without time zone,
    preferred_date character varying(255),
    service character varying(255),
    start_date_time timestamp(6) without time zone,
    status character varying(255),
    updated_at timestamp(6) without time zone,
    user_id bigint NOT NULL,
    agency_id bigint,
    handled_by_agent_id bigint,
    reminder_sent boolean DEFAULT false,
    CONSTRAINT reservation_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'CONFIRMED'::character varying, 'CANCELED'::character varying, 'COMPLETED'::character varying])::text[])))
);


ALTER TABLE public.reservation OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16390)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    email character varying(50),
    password character varying(100),
    role character varying(255),
    username character varying(50)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 25154)
-- Name: mv_active_reservations; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.mv_active_reservations AS
 SELECT r.id,
    r.user_id,
    r.agency_id,
    r.service,
    r.status,
    r.start_date_time,
    r.end_date_time,
    r.handled_by_agent_id,
    u.username AS user_name,
    u.email AS user_email,
    a.name AS agency_name,
    ag.id AS agent_id,
    agu.username AS agent_name
   FROM ((((public.reservation r
     JOIN public.users u ON ((r.user_id = u.id)))
     JOIN public.agency a ON ((r.agency_id = a.id)))
     LEFT JOIN public.agent ag ON ((r.handled_by_agent_id = ag.id)))
     LEFT JOIN public.users agu ON ((ag.user_id = agu.id)))
  WHERE (((r.status)::text = ANY ((ARRAY['PENDING'::character varying, 'CONFIRMED'::character varying])::text[])) AND ((r.start_date_time IS NULL) OR (r.start_date_time > (now() - '1 day'::interval))))
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.mv_active_reservations OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 24959)
-- Name: service_offerings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_offerings (
    id smallint NOT NULL,
    name character varying(255) NOT NULL
);


ALTER TABLE public.service_offerings OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 25260)
-- Name: mv_agencies_with_services; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.mv_agencies_with_services AS
 SELECT a.id AS agency_id,
    a.name AS agency_name,
    a.city,
    a.address,
    a.phone_number,
    a.email,
    a.description,
    array_agg(s.id) AS service_ids,
    array_agg(s.name) AS service_names,
    ( SELECT count(*) AS count
           FROM public.agent ag
          WHERE (ag.agency_id = a.id)) AS agent_count
   FROM ((public.agency a
     LEFT JOIN public.agency_services as_link ON ((a.id = as_link.agency_id)))
     LEFT JOIN public.service_offerings s ON ((as_link.service_id = s.id)))
  GROUP BY a.id, a.name, a.city, a.address, a.phone_number, a.email, a.description
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.mv_agencies_with_services OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 24608)
-- Name: pending_user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pending_user (
    id bigint NOT NULL,
    username character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    verification_code character varying(255) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


ALTER TABLE public.pending_user OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 24607)
-- Name: pending_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pending_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pending_user_id_seq OWNER TO postgres;

--
-- TOC entry 5174 (class 0 OID 0)
-- Dependencies: 224
-- Name: pending_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pending_user_id_seq OWNED BY public.pending_user.id;


--
-- TOC entry 243 (class 1259 OID 25095)
-- Name: reservation_feedback; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reservation_feedback (
    id bigint NOT NULL,
    reservation_id bigint NOT NULL,
    comment character varying(1000),
    rating integer,
    created_at timestamp without time zone NOT NULL,
    CONSTRAINT rating_range CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reservation_feedback OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 25094)
-- Name: reservation_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reservation_feedback_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reservation_feedback_id_seq OWNER TO postgres;

--
-- TOC entry 5175 (class 0 OID 0)
-- Dependencies: 242
-- Name: reservation_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reservation_feedback_id_seq OWNED BY public.reservation_feedback.id;


--
-- TOC entry 220 (class 1259 OID 24581)
-- Name: reservation_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.reservation ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.reservation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 237 (class 1259 OID 25025)
-- Name: reservation_lock; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reservation_lock (
    id bigint NOT NULL,
    reservation_id bigint NOT NULL,
    locked_by_id bigint,
    locked_at timestamp without time zone,
    expires_at timestamp without time zone,
    active boolean DEFAULT true
);


ALTER TABLE public.reservation_lock OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 25024)
-- Name: reservation_lock_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reservation_lock_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reservation_lock_id_seq OWNER TO postgres;

--
-- TOC entry 5176 (class 0 OID 0)
-- Dependencies: 236
-- Name: reservation_lock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reservation_lock_id_seq OWNED BY public.reservation_lock.id;


--
-- TOC entry 238 (class 1259 OID 25048)
-- Name: security_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.security_audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.security_audit_log_id_seq OWNER TO postgres;

--
-- TOC entry 5177 (class 0 OID 0)
-- Dependencies: 238
-- Name: security_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.security_audit_log_id_seq OWNED BY public.security_audit_log.id;


--
-- TOC entry 231 (class 1259 OID 24958)
-- Name: service_offerings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.service_offerings ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.service_offerings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 247 (class 1259 OID 25173)
-- Name: system_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.system_stats AS
 SELECT ( SELECT count(*) AS count
           FROM public.users) AS total_users,
    ( SELECT count(*) AS count
           FROM public.users
          WHERE ((users.role)::text = 'USER'::text)) AS role_users,
    ( SELECT count(*) AS count
           FROM public.users
          WHERE ((users.role)::text = 'AGENT'::text)) AS role_agents,
    ( SELECT count(*) AS count
           FROM public.users
          WHERE ((users.role)::text = 'ADMIN'::text)) AS role_admins,
    ( SELECT count(*) AS count
           FROM public.reservation) AS total_reservations,
    ( SELECT count(*) AS count
           FROM public.reservation
          WHERE ((reservation.status)::text = 'PENDING'::text)) AS pending_reservations,
    ( SELECT count(*) AS count
           FROM public.reservation
          WHERE ((reservation.status)::text = 'CONFIRMED'::text)) AS confirmed_reservations,
    ( SELECT count(*) AS count
           FROM public.reservation
          WHERE ((reservation.status)::text = 'COMPLETED'::text)) AS completed_reservations,
    ( SELECT count(*) AS count
           FROM public.reservation
          WHERE ((reservation.status)::text = 'CANCELED'::text)) AS canceled_reservations,
    ( SELECT count(*) AS count
           FROM public.reservation
          WHERE (reservation.created_at > (now() - '24:00:00'::interval))) AS reservations_last_day,
    ( SELECT count(*) AS count
           FROM public.reservation
          WHERE (reservation.created_at > (now() - '7 days'::interval))) AS reservations_last_week;


ALTER VIEW public.system_stats OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 16389)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 223 (class 1259 OID 24596)
-- Name: verification_code; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.verification_code (
    id bigint NOT NULL,
    code character varying(255),
    created_at timestamp(6) without time zone,
    expires_at timestamp(6) without time zone,
    used boolean NOT NULL,
    user_id bigint
);


ALTER TABLE public.verification_code OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 24595)
-- Name: verification_code_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.verification_code ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.verification_code_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 4902 (class 2604 OID 25115)
-- Name: contact_message id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_message ALTER COLUMN id SET DEFAULT nextval('public.contact_message_id_seq'::regclass);


--
-- TOC entry 4895 (class 2604 OID 24619)
-- Name: pending_user id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_user ALTER COLUMN id SET DEFAULT nextval('public.pending_user_id_seq'::regclass);


--
-- TOC entry 4901 (class 2604 OID 25098)
-- Name: reservation_feedback id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_feedback ALTER COLUMN id SET DEFAULT nextval('public.reservation_feedback_id_seq'::regclass);


--
-- TOC entry 4898 (class 2604 OID 25028)
-- Name: reservation_lock id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_lock ALTER COLUMN id SET DEFAULT nextval('public.reservation_lock_id_seq'::regclass);


--
-- TOC entry 4900 (class 2604 OID 25052)
-- Name: security_audit_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_audit_log ALTER COLUMN id SET DEFAULT nextval('public.security_audit_log_id_seq'::regclass);


--
-- TOC entry 5145 (class 0 OID 24876)
-- Dependencies: 227
-- Data for Name: agency; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.agency (id, name, address, city, phone_number, email, description) VALUES (1, 'Agence Atlas Voyages', 'Rue Mohammed V, Quartier Hassan', 'Rabat', '0537224455', 'atlas.voyages@gmail.com', 'Montagnes Atlas stylisées');
INSERT INTO public.agency (id, name, address, city, phone_number, email, description) VALUES (2, 'Terres d''Aventures', 'Avenue des FAR, Agdal', 'Casablanca', '0522336688', 'terres.aventures@gmail.com', 'Globe terrestre avec palmiers');
INSERT INTO public.agency (id, name, address, city, phone_number, email, description) VALUES (3, 'Voyage Express', 'Boulevard Zerktouni, Gueliz', 'Marrakech', '0524435577', 'voyage.express@gmail.com', 'Avion stylisé en forme de flèche');
INSERT INTO public.agency (id, name, address, city, phone_number, email, description) VALUES (4, 'Horizon Voyage', 'Place Al-Massira, Centre-Ville', 'Fès', '0535651234', 'horizon.voyage@gmail.com', 'Coucher de soleil sur une plage');
INSERT INTO public.agency (id, name, address, city, phone_number, email, description) VALUES (5, 'Sahara Discovery', 'Route de Zagora, Km 5', 'Ouarzazate', '0524889977', 'sahara.discovery@gmail.com', 'Chameau dans le désert');
INSERT INTO public.agency (id, name, address, city, phone_number, email, description) VALUES (6, 'Royal Tours', 'Avenue Mohammed VI, Hay Riad', 'Rabat', '0537202020', 'royal.tours@gmail.com', 'Couronne dorée sur fond bleu');
INSERT INTO public.agency (id, name, address, city, phone_number, email, description) VALUES (7, 'Maroc Authentique', 'Rue Tafilalet, Derb Omar', 'Casablanca', '0661234567', 'maroc.authentique@gmail.com', 'Médina avec portes colorées');
INSERT INTO public.agency (id, name, address, city, phone_number, email, description) VALUES (8, 'Nomade Aventure', 'Avenue Hassan II, Centre-Ville', 'Tanger', '0539393939', 'nomade.aventure@gmail.com', 'Boussole avec montagnes');
INSERT INTO public.agency (id, name, address, city, phone_number, email, description) VALUES (9, 'Évasion Voyages', 'Rue Yacoub El Mansour, Guéliz', 'Marrakech', '0524332211', 'evasion.voyages@gmail.com', 'Plume sur un passeport');
INSERT INTO public.agency (id, name, address, city, phone_number, email, description) VALUES (10, 'Dunes & Découvertes', 'Boulevard Mohamed V, Centre-Ville', 'Agadir', '0528841234', 'dunes.decouverte@gmail.com', 'Dunes de sable avec soleil levant');


--
-- TOC entry 5146 (class 0 OID 24883)
-- Dependencies: 228
-- Data for Name: agency_business_hours; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (2, 'MONDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (2, 'TUESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (2, 'WEDNESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (2, 'THURSDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (2, 'FRIDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (2, 'SATURDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (2, 'SUNDAY', '09:00', '18:00', true);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (10, 'MONDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (10, 'TUESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (10, 'WEDNESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (10, 'THURSDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (10, 'FRIDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (10, 'SATURDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (10, 'SUNDAY', '09:00', '18:00', true);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (9, 'MONDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (9, 'TUESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (9, 'WEDNESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (9, 'THURSDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (9, 'FRIDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (9, 'SATURDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (9, 'SUNDAY', '09:00', '18:00', true);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (4, 'MONDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (4, 'TUESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (4, 'WEDNESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (4, 'THURSDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (4, 'FRIDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (4, 'SATURDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (4, 'SUNDAY', '09:00', '18:00', true);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (7, 'MONDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (7, 'TUESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (7, 'WEDNESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (7, 'THURSDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (7, 'FRIDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (7, 'SATURDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (7, 'SUNDAY', '09:00', '18:00', true);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (8, 'MONDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (8, 'TUESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (8, 'WEDNESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (8, 'THURSDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (8, 'FRIDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (8, 'SATURDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (8, 'SUNDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (6, 'MONDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (6, 'TUESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (6, 'WEDNESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (6, 'THURSDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (6, 'FRIDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (6, 'SATURDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (6, 'SUNDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (5, 'MONDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (5, 'TUESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (5, 'WEDNESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (5, 'THURSDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (5, 'FRIDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (5, 'SATURDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (5, 'SUNDAY', '09:00', '18:00', true);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (3, 'MONDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (3, 'TUESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (3, 'WEDNESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (3, 'THURSDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (3, 'FRIDAY', '09:00', '12:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (3, 'SATURDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (3, 'SUNDAY', '09:00', '18:00', true);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (1, 'MONDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (1, 'TUESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (1, 'WEDNESDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (1, 'THURSDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (1, 'FRIDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (1, 'SATURDAY', '09:00', '18:00', false);
INSERT INTO public.agency_business_hours (agency_id, day, opening_time, closing_time, closed) VALUES (1, 'SUNDAY', '09:00', '18:00', true);


--
-- TOC entry 5151 (class 0 OID 24966)
-- Dependencies: 233
-- Data for Name: agency_services; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.agency_services (agency_id, service_id) VALUES (2, 2);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (2, 4);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (2, 6);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (10, 5);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (10, 6);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (9, 1);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (9, 2);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (9, 3);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (9, 7);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (4, 3);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (4, 4);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (4, 5);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (4, 7);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (7, 2);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (7, 3);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (7, 4);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (7, 5);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (7, 6);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (8, 5);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (6, 2);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (6, 3);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (6, 6);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (6, 7);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (5, 1);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (5, 4);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (5, 7);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (3, 1);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (3, 3);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (3, 5);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (1, 1);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (1, 2);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (1, 3);
INSERT INTO public.agency_services (agency_id, service_id) VALUES (1, 5);


--
-- TOC entry 5148 (class 0 OID 24893)
-- Dependencies: 230
-- Data for Name: agent; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.agent (id, user_id, agency_id, available) VALUES (25, 44, 4, true);
INSERT INTO public.agent (id, user_id, agency_id, available) VALUES (26, 47, 4, true);


--
-- TOC entry 5153 (class 0 OID 25006)
-- Dependencies: 235
-- Data for Name: availability; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (148, 1, '2025-03-31', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (149, 1, '2025-04-01', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (153, 1, '2025-04-05', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (154, 1, '2025-04-06', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (150, 1, '2025-04-02', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (162, 4, '2025-03-24', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (163, 4, '2025-03-25', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (164, 4, '2025-03-26', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (165, 4, '2025-03-27', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (166, 4, '2025-03-28', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (167, 4, '2025-03-29', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (168, 4, '2025-03-30', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (151, 1, '2025-04-03', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (176, 2, '2025-03-31', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (177, 2, '2025-04-01', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (178, 2, '2025-04-02', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (179, 2, '2025-04-03', '12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (180, 2, '2025-04-04', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (181, 2, '2025-04-05', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (182, 2, '2025-04-06', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (152, 1, '2025-04-04', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (183, 4, '2025-04-28', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (184, 4, '2025-04-29', '12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (185, 4, '2025-04-30', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (186, 4, '2025-05-01', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (187, 4, '2025-05-02', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (188, 4, '2025-05-03', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (189, 4, '2025-05-04', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (190, 1, '2025-04-28', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (191, 1, '2025-04-29', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (192, 1, '2025-04-30', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (193, 1, '2025-05-01', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (194, 1, '2025-05-02', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (195, 1, '2025-05-03', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (196, 1, '2025-05-04', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (197, 4, '2025-05-05', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (198, 4, '2025-05-06', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (199, 4, '2025-05-07', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (200, 4, '2025-05-08', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (201, 4, '2025-05-09', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (202, 4, '2025-05-10', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (203, 4, '2025-05-11', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (156, 4, '2025-04-08', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (158, 4, '2025-04-10', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (160, 4, '2025-04-12', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (161, 4, '2025-04-13', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (143, 4, '2025-04-02', '09:00,15:00,16:00,17:00', '10:00,11:00,12:00,13:00,14:00');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (142, 4, '2025-04-01', '', '14:00');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (169, 3, '2025-03-31', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (170, 3, '2025-04-01', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (171, 3, '2025-04-02', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (172, 3, '2025-04-03', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (173, 3, '2025-04-04', '09:00,10:00,11:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (174, 3, '2025-04-05', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (175, 3, '2025-04-06', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (144, 4, '2025-04-03', '15:00,16:00,17:00', '09:00,10:00,11:00,12:00,14:00,13:00');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (145, 4, '2025-04-04', '09:00,11:00,15:00,16:00,17:00', '13:00,14:00,10:00,12:00');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (146, 4, '2025-04-05', '09:00,11:00,12:00,13:00,16:00,17:00', '15:00,14:00,10:00');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (155, 4, '2025-04-07', '11:00,12:00,13:00,14:00,15:00,16:00,17:00', '09:00,08:00,10:00');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (159, 4, '2025-04-11', '09:00,10:00,11:00,12:00,16:00,17:00', '13:00,14:00,15:00');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (141, 4, '2025-03-31', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (157, 4, '2025-04-09', '10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '09:00,08:00');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (204, 4, '2025-05-12', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (205, 4, '2025-05-13', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (206, 4, '2025-05-14', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (207, 4, '2025-05-15', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (208, 4, '2025-05-16', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (209, 4, '2025-05-17', '09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (210, 4, '2025-05-18', '', '');
INSERT INTO public.availability (id, agency_id, date, available_time_slots, booked_time_slots) VALUES (147, 4, '2025-04-06', '', '');


--
-- TOC entry 5159 (class 0 OID 25075)
-- Dependencies: 241
-- Data for Name: blocked_time_slots; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.blocked_time_slots (id, agency_id, date, "time", reason, blocked_by, blocked_at) VALUES (1, 4, '2025-04-02', '12:00:00', '', 25, '2025-04-01 23:12:45.194928');
INSERT INTO public.blocked_time_slots (id, agency_id, date, "time", reason, blocked_by, blocked_at) VALUES (2, 4, '2025-04-02', '13:00:00', '', 25, '2025-04-01 23:12:53.665014');
INSERT INTO public.blocked_time_slots (id, agency_id, date, "time", reason, blocked_by, blocked_at) VALUES (3, 4, '2025-04-05', '15:00:00', '', 25, '2025-04-01 23:13:39.419977');
INSERT INTO public.blocked_time_slots (id, agency_id, date, "time", reason, blocked_by, blocked_at) VALUES (4, 4, '2025-04-04', '13:00:00', '', 25, '2025-04-01 23:13:58.924214');
INSERT INTO public.blocked_time_slots (id, agency_id, date, "time", reason, blocked_by, blocked_at) VALUES (5, 4, '2025-04-04', '14:00:00', '', 25, '2025-04-01 23:14:03.236879');
INSERT INTO public.blocked_time_slots (id, agency_id, date, "time", reason, blocked_by, blocked_at) VALUES (6, 4, '2025-04-05', '14:00:00', '', 25, '2025-04-03 18:20:08.639747');
INSERT INTO public.blocked_time_slots (id, agency_id, date, "time", reason, blocked_by, blocked_at) VALUES (7, 4, '2025-04-04', '12:00:00', '', 25, '2025-04-03 19:35:50.792291');
INSERT INTO public.blocked_time_slots (id, agency_id, date, "time", reason, blocked_by, blocked_at) VALUES (8, 4, '2025-04-11', '13:00:00', '', 25, '2025-04-04 18:58:45.005489');
INSERT INTO public.blocked_time_slots (id, agency_id, date, "time", reason, blocked_by, blocked_at) VALUES (9, 4, '2025-04-11', '14:00:00', '', 25, '2025-04-05 16:34:34.757988');
INSERT INTO public.blocked_time_slots (id, agency_id, date, "time", reason, blocked_by, blocked_at) VALUES (10, 4, '2025-04-11', '15:00:00', '', 25, '2025-04-08 11:03:37.163362');


--
-- TOC entry 5163 (class 0 OID 25112)
-- Dependencies: 245
-- Data for Name: contact_message; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.contact_message (id, user_id, subject, message, created_at, read) VALUES (1, 11, 'Problème technique', 'dedc ', '2025-04-02 19:17:43.140228', false);
INSERT INTO public.contact_message (id, user_id, subject, message, created_at, read) VALUES (2, 11, 'Problème technique', 'dedc ', '2025-04-02 19:17:45.618808', false);
INSERT INTO public.contact_message (id, user_id, subject, message, created_at, read) VALUES (3, 11, 'Problème technique', 'dedc ', '2025-04-02 19:17:47.902586', false);
INSERT INTO public.contact_message (id, user_id, subject, message, created_at, read) VALUES (4, 11, 'Problème technique', 'dedc ', '2025-04-02 19:17:49.193621', false);
INSERT INTO public.contact_message (id, user_id, subject, message, created_at, read) VALUES (5, 11, 'Question sur ma réservation', 'zsaz', '2025-04-02 19:36:03.782686', false);
INSERT INTO public.contact_message (id, user_id, subject, message, created_at, read) VALUES (6, 11, 'Question sur ma réservation', 'xs', '2025-04-02 19:36:50.271611', false);


--
-- TOC entry 5143 (class 0 OID 24608)
-- Dependencies: 225
-- Data for Name: pending_user; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- TOC entry 5139 (class 0 OID 24582)
-- Dependencies: 221
-- Data for Name: reservation; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (51, '2025-04-05 16:33:29.651885', 'qweqweeeeee', '2025-04-07 10:00:00', '2025-04-07T10:00:00', 'Guidage touristique', '2025-04-07 09:00:00', 'COMPLETED', '2025-04-08 11:02:52.086207', 11, 4, 25, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (52, '2025-04-08 11:04:38.471051', 'jjhhg', '2025-04-09 09:00:00', '2025-04-09T09:00:00', 'Assurance et voyage', '2025-04-09 08:00:00', 'COMPLETED', '2025-04-29 11:48:19.499512', 11, 4, 25, true);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (39, '2025-04-02 18:46:01.743082', 'sWdews', '2025-04-03 11:00:00', '2025-04-03T10:00:00', 'Conseils et informations', '2025-04-03 10:00:00', 'COMPLETED', '2025-04-02 18:47:39.106523', 11, 4, 25, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (40, '2025-04-02 19:38:22.850171', 'tudjx', '2025-04-03 12:00:00', '2025-04-03T11:00:00', 'Guidage touristique', '2025-04-03 11:00:00', 'COMPLETED', '2025-04-02 19:40:45.280618', 11, 4, 25, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (41, '2025-04-02 19:49:30.348335', 'dw', '2025-04-03 13:00:00', '2025-04-03T12:00:00', 'Conseils et informations', '2025-04-03 12:00:00', 'COMPLETED', '2025-04-02 19:50:12.603256', 11, 4, 25, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (42, '2025-04-02 20:09:15.597335', 'lug', '2025-04-03 15:00:00', '2025-04-03T14:00:00', 'Conseils et informations', '2025-04-03 14:00:00', 'COMPLETED', '2025-04-02 20:13:08.936489', 11, 4, 25, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (43, '2025-04-02 20:12:37.826657', 'deds

Message de l''agent: dew', '2025-04-03 14:00:00', '2025-04-03T13:00:00', 'Assurance et voyage', '2025-04-03 13:00:00', 'COMPLETED', '2025-04-02 20:13:14.821432', 46, 4, 25, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (31, '2025-04-01 19:53:04.219445', 'sa', NULL, '2025-04-02T12:00:00', 'Réservation de billets et d''hébergement', NULL, 'CANCELED', '2025-04-01 19:53:33.528389', 11, 1, NULL, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (44, '2025-04-02 20:19:49.979685', 'sxz', NULL, '2025-04-03T14:00:00', 'Réservation de billets et d''hébergement', NULL, 'CANCELED', '2025-04-02 20:38:46.227774', 11, 1, NULL, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (45, '2025-04-02 20:39:19.854145', 'qa', NULL, '2025-04-03T10:00:00', 'Guidage touristique', NULL, 'CANCELED', '2025-04-02 21:23:06.76097', 11, 1, NULL, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (46, '2025-04-03 18:09:35.395942', 'sazs', NULL, '2025-04-04T09:00:00', 'Réservation de billets et d''hébergement', NULL, 'CANCELED', '2025-04-03 18:14:22.983259', 11, 1, NULL, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (32, '2025-04-01 19:53:56.939338', 'asxxz

Message de l''agent: xa', '2025-04-02 11:00:00', '2025-04-02T10:00:00', 'Assurance et voyage', '2025-04-02 10:00:00', 'CANCELED', '2025-04-01 19:55:35.561346', 11, 4, 25, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (33, '2025-04-01 20:00:56.119161', 'zX', '2025-04-03 11:00:00', '2025-04-02T10:00:00', 'Conseils et informations', '2025-04-02 10:00:00', 'COMPLETED', '2025-04-01 20:10:38.412299', 11, 4, 25, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (34, '2025-04-01 21:23:51.746739', 'zz', '2025-04-02 12:00:00', '2025-04-02T11:00:00', 'Conseils et informations', '2025-04-02 11:00:00', 'COMPLETED', '2025-04-01 21:24:45.548001', 11, 4, 25, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (47, '2025-04-03 18:17:35.622389', 'lyf', '2025-04-04 11:00:00', '2025-04-04T10:00:00', 'Conseils et informations', '2025-04-04 10:00:00', 'COMPLETED', '2025-04-03 19:30:23.361699', 11, 4, 25, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (35, '2025-04-01 23:16:07.788763', 'zz', '2025-04-02 15:00:00', '2025-04-02T14:00:00', 'Assurance et voyage', '2025-04-01 14:00:00', 'COMPLETED', '2025-04-01 23:17:35.585888', 11, 4, 25, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (36, '2025-04-02 16:58:54.727769', 'hl ', NULL, '2025-04-04T14:00:00', 'Organisation de voyages', NULL, 'CANCELED', '2025-04-02 18:11:34.819921', 11, 1, NULL, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (37, '2025-04-02 18:12:13.600566', 'aad', NULL, '2025-04-03T09:00:00', 'Assurance et voyage', NULL, 'CANCELED', '2025-04-02 18:13:04.18787', 11, 4, NULL, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (38, '2025-04-02 18:23:38.521601', 'k5ysz5', '2025-04-03 10:00:00', '2025-04-03T09:00:00', 'Conseils et informations', '2025-04-03 09:00:00', 'COMPLETED', '2025-04-02 18:43:43.125533', 11, 4, 25, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (48, '2025-04-03 19:31:53.947851', 'wes', NULL, '2025-04-04T09:00:00', 'Conseils et informations', NULL, 'CANCELED', '2025-04-04 08:51:03.672954', 11, 4, NULL, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (49, '2025-04-04 11:21:29.783507', 'ok5sk', '2025-04-05 11:00:00', '2025-04-05T10:00:00', 'Conseils et informations', '2025-04-05 10:00:00', 'COMPLETED', '2025-04-04 11:21:52.60305', 11, 4, 25, false);
INSERT INTO public.reservation (id, created_at, description, end_date_time, preferred_date, service, start_date_time, status, updated_at, user_id, agency_id, handled_by_agent_id, reminder_sent) VALUES (50, '2025-04-04 18:55:57.535385', 'kytx', '2025-04-07 09:00:00', '2025-04-07T09:00:00', 'Guidage touristique', '2025-04-07 08:00:00', 'COMPLETED', '2025-04-04 18:58:25.148537', 11, 4, 25, false);


--
-- TOC entry 5161 (class 0 OID 25095)
-- Dependencies: 243
-- Data for Name: reservation_feedback; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.reservation_feedback (id, reservation_id, comment, rating, created_at) VALUES (1, 35, 'perfect', 4, '2025-04-02 18:18:42.566145');
INSERT INTO public.reservation_feedback (id, reservation_id, comment, rating, created_at) VALUES (2, 33, 'bien', 3, '2025-04-02 18:19:37.920931');
INSERT INTO public.reservation_feedback (id, reservation_id, comment, rating, created_at) VALUES (3, 34, 'perfect', 4, '2025-04-02 18:38:18.851974');
INSERT INTO public.reservation_feedback (id, reservation_id, comment, rating, created_at) VALUES (4, 38, '', 4, '2025-04-02 18:45:02.473708');
INSERT INTO public.reservation_feedback (id, reservation_id, comment, rating, created_at) VALUES (5, 39, '', 4, '2025-04-02 19:37:14.751998');
INSERT INTO public.reservation_feedback (id, reservation_id, comment, rating, created_at) VALUES (6, 42, '', 4, '2025-04-03 10:52:10.708901');
INSERT INTO public.reservation_feedback (id, reservation_id, comment, rating, created_at) VALUES (7, 41, 'ddw', 5, '2025-04-03 19:26:52.245232');
INSERT INTO public.reservation_feedback (id, reservation_id, comment, rating, created_at) VALUES (8, 49, '', 5, '2025-04-04 11:22:19.513409');


--
-- TOC entry 5155 (class 0 OID 25025)
-- Dependencies: 237
-- Data for Name: reservation_lock; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (30, 38, 25, '2025-04-02 18:43:33.44556', '2025-04-02 18:48:33.44556', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (31, 38, 25, '2025-04-02 18:43:36.464185', '2025-04-02 18:48:36.464185', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (32, 38, 25, '2025-04-02 18:43:41.272554', '2025-04-02 18:48:41.272554', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (33, 38, 25, '2025-04-02 18:43:43.125533', '2025-04-02 18:48:43.125533', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (34, 39, 25, '2025-04-02 18:46:17.805328', '2025-04-02 18:51:17.805328', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (35, 39, 25, '2025-04-02 18:46:18.897515', '2025-04-02 18:51:18.897515', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (36, 39, 25, '2025-04-02 18:47:37.613563', '2025-04-02 18:52:37.613563', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (37, 39, 25, '2025-04-02 18:47:39.101537', '2025-04-02 18:52:39.101537', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (38, 40, 25, '2025-04-02 19:40:11.877099', '2025-04-02 19:45:11.877099', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (39, 40, 25, '2025-04-02 19:40:17.051348', '2025-04-02 19:45:17.051348', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (40, 40, 25, '2025-04-02 19:40:44.130765', '2025-04-02 19:45:44.130765', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (41, 40, 25, '2025-04-02 19:40:45.275217', '2025-04-02 19:45:45.275217', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (43, 41, 25, '2025-04-02 19:49:50.953941', '2025-04-02 19:54:50.953941', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (42, 41, 25, '2025-04-02 19:49:48.855481', '2025-04-02 19:54:48.855481', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (45, 41, 25, '2025-04-02 19:50:12.598744', '2025-04-02 19:55:12.598744', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (44, 41, 25, '2025-04-02 19:50:10.141511', '2025-04-02 19:55:10.141511', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (48, 42, 25, '2025-04-02 20:10:45.871568', '2025-04-02 20:15:45.871568', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (47, 42, 25, '2025-04-02 20:10:42.389096', '2025-04-02 20:15:42.389096', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (18, 32, 25, '2025-04-01 19:54:30.386437', '2025-04-01 19:59:30.386437', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (19, 32, 25, '2025-04-01 19:55:35.558346', '2025-04-01 20:00:35.558346', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (50, 43, 26, '2025-04-02 20:12:55.346004', '2025-04-02 20:17:55.346004', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (20, 33, 25, '2025-04-01 20:01:36.074024', '2025-04-01 20:06:36.074024', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (49, 43, 26, '2025-04-02 20:12:51.005128', '2025-04-02 20:17:51.005128', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (21, 33, 25, '2025-04-01 20:10:38.412299', '2025-04-01 20:15:38.412299', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (22, 34, 25, '2025-04-01 21:24:14.866722', '2025-04-01 21:29:14.866722', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (23, 34, 25, '2025-04-01 21:24:45.538839', '2025-04-01 21:29:45.538839', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (52, 42, 25, '2025-04-02 20:13:08.931976', '2025-04-02 20:18:08.931976', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (51, 42, 25, '2025-04-02 20:13:07.429628', '2025-04-02 20:18:07.429628', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (54, 43, 25, '2025-04-02 20:13:14.815564', '2025-04-02 20:18:14.815564', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (53, 43, 25, '2025-04-02 20:13:13.278669', '2025-04-02 20:18:13.278669', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (46, 42, 25, '2025-04-02 20:09:32.921112', '2025-04-02 20:14:32.921112', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (24, 35, 25, '2025-04-01 23:16:28.597646', '2025-04-01 23:21:28.597646', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (25, 35, 25, '2025-04-01 23:16:56.715903', '2025-04-01 23:21:56.715903', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (26, 35, 25, '2025-04-01 23:17:05.967041', '2025-04-01 23:22:05.967041', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (27, 35, 25, '2025-04-01 23:17:27.408353', '2025-04-01 23:22:27.408353', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (28, 35, 25, '2025-04-01 23:17:33.495809', '2025-04-01 23:22:33.495809', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (29, 35, 25, '2025-04-01 23:17:35.579659', '2025-04-01 23:22:35.579659', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (56, 47, 25, '2025-04-03 18:19:18.8043', '2025-04-03 18:24:18.8043', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (55, 47, 25, '2025-04-03 18:19:03.668475', '2025-04-03 18:24:03.668475', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (57, 47, 25, '2025-04-03 18:19:44.194073', '2025-04-03 18:24:44.194073', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (60, 47, 25, '2025-04-03 19:30:23.352985', '2025-04-03 19:35:23.352985', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (59, 47, 25, '2025-04-03 19:30:17.030923', '2025-04-03 19:35:17.030923', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (58, 47, 25, '2025-04-03 19:29:54.249595', '2025-04-03 19:34:54.249595', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (61, 48, 25, '2025-04-03 19:32:21.029527', '2025-04-03 19:37:21.029527', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (63, 49, 25, '2025-04-04 11:21:43.126364', '2025-04-04 11:26:43.126364', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (62, 49, 25, '2025-04-04 11:21:39.28469', '2025-04-04 11:26:39.28469', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (65, 49, 25, '2025-04-04 11:21:52.593294', '2025-04-04 11:26:52.593294', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (64, 49, 25, '2025-04-04 11:21:51.463694', '2025-04-04 11:26:51.463694', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (67, 50, 25, '2025-04-04 18:57:38.491742', '2025-04-04 19:02:38.491742', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (66, 50, 25, '2025-04-04 18:57:34.592066', '2025-04-04 19:02:34.592066', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (69, 50, 25, '2025-04-04 18:58:25.144774', '2025-04-04 19:03:25.144774', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (68, 50, 25, '2025-04-04 18:58:23.734852', '2025-04-04 19:03:23.734852', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (71, 51, 25, '2025-04-05 16:34:56.799151', '2025-04-05 16:39:56.799151', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (70, 51, 25, '2025-04-05 16:34:50.593206', '2025-04-05 16:39:50.593206', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (73, 51, 25, '2025-04-08 11:02:52.086207', '2025-04-08 11:07:52.086207', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (72, 51, 25, '2025-04-08 11:02:46.907689', '2025-04-08 11:07:46.907689', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (75, 52, 25, '2025-04-08 11:05:29.285132', '2025-04-08 11:10:29.285132', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (74, 52, 25, '2025-04-08 11:05:27.088156', '2025-04-08 11:10:27.088156', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (77, 52, 25, '2025-04-29 11:48:19.499512', '2025-04-29 11:53:19.499512', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (76, 52, 25, '2025-04-29 11:48:10.618418', '2025-04-29 11:53:10.618418', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (79, 52, 25, '2025-04-29 11:48:25.349108', '2025-04-29 11:53:25.349108', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (78, 52, 25, '2025-04-29 11:48:23.007649', '2025-04-29 11:53:23.007649', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (81, 52, 25, '2025-04-29 11:48:32.013613', '2025-04-29 11:53:32.013613', false);
INSERT INTO public.reservation_lock (id, reservation_id, locked_by_id, locked_at, expires_at, active) VALUES (80, 52, 25, '2025-04-29 11:48:30.816929', '2025-04-29 11:53:30.816929', false);


--
-- TOC entry 5157 (class 0 OID 25049)
-- Dependencies: 239
-- Data for Name: security_audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (1, '2025-03-29 22:25:52.61774', 'youssef.benali@gmail.com', 'ACCESS_DENIED', '/api/agent/reservation/complete/20', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (2, '2025-03-29 23:07:50.262915', 'system', 'ACCESS_DENIED', '/api/user/update-username', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (3, '2025-03-29 23:07:51.608547', 'system', 'ACCESS_DENIED', '/api/user/update-username', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (4, '2025-03-29 23:08:14.319942', 'system', 'ACCESS_DENIED', '/api/agent/reservation/complete/20', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (5, '2025-03-29 23:10:02.407598', 'system', 'ACCESS_DENIED', '/api/agent/reservation/cancel/20', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (6, '2025-03-29 23:10:42.497156', 'system', 'ACCESS_DENIED', '/api/agent/reservation/complete/20', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (7, '2025-03-29 23:42:59.511409', 'system', 'ACCESS_DENIED', '/api/user/update-username', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (8, '2025-03-29 23:44:37.804403', 'system', 'ACCESS_DENIED', '/api/user/update-username', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (9, '2025-03-29 23:44:38.600568', 'system', 'ACCESS_DENIED', '/api/user/update-username', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (10, '2025-03-29 23:44:38.772497', 'system', 'ACCESS_DENIED', '/api/user/update-username', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (11, '2025-03-29 23:44:38.951707', 'system', 'ACCESS_DENIED', '/api/user/update-username', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (12, '2025-03-29 23:44:39.155782', 'system', 'ACCESS_DENIED', '/api/user/update-username', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (13, '2025-03-29 23:51:32.615166', 'system', 'ACCESS_DENIED', '/api/agent/reservation/cancel/20', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (14, '2025-03-29 23:51:39.658949', 'system', 'ACCESS_DENIED', '/api/agent/reservation/complete/20', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (15, '2025-03-30 00:47:24.699227', 'youssef.benali@gmail.com', 'ACCESS_DENIED', '/api/agent/reservation/complete/20', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (16, '2025-03-30 00:47:26.122202', 'youssef.benali@gmail.com', 'ACCESS_DENIED', '/api/agent/reservation/complete/20', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (17, '2025-03-30 00:47:26.503649', 'youssef.benali@gmail.com', 'ACCESS_DENIED', '/api/agent/reservation/complete/20', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (18, '2025-03-30 00:47:26.690893', 'youssef.benali@gmail.com', 'ACCESS_DENIED', '/api/agent/reservation/complete/20', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (19, '2025-03-30 00:47:50.236843', 'youssef.benali@gmail.com', 'ACCESS_DENIED', '/api/user/update-username', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (20, '2025-03-30 00:47:52.758243', 'youssef.benali@gmail.com', 'ACCESS_DENIED', '/api/user/update-username', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (21, '2025-03-30 00:47:53.170963', 'youssef.benali@gmail.com', 'ACCESS_DENIED', '/api/user/update-username', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (22, '2025-03-30 00:47:53.364815', 'youssef.benali@gmail.com', 'ACCESS_DENIED', '/api/user/update-username', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (23, '2025-03-30 00:48:09.565973', 'youssef.benali@gmail.com', 'ACCESS_DENIED', '/api/agent/reservation/complete/20', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (24, '2025-03-30 00:48:11.535769', 'youssef.benali@gmail.com', 'ACCESS_DENIED', '/api/agent/reservation/complete/20', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (25, '2025-03-30 00:48:11.730788', 'youssef.benali@gmail.com', 'ACCESS_DENIED', '/api/agent/reservation/complete/20', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (26, '2025-03-30 00:48:11.941148', 'youssef.benali@gmail.com', 'ACCESS_DENIED', '/api/agent/reservation/complete/20', 'POST', '{"user":"anonyme"}');
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (27, '2025-03-30 15:46:11.586486', 'system', 'LOGOUT', 'USER', 'youssef.benali@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (28, '2025-03-30 16:01:28.935893', 'system', 'LOGOUT', 'USER', 'youssef.benali@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (29, '2025-03-30 16:03:53.29021', 'system', 'LOGOUT', 'USER', 'jamilmouad26000@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (30, '2025-03-31 14:17:37.380721', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (31, '2025-04-01 13:31:55.052674', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (32, '2025-04-01 17:16:36.793233', 'system', 'LOGOUT', 'USER', 'jamilmouad25000@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (33, '2025-04-01 17:23:46.995796', 'system', 'LOGOUT', 'USER', 'youssef.benali@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (34, '2025-04-01 17:28:30.207088', 'system', 'LOGOUT', 'USER', 'jamilmouad25000@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (35, '2025-04-01 17:30:17.84921', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (36, '2025-04-01 17:41:40.725233', 'system', 'LOGOUT', 'USER', 'jamilmouad26000@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (37, '2025-04-01 18:51:30.123922', 'system', 'LOGOUT', 'USER', 'youssef.benali@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (38, '2025-04-01 19:20:03.253509', 'system', 'LOGOUT', 'USER', 'youssef.benali@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (39, '2025-04-02 16:42:53.295839', 'system', 'LOGOUT', 'USER', 'youssef.benali@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (40, '2025-04-02 18:23:05.175918', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (41, '2025-04-02 18:43:18.336084', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (42, '2025-04-02 19:39:45.657728', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (43, '2025-04-02 20:06:41.998617', 'system', 'LOGOUT', 'USER', 'youssef.benali@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (44, '2025-04-02 20:08:47.668746', 'system', 'LOGOUT', 'USER', 'jamilmouad25000@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (45, '2025-04-02 20:12:16.071708', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (46, '2025-04-02 20:17:27.52399', 'system', 'LOGOUT', 'USER', 'youssef.benali@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (47, '2025-04-02 21:24:03.241678', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (48, '2025-04-02 21:29:20.988143', 'system', 'LOGOUT', 'USER', 'jamilmouad25000@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (49, '2025-04-02 21:47:05.578999', 'system', 'LOGOUT', 'USER', 'jamilmouad25000@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (50, '2025-04-02 22:06:14.573525', 'system', 'LOGOUT', 'USER', 'jamilmouad25000@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (51, '2025-04-02 22:14:31.055579', 'system', 'LOGOUT', 'USER', 'jamilmouad25000@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (52, '2025-04-02 22:28:25.237859', 'system', 'LOGOUT', 'USER', 'youssef.benali@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (53, '2025-04-02 22:37:06.036618', 'system', 'LOGOUT', 'USER', 'jamilmouad25000@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (54, '2025-04-02 22:37:47.096385', 'system', 'LOGOUT', 'USER', 'youssef.benali@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (55, '2025-04-03 09:53:49.044471', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (56, '2025-04-03 10:53:54.141577', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (57, '2025-04-03 11:07:31.662304', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (58, '2025-04-03 12:18:06.184969', 'system', 'LOGOUT', 'USER', 'jamilmouad25000@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (59, '2025-04-03 12:38:37.547306', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (60, '2025-04-03 18:10:19.193889', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (61, '2025-04-03 18:12:34.822863', 'system', 'LOGOUT', 'USER', 'jamilmouad25000@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (62, '2025-04-03 18:18:06.365999', 'system', 'LOGOUT', 'USER', 'jamilmouad26000@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (63, '2025-04-03 18:18:24.450225', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (64, '2025-04-03 19:29:15.001735', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (65, '2025-04-03 19:37:44.790618', 'system', 'LOGOUT', 'USER', 'youssef.benali@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (66, '2025-04-03 19:41:26.35147', 'system', 'LOGOUT', 'USER', 'jamilmouad25000@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (67, '2025-04-03 19:42:24.474684', 'system', 'LOGOUT', 'USER', 'jamilmouad26000@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (68, '2025-04-04 08:58:27.434966', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (69, '2025-04-04 11:19:27.258618', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (70, '2025-04-04 11:22:51.526295', 'system', 'LOGOUT', 'USER', 'youssef.benali@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (71, '2025-04-04 18:56:34.00884', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (72, '2025-04-04 18:58:57.979166', 'system', 'LOGOUT', 'USER', 'youssef.benali@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (73, '2025-04-05 16:33:51.634411', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (74, '2025-04-05 16:35:22.733877', 'system', 'LOGOUT', 'USER', 'youssef.benali@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (75, '2025-04-05 16:39:28.093599', 'system', 'LOGOUT', 'USER', 'jamilmouad25000@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (76, '2025-04-08 11:07:13.120072', 'system', 'LOGOUT', 'USER', 'youssef.benali@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (77, '2025-04-29 11:50:45.44639', 'system', 'LOGOUT', 'USER', 'youssef.benali@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (78, '2025-04-29 18:12:38.863838', 'system', 'LOGOUT', 'USER', 'jamilmouad25000@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (79, '2025-04-29 18:13:37.014551', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (80, '2025-04-29 18:14:04.212812', 'system', 'LOGOUT', 'USER', 'youssef.benali@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (81, '2025-05-07 12:07:08.208145', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (82, '2025-05-07 12:07:49.246545', 'system', 'LOGOUT', 'USER', 'jamilmouad25000@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (83, '2025-05-07 18:13:27.998424', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);
INSERT INTO public.security_audit_log (id, "timestamp", user_email, action, resource_type, resource_id, details) VALUES (84, '2025-05-07 18:15:40.582705', 'system', 'LOGOUT', 'USER', 'mouadjamil9@gmail.com', NULL);


--
-- TOC entry 5150 (class 0 OID 24959)
-- Dependencies: 232
-- Data for Name: service_offerings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.service_offerings (id, name) VALUES (1, 'Organisation de voyages');
INSERT INTO public.service_offerings (id, name) VALUES (2, 'Réservation de billets et d''hébergement');
INSERT INTO public.service_offerings (id, name) VALUES (3, 'Guidage touristique');
INSERT INTO public.service_offerings (id, name) VALUES (4, 'Assurance et voyage');
INSERT INTO public.service_offerings (id, name) VALUES (5, 'Conseils et informations');
INSERT INTO public.service_offerings (id, name) VALUES (6, 'Organisation de voyages pour le Hadj et l''Omra');
INSERT INTO public.service_offerings (id, name) VALUES (7, 'Fourniture de transport et de transfert');


--
-- TOC entry 5137 (class 0 OID 16390)
-- Dependencies: 219
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users (id, email, password, role, username) VALUES (46, 'jamilmouad26000@gmail.com', '$2a$10$y14E2lnMHgczu0j1ktHVAuiuQwTBwUGuzcMwbyKKdPhfIv53Dcg1O', 'USER', 'Test user 1');
INSERT INTO public.users (id, email, password, role, username) VALUES (47, 'ahmed.hamada@gmail.com', '$2a$10$u5msNsJ1zJjeVlfTltSMOuk.goATiQmHYfhQsEECZf2QFhRqTxVES', 'AGENT', 'Ahmed Hamada');
INSERT INTO public.users (id, email, password, role, username) VALUES (6, 'jamilmouad25000@gmail.com', '$2a$10$0DxXBAGVwh0A1wMj1C5hIer2jXScWyHzxn/O4E/LH/tUJH3eaj.Y.', 'ADMIN', 'Administrateur');
INSERT INTO public.users (id, email, password, role, username) VALUES (44, 'youssef.benali@gmail.com', '$2a$10$luYkhEiHqrzGQjvlu8xAdegS3Gx3FVXt96FD0k6dEL/HktxsSINDS', 'AGENT', 'Youssef  Benali');
INSERT INTO public.users (id, email, password, role, username) VALUES (11, 'mouadjamil9@gmail.com', '$2a$10$vGqPjuMBq7tesMED6nEWcesaEx7G961qIPYVh3wR.y3JXTYuZZIiq', 'USER', 'TEST USER');


--
-- TOC entry 5141 (class 0 OID 24596)
-- Dependencies: 223
-- Data for Name: verification_code; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.verification_code (id, code, created_at, expires_at, used, user_id) VALUES (15, '723039', '2025-05-07 18:13:49.767537', '2025-05-07 18:28:49.767537', true, 11);


--
-- TOC entry 5178 (class 0 OID 0)
-- Dependencies: 226
-- Name: agency_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agency_id_seq', 10, true);


--
-- TOC entry 5179 (class 0 OID 0)
-- Dependencies: 229
-- Name: agent_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agent_id_seq', 26, true);


--
-- TOC entry 5180 (class 0 OID 0)
-- Dependencies: 234
-- Name: availability_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.availability_id_seq', 210, true);


--
-- TOC entry 5181 (class 0 OID 0)
-- Dependencies: 240
-- Name: blocked_time_slots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.blocked_time_slots_id_seq', 10, true);


--
-- TOC entry 5182 (class 0 OID 0)
-- Dependencies: 244
-- Name: contact_message_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contact_message_id_seq', 6, true);


--
-- TOC entry 5183 (class 0 OID 0)
-- Dependencies: 224
-- Name: pending_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pending_user_id_seq', 4, true);


--
-- TOC entry 5184 (class 0 OID 0)
-- Dependencies: 242
-- Name: reservation_feedback_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reservation_feedback_id_seq', 8, true);


--
-- TOC entry 5185 (class 0 OID 0)
-- Dependencies: 220
-- Name: reservation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reservation_id_seq', 52, true);


--
-- TOC entry 5186 (class 0 OID 0)
-- Dependencies: 236
-- Name: reservation_lock_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reservation_lock_id_seq', 81, true);


--
-- TOC entry 5187 (class 0 OID 0)
-- Dependencies: 238
-- Name: security_audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.security_audit_log_id_seq', 84, true);


--
-- TOC entry 5188 (class 0 OID 0)
-- Dependencies: 231
-- Name: service_offerings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.service_offerings_id_seq', 7, true);


--
-- TOC entry 5189 (class 0 OID 0)
-- Dependencies: 218
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 47, true);


--
-- TOC entry 5190 (class 0 OID 0)
-- Dependencies: 222
-- Name: verification_code_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.verification_code_id_seq', 15, true);


--
-- TOC entry 4926 (class 2606 OID 24882)
-- Name: agency agency_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency
    ADD CONSTRAINT agency_pkey PRIMARY KEY (id);


--
-- TOC entry 4937 (class 2606 OID 24970)
-- Name: agency_services agency_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_services
    ADD CONSTRAINT agency_services_pkey PRIMARY KEY (agency_id, service_id);


--
-- TOC entry 4931 (class 2606 OID 24898)
-- Name: agent agent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent
    ADD CONSTRAINT agent_pkey PRIMARY KEY (id);


--
-- TOC entry 4939 (class 2606 OID 25012)
-- Name: availability availability_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability
    ADD CONSTRAINT availability_pkey PRIMARY KEY (id);


--
-- TOC entry 4953 (class 2606 OID 25079)
-- Name: blocked_time_slots blocked_time_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_time_slots
    ADD CONSTRAINT blocked_time_slots_pkey PRIMARY KEY (id);


--
-- TOC entry 4964 (class 2606 OID 25120)
-- Name: contact_message contact_message_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_message
    ADD CONSTRAINT contact_message_pkey PRIMARY KEY (id);


--
-- TOC entry 4922 (class 2606 OID 24617)
-- Name: pending_user pending_user_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_user
    ADD CONSTRAINT pending_user_email_key UNIQUE (email);


--
-- TOC entry 4924 (class 2606 OID 24621)
-- Name: pending_user pending_user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_user
    ADD CONSTRAINT pending_user_pkey PRIMARY KEY (id);


--
-- TOC entry 4960 (class 2606 OID 25103)
-- Name: reservation_feedback reservation_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_feedback
    ADD CONSTRAINT reservation_feedback_pkey PRIMARY KEY (id);


--
-- TOC entry 4962 (class 2606 OID 25105)
-- Name: reservation_feedback reservation_feedback_reservation_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_feedback
    ADD CONSTRAINT reservation_feedback_reservation_id_key UNIQUE (reservation_id);


--
-- TOC entry 4945 (class 2606 OID 25031)
-- Name: reservation_lock reservation_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_lock
    ADD CONSTRAINT reservation_lock_pkey PRIMARY KEY (id);


--
-- TOC entry 4918 (class 2606 OID 24589)
-- Name: reservation reservation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation
    ADD CONSTRAINT reservation_pkey PRIMARY KEY (id);


--
-- TOC entry 4951 (class 2606 OID 25056)
-- Name: security_audit_log security_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_audit_log
    ADD CONSTRAINT security_audit_log_pkey PRIMARY KEY (id);


--
-- TOC entry 4933 (class 2606 OID 24963)
-- Name: service_offerings service_offerings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_offerings
    ADD CONSTRAINT service_offerings_pkey PRIMARY KEY (id);


--
-- TOC entry 4935 (class 2606 OID 24965)
-- Name: service_offerings uk_service_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_offerings
    ADD CONSTRAINT uk_service_name UNIQUE (name);


--
-- TOC entry 4957 (class 2606 OID 25093)
-- Name: blocked_time_slots ukk9hmt3ysffo9jrrs60b2vnr0l; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_time_slots
    ADD CONSTRAINT ukk9hmt3ysffo9jrrs60b2vnr0l UNIQUE (agency_id, date, "time");


--
-- TOC entry 4907 (class 2606 OID 16401)
-- Name: users ukq4gvg4dl2a3fpetfwspodde8e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT ukq4gvg4dl2a3fpetfwspodde8e UNIQUE (email);


--
-- TOC entry 4909 (class 2606 OID 16397)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4920 (class 2606 OID 24600)
-- Name: verification_code verification_code_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verification_code
    ADD CONSTRAINT verification_code_pkey PRIMARY KEY (id);


--
-- TOC entry 4927 (class 1259 OID 25278)
-- Name: idx_agency_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agency_city ON public.agency USING btree (city);


--
-- TOC entry 4928 (class 1259 OID 25280)
-- Name: idx_agency_city_trigram; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agency_city_trigram ON public.agency USING gin (city public.gin_trgm_ops);


--
-- TOC entry 4929 (class 1259 OID 25279)
-- Name: idx_agency_name_trigram; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agency_name_trigram ON public.agency USING gin (name public.gin_trgm_ops);


--
-- TOC entry 4946 (class 1259 OID 25072)
-- Name: idx_audit_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_action ON public.security_audit_log USING btree (action);


--
-- TOC entry 4947 (class 1259 OID 25073)
-- Name: idx_audit_resource; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_resource ON public.security_audit_log USING btree (resource_type, resource_id);


--
-- TOC entry 4948 (class 1259 OID 25057)
-- Name: idx_audit_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_timestamp ON public.security_audit_log USING btree ("timestamp");


--
-- TOC entry 4949 (class 1259 OID 25058)
-- Name: idx_audit_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_user ON public.security_audit_log USING btree (user_email);


--
-- TOC entry 4940 (class 1259 OID 25148)
-- Name: idx_availability_agency_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_availability_agency_date ON public.availability USING btree (agency_id, date);


--
-- TOC entry 4954 (class 1259 OID 25090)
-- Name: idx_blocked_timeslots_agency_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blocked_timeslots_agency_date ON public.blocked_time_slots USING btree (agency_id, date);


--
-- TOC entry 4955 (class 1259 OID 25091)
-- Name: idx_blocked_timeslots_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_blocked_timeslots_unique ON public.blocked_time_slots USING btree (agency_id, date, "time");


--
-- TOC entry 4965 (class 1259 OID 25128)
-- Name: idx_contact_message_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contact_message_read ON public.contact_message USING btree (read);


--
-- TOC entry 4966 (class 1259 OID 25127)
-- Name: idx_contact_message_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contact_message_user ON public.contact_message USING btree (user_id);


--
-- TOC entry 4958 (class 1259 OID 25126)
-- Name: idx_feedback_reservation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feedback_reservation ON public.reservation_feedback USING btree (reservation_id);


--
-- TOC entry 4941 (class 1259 OID 25043)
-- Name: idx_lock_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lock_active ON public.reservation_lock USING btree (active);


--
-- TOC entry 4942 (class 1259 OID 25044)
-- Name: idx_lock_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lock_expires ON public.reservation_lock USING btree (expires_at);


--
-- TOC entry 4943 (class 1259 OID 25042)
-- Name: idx_lock_reservation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lock_reservation ON public.reservation_lock USING btree (reservation_id);


--
-- TOC entry 4967 (class 1259 OID 25167)
-- Name: idx_mv_active_reservations_agency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_active_reservations_agency ON public.mv_active_reservations USING btree (agency_id);


--
-- TOC entry 4968 (class 1259 OID 25168)
-- Name: idx_mv_active_reservations_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_active_reservations_agent ON public.mv_active_reservations USING btree (agent_id);


--
-- TOC entry 4969 (class 1259 OID 25166)
-- Name: idx_mv_active_reservations_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_active_reservations_status ON public.mv_active_reservations USING btree (status);


--
-- TOC entry 4970 (class 1259 OID 25272)
-- Name: idx_mv_agencies_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mv_agencies_city ON public.mv_agencies_with_services USING btree (city);


--
-- TOC entry 4910 (class 1259 OID 25131)
-- Name: idx_reservation_agency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservation_agency ON public.reservation USING btree (agency_id);


--
-- TOC entry 4911 (class 1259 OID 25152)
-- Name: idx_reservation_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservation_agent ON public.reservation USING btree (handled_by_agent_id);


--
-- TOC entry 4912 (class 1259 OID 25151)
-- Name: idx_reservation_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservation_created ON public.reservation USING btree (created_at);


--
-- TOC entry 4913 (class 1259 OID 25150)
-- Name: idx_reservation_datetime; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservation_datetime ON public.reservation USING btree (start_date_time, end_date_time);


--
-- TOC entry 4914 (class 1259 OID 25130)
-- Name: idx_reservation_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservation_status ON public.reservation USING btree (status);


--
-- TOC entry 4915 (class 1259 OID 25153)
-- Name: idx_reservation_status_datetime; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservation_status_datetime ON public.reservation USING btree (status, start_date_time);


--
-- TOC entry 4916 (class 1259 OID 25129)
-- Name: idx_reservation_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservation_user ON public.reservation USING btree (user_id);


--
-- TOC entry 4974 (class 2606 OID 24601)
-- Name: verification_code fk54hony7tk7x7gaaqp0rf16raa; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verification_code
    ADD CONSTRAINT fk54hony7tk7x7gaaqp0rf16raa FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4978 (class 2606 OID 24971)
-- Name: agency_services fk_agency_services_agency; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_services
    ADD CONSTRAINT fk_agency_services_agency FOREIGN KEY (agency_id) REFERENCES public.agency(id);


--
-- TOC entry 4979 (class 2606 OID 24976)
-- Name: agency_services fk_agency_services_service; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_services
    ADD CONSTRAINT fk_agency_services_service FOREIGN KEY (service_id) REFERENCES public.service_offerings(id);


--
-- TOC entry 4976 (class 2606 OID 24904)
-- Name: agent fk_agent_agency; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent
    ADD CONSTRAINT fk_agent_agency FOREIGN KEY (agency_id) REFERENCES public.agency(id);


--
-- TOC entry 4977 (class 2606 OID 24899)
-- Name: agent fk_agent_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agent
    ADD CONSTRAINT fk_agent_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4980 (class 2606 OID 25013)
-- Name: availability fk_availability_agency; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability
    ADD CONSTRAINT fk_availability_agency FOREIGN KEY (agency_id) REFERENCES public.agency(id);


--
-- TOC entry 4983 (class 2606 OID 25080)
-- Name: blocked_time_slots fk_blocked_timeslot_agency; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_time_slots
    ADD CONSTRAINT fk_blocked_timeslot_agency FOREIGN KEY (agency_id) REFERENCES public.agency(id) ON DELETE CASCADE;


--
-- TOC entry 4984 (class 2606 OID 25085)
-- Name: blocked_time_slots fk_blocked_timeslot_agent; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blocked_time_slots
    ADD CONSTRAINT fk_blocked_timeslot_agent FOREIGN KEY (blocked_by) REFERENCES public.agent(id) ON DELETE SET NULL;


--
-- TOC entry 4975 (class 2606 OID 24887)
-- Name: agency_business_hours fk_business_hours_agency; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agency_business_hours
    ADD CONSTRAINT fk_business_hours_agency FOREIGN KEY (agency_id) REFERENCES public.agency(id);


--
-- TOC entry 4986 (class 2606 OID 25121)
-- Name: contact_message fk_contact_message_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_message
    ADD CONSTRAINT fk_contact_message_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4985 (class 2606 OID 25106)
-- Name: reservation_feedback fk_feedback_reservation; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_feedback
    ADD CONSTRAINT fk_feedback_reservation FOREIGN KEY (reservation_id) REFERENCES public.reservation(id);


--
-- TOC entry 4981 (class 2606 OID 25037)
-- Name: reservation_lock fk_lock_agent; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_lock
    ADD CONSTRAINT fk_lock_agent FOREIGN KEY (locked_by_id) REFERENCES public.agent(id);


--
-- TOC entry 4982 (class 2606 OID 25032)
-- Name: reservation_lock fk_lock_reservation; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_lock
    ADD CONSTRAINT fk_lock_reservation FOREIGN KEY (reservation_id) REFERENCES public.reservation(id);


--
-- TOC entry 4971 (class 2606 OID 24929)
-- Name: reservation fk_reservation_agency; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation
    ADD CONSTRAINT fk_reservation_agency FOREIGN KEY (agency_id) REFERENCES public.agency(id);


--
-- TOC entry 4972 (class 2606 OID 25018)
-- Name: reservation fk_reservation_agent; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation
    ADD CONSTRAINT fk_reservation_agent FOREIGN KEY (handled_by_agent_id) REFERENCES public.agent(id);


--
-- TOC entry 4973 (class 2606 OID 24590)
-- Name: reservation fkrea93581tgkq61mdl13hehami; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation
    ADD CONSTRAINT fkrea93581tgkq61mdl13hehami FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5164 (class 0 OID 25154)
-- Dependencies: 246 5167
-- Name: mv_active_reservations; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: postgres
--

REFRESH MATERIALIZED VIEW public.mv_active_reservations;


--
-- TOC entry 5165 (class 0 OID 25260)
-- Dependencies: 248 5167
-- Name: mv_agencies_with_services; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: postgres
--

REFRESH MATERIALIZED VIEW public.mv_agencies_with_services;


-- Completed on 2025-05-08 13:03:30

--
-- PostgreSQL database dump complete
--

