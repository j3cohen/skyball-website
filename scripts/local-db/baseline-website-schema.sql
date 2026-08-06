


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."auto_receive"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN PERFORM public.record_purchase_receipt(NEW.id); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."auto_receive"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_ship"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN PERFORM public.record_sale(NEW.id); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."auto_ship"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_landed_cost"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.landed_unit_cost := 
    (NEW.qty * NEW.unit_cost
     + NEW.freight_alloc
     + NEW.duty_alloc
     + NEW.other_alloc)
    / NULLIF(NEW.qty,0);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."compute_landed_cost"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_pass_and_register"("pass_id" "uuid", "user_id" "uuid", "tournament_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- 1) decrement the pass
  UPDATE public.passes
    SET quantity_remaining = quantity_remaining - 1
  WHERE id = pass_id
    AND quantity_remaining > 0;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient pass quantity';
  END IF;

  -- 2) insert the registration
  INSERT INTO public.registrations(user_id, tournament_id, pass_id)
  VALUES (user_id, tournament_id, pass_id);
END;
$$;


ALTER FUNCTION "public"."consume_pass_and_register"("pass_id" "uuid", "user_id" "uuid", "tournament_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_kpi_summary"("p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("revenue" numeric, "cogs" numeric, "shipping_expense" numeric, "gross_margin" numeric, "total_gift_cogs" numeric, "total_gift_shipping" numeric, "net_margin_including_gifts" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  -- Aggregate non-gift and gift orders separately into single rows
  WITH non_gifts_agg AS (
    SELECT
      COALESCE(SUM(total_price), 0)   AS total_revenue,
      COALESCE(SUM(total_cogs), 0)    AS total_cogs,
      COALESCE(SUM(shipping_cost), 0) AS total_shipping
    FROM public.inventory_sales_orders
    WHERE is_gift = FALSE
      AND (p_start_date IS NULL OR date >= p_start_date)
      AND (p_end_date   IS NULL OR date <= p_end_date)
  ),
  gift_orders_agg AS (
    SELECT
      COALESCE(SUM(total_cogs), 0)    AS total_gift_cogs,
      COALESCE(SUM(shipping_cost), 0) AS total_gift_shipping
    FROM public.inventory_sales_orders
    WHERE is_gift = TRUE
      AND (p_start_date IS NULL OR date >= p_start_date)
      AND (p_end_date   IS NULL OR date <= p_end_date)
  )
  SELECT
    ng.total_revenue                                                    AS revenue,
    ng.total_cogs                                                       AS cogs,
    ng.total_shipping                                                   AS shipping_expense,
    (ng.total_revenue - ng.total_cogs - ng.total_shipping)             AS gross_margin,
    go.total_gift_cogs                                                  AS total_gift_cogs,
    go.total_gift_shipping                                              AS total_gift_shipping,
    (ng.total_revenue - ng.total_cogs - ng.total_shipping
     - go.total_gift_cogs - go.total_gift_shipping)                    AS net_margin_including_gifts
  FROM non_gifts_agg ng
  CROSS JOIN gift_orders_agg go;  -- safe because each CTE is a single row
END;
$$;


ALTER FUNCTION "public"."get_kpi_summary"("p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_match_details_by_tournament"("p_tournament_id" "text") RETURNS TABLE("match_id" "text", "round" "text", "player1_slug" "text", "player1_name" "text", "player1_seed" integer, "player2_slug" "text", "player2_name" "text", "player2_seed" integer, "winner_slug" "text", "sets" "jsonb")
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    m.id::text,
    m.round,
    p1.slug,
    p1.name,
    COALESCE(pt1.seed, 0)   AS player1_seed,
    p2.slug,
    p2.name,
    COALESCE(pt2.seed, 0)   AS player2_seed,
    w.slug,
    jsonb_agg(
      jsonb_build_object(
        'set_number',    ms.set_number,
        'player1Score',  ms.p1_score,
        'player2Score',  ms.p2_score
      )
      ORDER BY ms.set_number
    ) AS sets
  FROM public.matches m
  JOIN public.players p1 ON p1.id = m.player1_id
  JOIN public.players p2 ON p2.id = m.player2_id
  JOIN public.players w  ON w.id  = m.winner_id
  LEFT JOIN public.player_tournament_points pt1
    ON pt1.player_id     = m.player1_id
   AND pt1.tournament_id = p_tournament_id
  LEFT JOIN public.player_tournament_points pt2
    ON pt2.player_id     = m.player2_id
   AND pt2.tournament_id = p_tournament_id
  JOIN public.match_sets ms
    ON ms.match_id = m.id
  WHERE m.tournament_id = p_tournament_id
  GROUP BY m.id, m.round, p1.slug, p1.name, p2.slug, p2.name, w.slug, pt1.seed, pt2.seed;
$$;


ALTER FUNCTION "public"."get_match_details_by_tournament"("p_tournament_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tournament_summary"("p_tournament_id" "text") RETURNS TABLE("winner" "text", "runner_up" "text", "score" "text")
    LANGUAGE "sql" STABLE
    AS $$
  WITH final_match AS (
    SELECT m.id,
           m.winner_id,
           CASE
             WHEN m.player1_id = m.winner_id THEN m.player2_id
             ELSE m.player1_id
           END AS loser_id
    FROM public.matches m
    WHERE m.tournament_id = p_tournament_id
      AND LOWER(m.round) = 'final'
    LIMIT 1
  ),
  set_scores AS (
    SELECT 
      ms.match_id,
      STRING_AGG(
        CONCAT(ms.p1_score, '–', ms.p2_score),
        ', ' ORDER BY ms.set_number
      ) AS score_str
    FROM public.match_sets ms
    JOIN final_match fm ON fm.id = ms.match_id
    GROUP BY ms.match_id
  )
  SELECT
    pw.name     AS winner,
    pl.name     AS runner_up,
    ss.score_str AS score
  FROM final_match fm
  JOIN public.players pw ON pw.id = fm.winner_id
  JOIN public.players pl ON pl.id = fm.loser_id
  LEFT JOIN set_scores ss ON ss.match_id = fm.id;
$$;


ALTER FUNCTION "public"."get_tournament_summary"("p_tournament_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;  -- just in case
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_purchase_receipt"("po_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  po    public.inventory_purchase_orders%ROWTYPE;
  pol   public.inventory_purchase_order_lines%ROWTYPE;
  total_base NUMERIC;
  alloc_factor NUMERIC;
  old_qty  NUMERIC;
  old_avg  NUMERIC;
  new_avg  NUMERIC;
  l_cost   NUMERIC;
BEGIN
  SELECT * INTO po FROM public.inventory_purchase_orders WHERE id=po_id;
  SELECT SUM(qty*unit_cost) INTO total_base
    FROM public.inventory_purchase_order_lines WHERE purchase_order_id=po_id;
  FOR pol IN SELECT * FROM public.inventory_purchase_order_lines WHERE purchase_order_id=po_id LOOP
    alloc_factor := CASE WHEN total_base>0 THEN (pol.qty*pol.unit_cost)/total_base ELSE 0 END;
    UPDATE public.inventory_purchase_order_lines
      SET freight_alloc  = po.freight_in   * alloc_factor,
          duty_alloc     = po.import_duty  * alloc_factor,
          other_alloc    = po.other_charges* alloc_factor,
          landed_unit_cost = ((pol.qty*pol.unit_cost)
                            + po.freight_in*alloc_factor
                            + po.import_duty*alloc_factor
                            + po.other_charges*alloc_factor)
                           / pol.qty
    WHERE id=pol.id;
    SELECT avg_cost INTO old_avg  FROM public.inventory_products WHERE id=pol.product_id;
    SELECT COALESCE(SUM(change_qty),0) INTO old_qty
      FROM public.inventory_inventory_transactions WHERE product_id=pol.product_id;
    l_cost := ((pol.qty*pol.unit_cost)
            + po.freight_in*alloc_factor
            + po.import_duty*alloc_factor
            + po.other_charges*alloc_factor)
           / pol.qty;
    IF (old_qty+pol.qty)>0 THEN
      new_avg := ((old_avg*old_qty)+(l_cost*pol.qty))/(old_qty+pol.qty);
    ELSE
      new_avg := l_cost;
    END IF;
    UPDATE public.inventory_products SET avg_cost=new_avg WHERE id=pol.product_id;
    INSERT INTO public.inventory_inventory_transactions
      (product_id,change_qty,txn_type,reference_id,date,unit_cost)
    VALUES(pol.product_id,pol.qty,'purchase',po_id,po.date,l_cost);
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."record_purchase_receipt"("po_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_sale"("sale_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  sl        public.inventory_sales_order_lines%ROWTYPE;
  bom       public.inventory_bill_of_materials%ROWTYPE;
  revenue   NUMERIC := 0;
  cogs      NUMERIC := 0;
  unit_cost NUMERIC;
  qty_used  NUMERIC;
  movement  TEXT;
BEGIN
  SELECT CASE WHEN is_gift THEN 'gift' ELSE 'sale' END
    INTO movement
    FROM public.inventory_sales_orders
   WHERE id = sale_id;

  FOR sl IN
    SELECT * FROM public.inventory_sales_order_lines
    WHERE sales_order_id = sale_id
  LOOP
    revenue := revenue + (sl.qty * sl.unit_price_override);

    IF (SELECT type FROM public.inventory_products WHERE id = sl.product_id) = 'kit' THEN
      FOR bom IN
        SELECT * FROM public.inventory_bill_of_materials
        WHERE kit_product_id = sl.product_id
      LOOP
        qty_used := bom.quantity * sl.qty;
        SELECT avg_cost INTO unit_cost
          FROM public.inventory_products
         WHERE id = bom.component_product_id;

        INSERT INTO public.inventory_inventory_transactions
          (product_id, change_qty, txn_type, reference_id, date, unit_cost)
        VALUES
          (bom.component_product_id, -qty_used, movement, sale_id, NOW(), unit_cost);

        cogs := cogs + unit_cost * qty_used;
      END LOOP;
    ELSE
      qty_used := sl.qty;
      SELECT avg_cost INTO unit_cost
        FROM public.inventory_products
       WHERE id = sl.product_id;

      INSERT INTO public.inventory_inventory_transactions
        (product_id, change_qty, txn_type, reference_id, date, unit_cost)
      VALUES
        (sl.product_id, -qty_used, movement, sale_id, NOW(), unit_cost);

      cogs := cogs + unit_cost * qty_used;
    END IF;
  END LOOP;

  UPDATE public.inventory_sales_orders
     SET total_price = revenue,
         total_cogs  = cogs
   WHERE id = sale_id;
END;
$$;


ALTER FUNCTION "public"."record_sale"("sale_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_for_tournament"("p_tournament_id" "text", "p_pass_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_id     UUID;
  req_level  INT;
  -- temp to check existence
  has_level  BOOL;
BEGIN
  -- 1) look up tournament’s level
  SELECT points_value
    INTO req_level
    FROM public.tournaments
   WHERE id = p_tournament_id;

  -- 2) if no pass_types exist for this level, fallback to 100
  SELECT EXISTS (
    SELECT 1
      FROM public.pass_types
     WHERE points_value = req_level
  ) INTO has_level;
  IF NOT has_level THEN
    req_level := 100;
  END IF;

  -- 3) verify pass exists, belongs to user, has stock, and matches effective level
  IF NOT EXISTS (
    SELECT 1
      FROM public.passes p
      JOIN public.pass_types pt ON pt.id = p.pass_type_id
     WHERE p.id = p_pass_id
       AND p.user_id = auth.uid()
       AND p.quantity_remaining > 0
       AND pt.points_value = req_level
  ) THEN
    RAISE EXCEPTION 'Invalid pass or wrong level for this tournament';
  END IF;

  -- 4) register and consume the pass
  INSERT INTO public.registrations(user_id, tournament_id, pass_id)
    VALUES (auth.uid(), p_tournament_id, p_pass_id)
  RETURNING id INTO new_id;

  UPDATE public.passes
     SET quantity_remaining = quantity_remaining - 1
   WHERE id = p_pass_id;

  RETURN new_id;
END;
$$;


ALTER FUNCTION "public"."register_for_tournament"("p_tournament_id" "text", "p_pass_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_set_updated_at_product_prices"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_set_updated_at_product_prices"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_set_updated_at_products"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_set_updated_at_products"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "added_by" "text"
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_tournament_points" (
    "tournament_id" "text" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "points" integer NOT NULL,
    "seed" integer
);


ALTER TABLE "public"."player_tournament_points" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournaments" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "date" "text" NOT NULL,
    "time" "text" NOT NULL,
    "location" "text" NOT NULL,
    "description" "text" NOT NULL,
    "max_participants" integer,
    "prize" "text",
    "registration_fee" "text",
    "points_value" integer DEFAULT 100 NOT NULL,
    "date_actual" "date",
    "start_at" timestamp with time zone,
    "open_play" boolean DEFAULT false NOT NULL,
    "image" "text",
    "payment_link" "text"
);


ALTER TABLE "public"."tournaments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."current_rankings" AS
 WITH "recent" AS (
         SELECT "ptp"."player_id",
            "ptp"."points",
            "t"."date_actual",
            "row_number"() OVER (PARTITION BY "ptp"."player_id" ORDER BY "ptp"."points" DESC) AS "rn"
           FROM ("public"."player_tournament_points" "ptp"
             JOIN "public"."tournaments" "t" ON (("ptp"."tournament_id" = "t"."id")))
          WHERE ("t"."date_actual" >= ("now"() - '1 year 6 mons'::interval))
        )
 SELECT "recent"."player_id",
    "sum"("recent"."points") AS "total_points",
    "rank"() OVER (ORDER BY ("sum"("recent"."points")) DESC) AS "current_rank"
   FROM "recent"
  WHERE ("recent"."rn" <= 10)
  GROUP BY "recent"."player_id";


ALTER VIEW "public"."current_rankings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_sales_orders" (
    "id" bigint NOT NULL,
    "customer" "text" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "shipping_cost" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_price" numeric(14,2) DEFAULT 0 NOT NULL,
    "total_cogs" numeric(14,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "comments" "text",
    "is_gift" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."inventory_sales_orders" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."gift_cost_summary" AS
 SELECT (COALESCE("sum"("inventory_sales_orders"."total_cogs"), (0)::numeric))::numeric(14,2) AS "total_gift_cogs",
    (COALESCE("sum"("inventory_sales_orders"."shipping_cost"), (0)::numeric))::numeric(14,2) AS "total_gift_shipping",
    (COALESCE("sum"(("inventory_sales_orders"."total_cogs" + "inventory_sales_orders"."shipping_cost")), (0)::numeric))::numeric(14,2) AS "total_gift_costs"
   FROM "public"."inventory_sales_orders"
  WHERE ("inventory_sales_orders"."is_gift" = true);


ALTER VIEW "public"."gift_cost_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_sales_order_lines" (
    "id" bigint NOT NULL,
    "sales_order_id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "description" "text" DEFAULT ''::"text",
    "qty" numeric(12,2) NOT NULL,
    "unit_price_override" numeric(12,4) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_sales_order_lines_qty_check" CHECK (("qty" > (0)::numeric)),
    CONSTRAINT "inventory_sales_order_lines_unit_price_override_check" CHECK (("unit_price_override" >= (0)::numeric))
);


ALTER TABLE "public"."inventory_sales_order_lines" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."gift_order_summary" AS
 SELECT "so"."id" AS "gift_id",
    "so"."customer",
    "so"."date",
    "count"("sol".*) AS "items_given",
    "sum"(("sol"."qty" * "sol"."unit_price_override")) AS "face_value",
    "so"."comments"
   FROM ("public"."inventory_sales_orders" "so"
     JOIN "public"."inventory_sales_order_lines" "sol" ON (("sol"."sales_order_id" = "so"."id")))
  WHERE ("so"."is_gift" = true)
  GROUP BY "so"."id", "so"."customer", "so"."date", "so"."comments";


ALTER VIEW "public"."gift_order_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_inventory_transactions" (
    "id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "change_qty" numeric(12,2) NOT NULL,
    "txn_type" "text" NOT NULL,
    "reference_id" bigint,
    "date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "unit_cost" numeric(12,4) DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_inventory_transactions_txn_type_check" CHECK (("txn_type" = ANY (ARRAY['purchase'::"text", 'sale'::"text", 'assembly_in'::"text", 'assembly_out'::"text", 'adjustment'::"text"])))
);


ALTER TABLE "public"."inventory_inventory_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_products" (
    "id" bigint NOT NULL,
    "sku" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "avg_cost" numeric(12,4) DEFAULT 0 NOT NULL,
    "reorder_level" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_products_type_check" CHECK (("type" = ANY (ARRAY['base'::"text", 'kit'::"text"])))
);


ALTER TABLE "public"."inventory_products" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inventory_on_hand" AS
 SELECT "p"."id" AS "product_id",
    "p"."sku",
    "p"."name",
    COALESCE("sum"("t"."change_qty"), (0)::numeric) AS "on_hand",
    "p"."avg_cost",
    "p"."reorder_level"
   FROM ("public"."inventory_products" "p"
     LEFT JOIN "public"."inventory_inventory_transactions" "t" ON (("t"."product_id" = "p"."id")))
  GROUP BY "p"."id", "p"."sku", "p"."name", "p"."avg_cost", "p"."reorder_level";


ALTER VIEW "public"."inventory_on_hand" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inventory_base_valuation" AS
 SELECT "io"."product_id",
    "io"."sku",
    "io"."name",
    "io"."on_hand",
    "io"."avg_cost",
    (("io"."on_hand" * "io"."avg_cost"))::numeric(14,2) AS "inventory_value"
   FROM "public"."inventory_on_hand" "io";


ALTER VIEW "public"."inventory_base_valuation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_bill_of_materials" (
    "id" bigint NOT NULL,
    "kit_product_id" bigint NOT NULL,
    "component_product_id" bigint NOT NULL,
    "quantity" numeric(10,2) NOT NULL,
    "unit_of_measure" "text" DEFAULT 'each'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_bill_of_materials_quantity_check" CHECK (("quantity" > (0)::numeric))
);


ALTER TABLE "public"."inventory_bill_of_materials" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."inventory_bill_of_materials_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."inventory_bill_of_materials_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."inventory_bill_of_materials_id_seq" OWNED BY "public"."inventory_bill_of_materials"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."inventory_inventory_transactions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."inventory_inventory_transactions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."inventory_inventory_transactions_id_seq" OWNED BY "public"."inventory_inventory_transactions"."id";



CREATE OR REPLACE VIEW "public"."inventory_products_with_cost" AS
 SELECT "p"."id",
    "p"."sku",
    "p"."name",
    "p"."type",
    "p"."avg_cost",
    "p"."reorder_level",
    "p"."created_at",
    "p"."updated_at",
        CASE
            WHEN ("p"."type" = 'kit'::"text") THEN COALESCE("k"."total_component_cost", (0)::numeric)
            ELSE "p"."avg_cost"
        END AS "computed_cost"
   FROM ("public"."inventory_products" "p"
     LEFT JOIN ( SELECT "b"."kit_product_id",
            "sum"(("b"."quantity" * "c"."avg_cost")) AS "total_component_cost"
           FROM ("public"."inventory_bill_of_materials" "b"
             JOIN "public"."inventory_products" "c" ON (("c"."id" = "b"."component_product_id")))
          GROUP BY "b"."kit_product_id") "k" ON (("k"."kit_product_id" = "p"."id")));


ALTER VIEW "public"."inventory_products_with_cost" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inventory_kit_capacity" AS
 WITH "kit_cost" AS (
         SELECT "p_1"."id" AS "kit_id",
            "ipwc"."computed_cost"
           FROM ("public"."inventory_products" "p_1"
             JOIN "public"."inventory_products_with_cost" "ipwc" ON (("ipwc"."id" = "p_1"."id")))
          WHERE ("p_1"."type" = 'kit'::"text")
        ), "capacity" AS (
         SELECT "b"."kit_product_id" AS "kit_id",
            ("min"("floor"(("io"."on_hand" / "b"."quantity"))))::integer AS "possible_kits"
           FROM ("public"."inventory_bill_of_materials" "b"
             JOIN "public"."inventory_on_hand" "io" ON (("io"."product_id" = "b"."component_product_id")))
          GROUP BY "b"."kit_product_id"
        )
 SELECT "kc"."kit_id",
    "p"."sku" AS "kit_sku",
    "p"."name" AS "kit_name",
    "c"."possible_kits",
    "kc"."computed_cost" AS "unit_cost",
    ((("c"."possible_kits")::numeric * "kc"."computed_cost"))::numeric(14,2) AS "kit_inventory_value"
   FROM (("capacity" "c"
     JOIN "kit_cost" "kc" ON (("kc"."kit_id" = "c"."kit_id")))
     JOIN "public"."inventory_products" "p" ON (("p"."id" = "kc"."kit_id")));


ALTER VIEW "public"."inventory_kit_capacity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_notifications" (
    "id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "on_hand" numeric(12,2) NOT NULL,
    "reorder_level" integer NOT NULL,
    "notified_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inventory_notifications" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."inventory_notifications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."inventory_notifications_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."inventory_notifications_id_seq" OWNED BY "public"."inventory_notifications"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."inventory_products_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."inventory_products_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."inventory_products_id_seq" OWNED BY "public"."inventory_products"."id";



CREATE TABLE IF NOT EXISTS "public"."inventory_purchase_order_lines" (
    "id" bigint NOT NULL,
    "purchase_order_id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "qty" numeric(12,2) NOT NULL,
    "unit_cost" numeric(12,4) NOT NULL,
    "freight_alloc" numeric(12,2) DEFAULT 0 NOT NULL,
    "duty_alloc" numeric(12,2) DEFAULT 0 NOT NULL,
    "other_alloc" numeric(12,2) DEFAULT 0 NOT NULL,
    "landed_unit_cost" numeric(12,4) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_purchase_order_lines_qty_check" CHECK (("qty" > (0)::numeric)),
    CONSTRAINT "inventory_purchase_order_lines_unit_cost_check" CHECK (("unit_cost" >= (0)::numeric))
);


ALTER TABLE "public"."inventory_purchase_order_lines" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."inventory_purchase_order_lines_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."inventory_purchase_order_lines_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."inventory_purchase_order_lines_id_seq" OWNED BY "public"."inventory_purchase_order_lines"."id";



CREATE TABLE IF NOT EXISTS "public"."inventory_purchase_orders" (
    "id" bigint NOT NULL,
    "vendor" "text" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "freight_in" numeric(12,2) DEFAULT 0 NOT NULL,
    "import_duty" numeric(12,2) DEFAULT 0 NOT NULL,
    "other_charges" numeric(12,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inventory_purchase_orders" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."inventory_purchase_orders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."inventory_purchase_orders_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."inventory_purchase_orders_id_seq" OWNED BY "public"."inventory_purchase_orders"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."inventory_sales_order_lines_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."inventory_sales_order_lines_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."inventory_sales_order_lines_id_seq" OWNED BY "public"."inventory_sales_order_lines"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."inventory_sales_orders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."inventory_sales_orders_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."inventory_sales_orders_id_seq" OWNED BY "public"."inventory_sales_orders"."id";



CREATE OR REPLACE VIEW "public"."low_stock_alerts" WITH ("security_invoker"='on') AS
 SELECT "inventory_on_hand"."product_id",
    "inventory_on_hand"."sku",
    "inventory_on_hand"."name",
    "inventory_on_hand"."on_hand",
    "inventory_on_hand"."avg_cost",
    "inventory_on_hand"."reorder_level"
   FROM "public"."inventory_on_hand"
  WHERE ("inventory_on_hand"."on_hand" < ("inventory_on_hand"."reorder_level")::numeric);


ALTER VIEW "public"."low_stock_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_sets" (
    "match_id" "uuid" NOT NULL,
    "set_number" integer NOT NULL,
    "p1_score" integer NOT NULL,
    "p2_score" integer NOT NULL
);


ALTER TABLE "public"."match_sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "text" NOT NULL,
    "round" "text" NOT NULL,
    "player1_id" "uuid" NOT NULL,
    "player2_id" "uuid" NOT NULL,
    "winner_id" "uuid" NOT NULL
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stripe_session_id" "text" NOT NULL,
    "stripe_payment_intent_id" "text",
    "customer_email" "text",
    "customer_name" "text",
    "customer_phone" "text",
    "shipping_address" "jsonb",
    "order_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "order_total_cents" integer,
    "order_currency" "text" DEFAULT 'usd'::"text" NOT NULL,
    "order_summary" "text",
    "fulfillment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "tracking_number" "text",
    "internal_notes" "text",
    "heard_about_us" "text",
    "customer_order_notes" "text",
    "raw_stripe_session" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fulfilled_at" timestamp with time zone,
    "shipping_label_cost" numeric(10,2),
    "tracking_numbers" "jsonb" DEFAULT '[]'::"jsonb",
    "refund_amount_cents" integer DEFAULT 0 NOT NULL,
    "refund_status" "text" DEFAULT 'none'::"text" NOT NULL,
    "stripe_fee_cents" integer,
    CONSTRAINT "orders_fulfillment_status_check" CHECK (("fulfillment_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'fulfilled'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "orders_refund_status_check" CHECK (("refund_status" = ANY (ARRAY['none'::"text", 'partial'::"text", 'full'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pass_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stripe_price_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "passes_quantity" integer NOT NULL,
    "points_value" integer NOT NULL,
    "price" "text" DEFAULT '$0'::"text" NOT NULL,
    CONSTRAINT "pass_types_passes_quantity_check" CHECK (("passes_quantity" > 0))
);


ALTER TABLE "public"."pass_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."passes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "pass_type_id" "uuid" NOT NULL,
    "quantity_total" integer NOT NULL,
    "quantity_remaining" integer NOT NULL,
    "stripe_session_id" "text" NOT NULL,
    "purchased_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."passes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid",
    "name" "text" NOT NULL,
    "hometown" "text",
    "headshot_url" "text",
    "fullbody_url" "text",
    "birthdate" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "slug" "text" NOT NULL
);


ALTER TABLE "public"."players" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."player_records" WITH ("security_invoker"='true') AS
 SELECT "p"."id" AS "player_id",
    "sum"(
        CASE
            WHEN ("m"."winner_id" = "p"."id") THEN 1
            ELSE 0
        END) AS "wins",
    "sum"(
        CASE
            WHEN ("m"."winner_id" <> "p"."id") THEN 1
            ELSE 0
        END) AS "losses"
   FROM ("public"."players" "p"
     JOIN "public"."matches" "m" ON ((("p"."id" = "m"."player1_id") OR ("p"."id" = "m"."player2_id"))))
  GROUP BY "p"."id";


ALTER VIEW "public"."player_records" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."player_results" WITH ("security_invoker"='true') AS
 SELECT "ptp"."player_id",
    "ptp"."tournament_id",
    "ptp"."points"
   FROM "public"."player_tournament_points" "ptp";


ALTER VIEW "public"."player_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_addons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "base_product_id" "uuid" NOT NULL,
    "addon_product_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "product_addons_check" CHECK (("base_product_id" <> "addon_product_id"))
);


ALTER TABLE "public"."product_addons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "label" "text",
    "unit_amount" integer NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "stripe_price_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_prices_unit_amount_check" CHECK (("unit_amount" >= 0))
);


ALTER TABLE "public"."product_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sku" integer,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "kind" "text" DEFAULT 'base'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "images" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "details" "text",
    "features" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    CONSTRAINT "products_kind_check" CHECK (("kind" = ANY (ARRAY['base'::"text", 'addon'::"text", 'bundle'::"text"])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "current_city" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_admin" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tournament_id" "text" NOT NULL,
    "pass_id" "uuid",
    "stripe_session_id" "text",
    "registered_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."registrations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."sales_order_summary" WITH ("security_invoker"='on') AS
 SELECT "so"."id",
    "so"."customer",
    "so"."date",
    "so"."shipping_cost" AS "shipping_expense",
    "so"."total_price" AS "total_revenue",
    "so"."total_cogs",
    (("so"."total_price" - "so"."total_cogs") - "so"."shipping_cost") AS "gross_profit",
        CASE
            WHEN ("so"."total_price" = (0)::numeric) THEN (0)::numeric
            ELSE (((("so"."total_price" - "so"."total_cogs") - "so"."shipping_cost") / "so"."total_price") * (100)::numeric)
        END AS "gross_margin_pct",
    COALESCE("sum"("sol"."qty"), (0)::numeric) AS "units_sold",
    "so"."comments",
    "so"."is_gift"
   FROM ("public"."inventory_sales_orders" "so"
     JOIN "public"."inventory_sales_order_lines" "sol" ON (("sol"."sales_order_id" = "so"."id")))
  GROUP BY "so"."id", "so"."customer", "so"."date", "so"."shipping_cost", "so"."total_price", "so"."total_cogs", "so"."comments", "so"."is_gift";


ALTER VIEW "public"."sales_order_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."tournament_with_counts" AS
SELECT
    NULL::"text" AS "id",
    NULL::"text" AS "name",
    NULL::"text" AS "date",
    NULL::"text" AS "time",
    NULL::"text" AS "location",
    NULL::"text" AS "description",
    NULL::integer AS "max_participants",
    NULL::"text" AS "prize",
    NULL::"text" AS "registration_fee",
    NULL::integer AS "points_value",
    NULL::"date" AS "date_actual",
    NULL::timestamp with time zone AS "start_at",
    NULL::boolean AS "open_play",
    NULL::"text" AS "image",
    NULL::"text" AS "payment_link",
    NULL::bigint AS "current_participants";


ALTER VIEW "public"."tournament_with_counts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."inventory_bill_of_materials" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."inventory_bill_of_materials_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."inventory_inventory_transactions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."inventory_inventory_transactions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."inventory_notifications" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."inventory_notifications_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."inventory_products" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."inventory_products_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."inventory_purchase_order_lines" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."inventory_purchase_order_lines_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."inventory_purchase_orders" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."inventory_purchase_orders_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."inventory_sales_order_lines" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."inventory_sales_order_lines_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."inventory_sales_orders" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."inventory_sales_orders_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_bill_of_materials"
    ADD CONSTRAINT "inventory_bill_of_materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_inventory_transactions"
    ADD CONSTRAINT "inventory_inventory_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_notifications"
    ADD CONSTRAINT "inventory_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_products"
    ADD CONSTRAINT "inventory_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_products"
    ADD CONSTRAINT "inventory_products_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."inventory_purchase_order_lines"
    ADD CONSTRAINT "inventory_purchase_order_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_purchase_orders"
    ADD CONSTRAINT "inventory_purchase_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_sales_order_lines"
    ADD CONSTRAINT "inventory_sales_order_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_sales_orders"
    ADD CONSTRAINT "inventory_sales_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_sets"
    ADD CONSTRAINT "match_sets_pkey" PRIMARY KEY ("match_id", "set_number");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_stripe_session_id_key" UNIQUE ("stripe_session_id");



ALTER TABLE ONLY "public"."pass_types"
    ADD CONSTRAINT "pass_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pass_types"
    ADD CONSTRAINT "pass_types_stripe_price_id_key" UNIQUE ("stripe_price_id");



ALTER TABLE ONLY "public"."passes"
    ADD CONSTRAINT "passes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."passes"
    ADD CONSTRAINT "passes_stripe_session_id_key" UNIQUE ("stripe_session_id");



ALTER TABLE ONLY "public"."player_tournament_points"
    ADD CONSTRAINT "player_tournament_points_pkey" PRIMARY KEY ("tournament_id", "player_id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_slug_unique" UNIQUE ("slug");



ALTER TABLE ONLY "public"."product_addons"
    ADD CONSTRAINT "product_addons_base_product_id_addon_product_id_key" UNIQUE ("base_product_id", "addon_product_id");



ALTER TABLE ONLY "public"."product_addons"
    ADD CONSTRAINT "product_addons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_prices"
    ADD CONSTRAINT "product_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_prices"
    ADD CONSTRAINT "product_prices_stripe_price_id_key" UNIQUE ("stripe_price_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_stripe_session_id_key" UNIQUE ("stripe_session_id");



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_user_tournament_unique" UNIQUE ("user_id", "tournament_id");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_bill_of_materials"
    ADD CONSTRAINT "uq_bom" UNIQUE ("kit_product_id", "component_product_id");



CREATE INDEX "idx_players_profile_id" ON "public"."players" USING "btree" ("profile_id");



CREATE INDEX "idx_product_addons_base" ON "public"."product_addons" USING "btree" ("base_product_id");



CREATE INDEX "idx_product_prices_product_active" ON "public"."product_prices" USING "btree" ("product_id", "active");



CREATE INDEX "idx_products_active_sort" ON "public"."products" USING "btree" ("active", "sort_order");



CREATE INDEX "idx_products_kind_active" ON "public"."products" USING "btree" ("kind", "active");



CREATE UNIQUE INDEX "one_active_price_per_product" ON "public"."product_prices" USING "btree" ("product_id") WHERE ("active" = true);



CREATE INDEX "orders_created_at_idx" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "orders_customer_email_idx" ON "public"."orders" USING "btree" ("customer_email");



CREATE INDEX "orders_fulfillment_status_idx" ON "public"."orders" USING "btree" ("fulfillment_status");



CREATE OR REPLACE VIEW "public"."tournament_with_counts" WITH ("security_invoker"='true') AS
 SELECT "t"."id",
    "t"."name",
    "t"."date",
    "t"."time",
    "t"."location",
    "t"."description",
    "t"."max_participants",
    "t"."prize",
    "t"."registration_fee",
    "t"."points_value",
    "t"."date_actual",
    "t"."start_at",
    "t"."open_play",
    "t"."image",
    "t"."payment_link",
    "count"("r"."id") AS "current_participants"
   FROM ("public"."tournaments" "t"
     LEFT JOIN "public"."registrations" "r" ON (("r"."tournament_id" = "t"."id")))
  GROUP BY "t"."id";



CREATE OR REPLACE TRIGGER "trg_auto_receive" AFTER INSERT ON "public"."inventory_purchase_orders" FOR EACH ROW EXECUTE FUNCTION "public"."auto_receive"();



CREATE OR REPLACE TRIGGER "trg_auto_ship" AFTER INSERT ON "public"."inventory_sales_orders" FOR EACH ROW EXECUTE FUNCTION "public"."auto_ship"();



CREATE OR REPLACE TRIGGER "trg_bom_updated" BEFORE UPDATE ON "public"."inventory_bill_of_materials" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_compute_landed_cost" BEFORE INSERT OR UPDATE ON "public"."inventory_purchase_order_lines" FOR EACH ROW EXECUTE FUNCTION "public"."compute_landed_cost"();



CREATE OR REPLACE TRIGGER "trg_itx_updated" BEFORE UPDATE ON "public"."inventory_inventory_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_notifications_updated" BEFORE UPDATE ON "public"."inventory_notifications" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_po_lines_updated" BEFORE UPDATE ON "public"."inventory_purchase_order_lines" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_po_updated" BEFORE UPDATE ON "public"."inventory_purchase_orders" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_product_prices_set_updated_at" BEFORE UPDATE ON "public"."product_prices" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_updated_at_product_prices"();



CREATE OR REPLACE TRIGGER "trg_products_set_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_updated_at_products"();



CREATE OR REPLACE TRIGGER "trg_products_updated" BEFORE UPDATE ON "public"."inventory_products" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_so_lines_updated" BEFORE UPDATE ON "public"."inventory_sales_order_lines" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_so_updated" BEFORE UPDATE ON "public"."inventory_sales_orders" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_updated_at"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_bill_of_materials"
    ADD CONSTRAINT "inventory_bill_of_materials_component_product_id_fkey" FOREIGN KEY ("component_product_id") REFERENCES "public"."inventory_products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory_bill_of_materials"
    ADD CONSTRAINT "inventory_bill_of_materials_kit_product_id_fkey" FOREIGN KEY ("kit_product_id") REFERENCES "public"."inventory_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_inventory_transactions"
    ADD CONSTRAINT "inventory_inventory_transactions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory_notifications"
    ADD CONSTRAINT "inventory_notifications_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_products"("id");



ALTER TABLE ONLY "public"."inventory_purchase_order_lines"
    ADD CONSTRAINT "inventory_purchase_order_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory_purchase_order_lines"
    ADD CONSTRAINT "inventory_purchase_order_lines_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."inventory_purchase_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_sales_order_lines"
    ADD CONSTRAINT "inventory_sales_order_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory_sales_order_lines"
    ADD CONSTRAINT "inventory_sales_order_lines_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "public"."inventory_sales_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_sets"
    ADD CONSTRAINT "match_sets_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_player1_id_fkey" FOREIGN KEY ("player1_id") REFERENCES "public"."players"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_player2_id_fkey" FOREIGN KEY ("player2_id") REFERENCES "public"."players"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."players"("id");



ALTER TABLE ONLY "public"."passes"
    ADD CONSTRAINT "passes_pass_type_id_fkey" FOREIGN KEY ("pass_type_id") REFERENCES "public"."pass_types"("id");



ALTER TABLE ONLY "public"."passes"
    ADD CONSTRAINT "passes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."player_tournament_points"
    ADD CONSTRAINT "player_tournament_points_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id");



ALTER TABLE ONLY "public"."player_tournament_points"
    ADD CONSTRAINT "player_tournament_points_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_addons"
    ADD CONSTRAINT "product_addons_addon_product_id_fkey" FOREIGN KEY ("addon_product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_addons"
    ADD CONSTRAINT "product_addons_base_product_id_fkey" FOREIGN KEY ("base_product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_prices"
    ADD CONSTRAINT "product_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_pass_id_fkey" FOREIGN KEY ("pass_id") REFERENCES "public"."passes"("id");



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id");



ALTER TABLE ONLY "public"."registrations"
    ADD CONSTRAINT "registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "MatchSets: public select" ON "public"."match_sets" FOR SELECT USING (true);



CREATE POLICY "Matches: public select" ON "public"."matches" FOR SELECT USING (true);



CREATE POLICY "PassTypes: public select" ON "public"."pass_types" FOR SELECT USING (true);



CREATE POLICY "Passes: select own" ON "public"."passes" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Passes: update own" ON "public"."passes" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "PlayerTournamentPoints: public select" ON "public"."player_tournament_points" FOR SELECT USING (true);



CREATE POLICY "Players: public select" ON "public"."players" FOR SELECT USING (true);



CREATE POLICY "ProductAddons: admins only write" ON "public"."product_addons" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin"))));



CREATE POLICY "ProductAddons: public read" ON "public"."product_addons" FOR SELECT USING (true);



CREATE POLICY "ProductPrices: admins only write" ON "public"."product_prices" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin"))));



CREATE POLICY "ProductPrices: public select active" ON "public"."product_prices" FOR SELECT USING (("active" = true));



CREATE POLICY "Products: admins only write" ON "public"."products" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin"))));



CREATE POLICY "Products: public select active" ON "public"."products" FOR SELECT USING (("active" = true));



CREATE POLICY "Profiles: insert own" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Profiles: select own" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "Profiles: update own" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Registrations: insert own" ON "public"."registrations" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Registrations: insert via RPC only" ON "public"."registrations" FOR INSERT WITH CHECK (false);



CREATE POLICY "Registrations: select own" ON "public"."registrations" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Tournaments: public select" ON "public"."tournaments" FOR SELECT USING (true);



ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_users_self_read" ON "public"."admin_users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "admins_only" ON "public"."inventory_bill_of_materials" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin"))));



CREATE POLICY "admins_only" ON "public"."inventory_inventory_transactions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin"))));



CREATE POLICY "admins_only" ON "public"."inventory_notifications" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin"))));



CREATE POLICY "admins_only" ON "public"."inventory_products" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin"))));



CREATE POLICY "admins_only" ON "public"."inventory_purchase_order_lines" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin"))));



CREATE POLICY "admins_only" ON "public"."inventory_purchase_orders" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin"))));



CREATE POLICY "admins_only" ON "public"."inventory_sales_order_lines" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin"))));



CREATE POLICY "admins_only" ON "public"."inventory_sales_orders" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "profiles"."is_admin"))));



ALTER TABLE "public"."inventory_bill_of_materials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_inventory_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_purchase_order_lines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_purchase_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_sales_order_lines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_sales_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_sets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pass_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."passes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."player_tournament_points" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_addons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tournaments" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































GRANT ALL ON FUNCTION "public"."auto_receive"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_receive"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_receive"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_ship"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_ship"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_ship"() TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_landed_cost"() TO "anon";
GRANT ALL ON FUNCTION "public"."compute_landed_cost"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_landed_cost"() TO "service_role";



GRANT ALL ON FUNCTION "public"."consume_pass_and_register"("pass_id" "uuid", "user_id" "uuid", "tournament_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."consume_pass_and_register"("pass_id" "uuid", "user_id" "uuid", "tournament_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."consume_pass_and_register"("pass_id" "uuid", "user_id" "uuid", "tournament_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_kpi_summary"("p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_kpi_summary"("p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_kpi_summary"("p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_match_details_by_tournament"("p_tournament_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_match_details_by_tournament"("p_tournament_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_match_details_by_tournament"("p_tournament_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tournament_summary"("p_tournament_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tournament_summary"("p_tournament_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tournament_summary"("p_tournament_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."record_purchase_receipt"("po_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."record_purchase_receipt"("po_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_purchase_receipt"("po_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."record_sale"("sale_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."record_sale"("sale_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_sale"("sale_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."register_for_tournament"("p_tournament_id" "text", "p_pass_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."register_for_tournament"("p_tournament_id" "text", "p_pass_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_for_tournament"("p_tournament_id" "text", "p_pass_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_set_updated_at_product_prices"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_set_updated_at_product_prices"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_set_updated_at_product_prices"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_set_updated_at_products"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_set_updated_at_products"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_set_updated_at_products"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."admin_users" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."admin_users" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."admin_users" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."player_tournament_points" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."player_tournament_points" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."player_tournament_points" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tournaments" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tournaments" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tournaments" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."current_rankings" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."current_rankings" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."current_rankings" TO "service_role";
GRANT SELECT ON TABLE "public"."current_rankings" TO PUBLIC;



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_sales_orders" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_sales_orders" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_sales_orders" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."gift_cost_summary" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."gift_cost_summary" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."gift_cost_summary" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_sales_order_lines" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_sales_order_lines" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_sales_order_lines" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."gift_order_summary" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."gift_order_summary" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."gift_order_summary" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_inventory_transactions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_inventory_transactions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_inventory_transactions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_products" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_products" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_products" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_on_hand" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_on_hand" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_on_hand" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_base_valuation" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_base_valuation" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_base_valuation" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_bill_of_materials" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_bill_of_materials" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_bill_of_materials" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_bill_of_materials_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_bill_of_materials_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_bill_of_materials_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_inventory_transactions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_inventory_transactions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_inventory_transactions_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_products_with_cost" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_products_with_cost" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_products_with_cost" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_kit_capacity" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_kit_capacity" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_kit_capacity" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_notifications" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_notifications" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_notifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_notifications_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_products_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_products_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_products_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_purchase_order_lines" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_purchase_order_lines" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_purchase_order_lines" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_purchase_order_lines_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_purchase_order_lines_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_purchase_order_lines_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_purchase_orders" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_purchase_orders" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."inventory_purchase_orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_purchase_orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_purchase_orders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_purchase_orders_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_sales_order_lines_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_sales_order_lines_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_sales_order_lines_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_sales_orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_sales_orders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_sales_orders_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."low_stock_alerts" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."low_stock_alerts" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."low_stock_alerts" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."match_sets" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."match_sets" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."match_sets" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."matches" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."matches" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."matches" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."orders" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."orders" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."orders" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pass_types" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pass_types" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."pass_types" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."passes" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."passes" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."passes" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."players" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."players" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."players" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."player_records" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."player_records" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."player_records" TO "service_role";
GRANT SELECT ON TABLE "public"."player_records" TO PUBLIC;



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."player_results" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."player_results" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."player_results" TO "service_role";
GRANT SELECT ON TABLE "public"."player_results" TO PUBLIC;



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_addons" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_addons" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_addons" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_prices" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_prices" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_prices" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."products" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."products" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."products" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."registrations" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."registrations" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."registrations" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."sales_order_summary" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."sales_order_summary" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."sales_order_summary" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tournament_with_counts" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tournament_with_counts" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tournament_with_counts" TO "service_role";
GRANT SELECT ON TABLE "public"."tournament_with_counts" TO PUBLIC;









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";































