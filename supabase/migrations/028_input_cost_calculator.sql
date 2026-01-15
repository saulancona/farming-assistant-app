-- =====================================================
-- Input Cost Calculator Enhancement
-- Enhanced tracking, analytics, and profit projections
-- =====================================================

-- =========================
-- GROWING SEASONS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS growing_seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    crop_type TEXT NOT NULL,
    planting_date DATE NOT NULL,
    expected_harvest_date DATE,
    actual_harvest_date DATE,
    area_planted DECIMAL(10,2),
    area_unit TEXT DEFAULT 'acres',
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'harvested', 'completed')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE growing_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own growing seasons" ON growing_seasons
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_growing_seasons_user ON growing_seasons(user_id);
CREATE INDEX IF NOT EXISTS idx_growing_seasons_field ON growing_seasons(field_id);
CREATE INDEX IF NOT EXISTS idx_growing_seasons_status ON growing_seasons(status);

-- =========================
-- UPDATE INPUT_COSTS TABLE
-- =========================
-- Add season_id column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'input_costs' AND column_name = 'season_id'
    ) THEN
        ALTER TABLE input_costs ADD COLUMN season_id UUID REFERENCES growing_seasons(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add updated_at column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'input_costs' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE input_costs ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_input_costs_season ON input_costs(season_id);
CREATE INDEX IF NOT EXISTS idx_input_costs_date ON input_costs(purchase_date);

-- =========================
-- CROP BUDGETS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS crop_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    crop_type TEXT NOT NULL,
    season TEXT,
    area_planned DECIMAL(10,2) NOT NULL,
    area_unit TEXT DEFAULT 'acres',

    -- Budget estimates
    seed_budget DECIMAL(12,2) DEFAULT 0,
    fertilizer_budget DECIMAL(12,2) DEFAULT 0,
    pesticide_budget DECIMAL(12,2) DEFAULT 0,
    labor_budget DECIMAL(12,2) DEFAULT 0,
    transport_budget DECIMAL(12,2) DEFAULT 0,
    other_budget DECIMAL(12,2) DEFAULT 0,
    total_budget DECIMAL(12,2) GENERATED ALWAYS AS (
        COALESCE(seed_budget, 0) + COALESCE(fertilizer_budget, 0) +
        COALESCE(pesticide_budget, 0) + COALESCE(labor_budget, 0) +
        COALESCE(transport_budget, 0) + COALESCE(other_budget, 0)
    ) STORED,

    -- Expected returns
    expected_yield DECIMAL(12,2),
    expected_yield_unit TEXT DEFAULT 'kg',
    expected_price_per_unit DECIMAL(10,2),
    expected_revenue DECIMAL(12,2) GENERATED ALWAYS AS (
        COALESCE(expected_yield, 0) * COALESCE(expected_price_per_unit, 0)
    ) STORED,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE crop_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own crop budgets" ON crop_budgets
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_crop_budgets_user ON crop_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_crop_budgets_crop ON crop_budgets(crop_type);

-- =========================
-- FUNCTION: Add Input Cost
-- =========================
CREATE OR REPLACE FUNCTION add_input_cost(
    p_category TEXT,
    p_item_name TEXT,
    p_total_amount DECIMAL,
    p_field_id UUID DEFAULT NULL,
    p_season_id UUID DEFAULT NULL,
    p_harvest_id UUID DEFAULT NULL,
    p_quantity DECIMAL DEFAULT NULL,
    p_unit TEXT DEFAULT NULL,
    p_unit_price DECIMAL DEFAULT NULL,
    p_purchase_date DATE DEFAULT CURRENT_DATE,
    p_supplier TEXT DEFAULT NULL,
    p_receipt_photo_url TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_cost_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    INSERT INTO input_costs (
        user_id, field_id, season_id, harvest_id,
        category, item_name, quantity, unit, unit_price, total_amount,
        purchase_date, supplier, receipt_photo_url, notes
    ) VALUES (
        v_user_id, p_field_id, p_season_id, p_harvest_id,
        p_category, p_item_name, p_quantity, p_unit, p_unit_price, p_total_amount,
        p_purchase_date, p_supplier, p_receipt_photo_url, p_notes
    )
    RETURNING id INTO v_cost_id;

    -- Award XP for logging input cost
    PERFORM award_xp(v_user_id, 'input_cost_logged', 'Logged input cost', 5, jsonb_build_object('category', p_category));

    RETURN jsonb_build_object(
        'success', true,
        'costId', v_cost_id,
        'xpAwarded', 5
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- FUNCTION: Get Input Costs
-- =========================
CREATE OR REPLACE FUNCTION get_input_costs(
    p_field_id UUID DEFAULT NULL,
    p_season_id UUID DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS JSONB AS $$
DECLARE
    v_costs JSONB;
    v_user_id UUID := auth.uid();
BEGIN
    SELECT jsonb_agg(cost_data ORDER BY purchase_date DESC)
    INTO v_costs
    FROM (
        SELECT jsonb_build_object(
            'id', ic.id,
            'fieldId', ic.field_id,
            'seasonId', ic.season_id,
            'harvestId', ic.harvest_id,
            'category', ic.category,
            'itemName', ic.item_name,
            'quantity', ic.quantity,
            'unit', ic.unit,
            'unitPrice', ic.unit_price,
            'totalAmount', ic.total_amount,
            'purchaseDate', ic.purchase_date,
            'supplier', ic.supplier,
            'receiptPhotoUrl', ic.receipt_photo_url,
            'notes', ic.notes,
            'fieldName', f.name,
            'cropType', COALESCE(gs.crop_type, f.crop_type),
            'createdAt', ic.created_at
        ) as cost_data,
        ic.purchase_date
        FROM input_costs ic
        LEFT JOIN fields f ON f.id = ic.field_id
        LEFT JOIN growing_seasons gs ON gs.id = ic.season_id
        WHERE ic.user_id = v_user_id
        AND (p_field_id IS NULL OR ic.field_id = p_field_id)
        AND (p_season_id IS NULL OR ic.season_id = p_season_id)
        AND (p_category IS NULL OR ic.category = p_category)
        AND (p_start_date IS NULL OR ic.purchase_date >= p_start_date)
        AND (p_end_date IS NULL OR ic.purchase_date <= p_end_date)
        LIMIT p_limit
    ) t;

    RETURN jsonb_build_object(
        'costs', COALESCE(v_costs, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- FUNCTION: Get Input Cost Summary
-- =========================
CREATE OR REPLACE FUNCTION get_input_cost_summary(
    p_field_id UUID DEFAULT NULL,
    p_season_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_total_cost DECIMAL;
    v_total_area DECIMAL;
    v_cost_per_acre DECIMAL;
    v_by_category JSONB;
    v_by_month JSONB;
    v_top_expenses JSONB;
    v_user_id UUID := auth.uid();
BEGIN
    -- Calculate total cost
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_total_cost
    FROM input_costs
    WHERE user_id = v_user_id
    AND (p_field_id IS NULL OR field_id = p_field_id)
    AND (p_season_id IS NULL OR season_id = p_season_id)
    AND (p_start_date IS NULL OR purchase_date >= p_start_date)
    AND (p_end_date IS NULL OR purchase_date <= p_end_date);

    -- Get total area from fields or seasons
    IF p_season_id IS NOT NULL THEN
        SELECT COALESCE(area_planted, 0) INTO v_total_area
        FROM growing_seasons WHERE id = p_season_id;
    ELSIF p_field_id IS NOT NULL THEN
        SELECT COALESCE(area, 0) INTO v_total_area
        FROM fields WHERE id = p_field_id;
    ELSE
        SELECT COALESCE(SUM(area), 0) INTO v_total_area
        FROM fields WHERE user_id = v_user_id;
    END IF;

    v_cost_per_acre := CASE WHEN v_total_area > 0 THEN v_total_cost / v_total_area ELSE 0 END;

    -- Cost breakdown by category
    SELECT jsonb_agg(jsonb_build_object(
        'category', category,
        'total', cat_total,
        'percentage', CASE WHEN v_total_cost > 0 THEN ROUND((cat_total / v_total_cost * 100)::numeric, 1) ELSE 0 END,
        'itemCount', item_count
    ) ORDER BY cat_total DESC)
    INTO v_by_category
    FROM (
        SELECT
            category,
            SUM(total_amount) as cat_total,
            COUNT(*) as item_count
        FROM input_costs
        WHERE user_id = v_user_id
        AND (p_field_id IS NULL OR field_id = p_field_id)
        AND (p_season_id IS NULL OR season_id = p_season_id)
        AND (p_start_date IS NULL OR purchase_date >= p_start_date)
        AND (p_end_date IS NULL OR purchase_date <= p_end_date)
        GROUP BY category
    ) t;

    -- Cost breakdown by month
    SELECT jsonb_agg(jsonb_build_object(
        'month', TO_CHAR(month_date, 'YYYY-MM'),
        'total', month_total
    ) ORDER BY month_date)
    INTO v_by_month
    FROM (
        SELECT
            DATE_TRUNC('month', purchase_date) as month_date,
            SUM(total_amount) as month_total
        FROM input_costs
        WHERE user_id = v_user_id
        AND (p_field_id IS NULL OR field_id = p_field_id)
        AND (p_season_id IS NULL OR season_id = p_season_id)
        AND (p_start_date IS NULL OR purchase_date >= p_start_date)
        AND (p_end_date IS NULL OR purchase_date <= p_end_date)
        GROUP BY DATE_TRUNC('month', purchase_date)
    ) t;

    -- Top expenses
    SELECT jsonb_agg(jsonb_build_object(
        'itemName', item_name,
        'category', category,
        'totalAmount', item_total
    ))
    INTO v_top_expenses
    FROM (
        SELECT
            item_name,
            category,
            SUM(total_amount) as item_total
        FROM input_costs
        WHERE user_id = v_user_id
        AND (p_field_id IS NULL OR field_id = p_field_id)
        AND (p_season_id IS NULL OR season_id = p_season_id)
        AND (p_start_date IS NULL OR purchase_date >= p_start_date)
        AND (p_end_date IS NULL OR purchase_date <= p_end_date)
        GROUP BY item_name, category
        ORDER BY item_total DESC
        LIMIT 10
    ) t;

    RETURN jsonb_build_object(
        'totalCost', ROUND(v_total_cost::numeric, 2),
        'totalArea', ROUND(v_total_area::numeric, 2),
        'costPerAcre', ROUND(v_cost_per_acre::numeric, 2),
        'byCategory', COALESCE(v_by_category, '[]'::jsonb),
        'byMonth', COALESCE(v_by_month, '[]'::jsonb),
        'topExpenses', COALESCE(v_top_expenses, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- FUNCTION: Calculate Profit Projection
-- =========================
CREATE OR REPLACE FUNCTION calculate_profit_projection(
    p_field_id UUID DEFAULT NULL,
    p_season_id UUID DEFAULT NULL,
    p_crop_type TEXT DEFAULT NULL,
    p_area DECIMAL DEFAULT NULL,
    p_expected_yield DECIMAL DEFAULT NULL,
    p_market_price DECIMAL DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_total_costs DECIMAL;
    v_area DECIMAL;
    v_crop TEXT;
    v_yield DECIMAL;
    v_price DECIMAL;
    v_revenue DECIMAL;
    v_profit DECIMAL;
    v_margin DECIMAL;
    v_roi DECIMAL;
    v_break_even DECIMAL;
    v_cost_breakdown JSONB;
    v_risk_level TEXT;
    v_risk_factors TEXT[];
BEGIN
    -- Get area from parameter or field/season
    IF p_area IS NOT NULL THEN
        v_area := p_area;
    ELSIF p_season_id IS NOT NULL THEN
        SELECT area_planted, crop_type INTO v_area, v_crop
        FROM growing_seasons WHERE id = p_season_id;
    ELSIF p_field_id IS NOT NULL THEN
        SELECT area, crop_type INTO v_area, v_crop
        FROM fields WHERE id = p_field_id;
    ELSE
        SELECT SUM(area) INTO v_area FROM fields WHERE user_id = v_user_id;
    END IF;

    v_crop := COALESCE(p_crop_type, v_crop, 'unknown');
    v_area := COALESCE(v_area, 1);

    -- Get total costs
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_total_costs
    FROM input_costs
    WHERE user_id = v_user_id
    AND (p_field_id IS NULL OR field_id = p_field_id)
    AND (p_season_id IS NULL OR season_id = p_season_id);

    -- Get cost breakdown
    SELECT jsonb_agg(jsonb_build_object(
        'category', category,
        'amount', cat_total
    ))
    INTO v_cost_breakdown
    FROM (
        SELECT category, SUM(total_amount) as cat_total
        FROM input_costs
        WHERE user_id = v_user_id
        AND (p_field_id IS NULL OR field_id = p_field_id)
        AND (p_season_id IS NULL OR season_id = p_season_id)
        GROUP BY category
    ) t;

    -- Get yield and price estimates
    v_yield := COALESCE(p_expected_yield, v_area * 1000); -- Default 1000 kg/acre
    v_price := COALESCE(p_market_price, 50); -- Default price

    -- Calculate projections
    v_revenue := v_yield * v_price;
    v_profit := v_revenue - v_total_costs;
    v_margin := CASE WHEN v_revenue > 0 THEN (v_profit / v_revenue * 100) ELSE 0 END;
    v_roi := CASE WHEN v_total_costs > 0 THEN (v_profit / v_total_costs * 100) ELSE 0 END;
    v_break_even := CASE WHEN v_price > 0 THEN (v_total_costs / v_price) ELSE 0 END;

    -- Assess risk
    v_risk_factors := ARRAY[]::TEXT[];

    IF v_margin < 10 THEN
        v_risk_factors := array_append(v_risk_factors, 'Low profit margin');
    END IF;

    IF v_total_costs / v_area > 50000 THEN -- High cost per acre
        v_risk_factors := array_append(v_risk_factors, 'High input costs');
    END IF;

    IF v_break_even > v_yield * 0.8 THEN
        v_risk_factors := array_append(v_risk_factors, 'Break-even yield close to expected yield');
    END IF;

    v_risk_level := CASE
        WHEN array_length(v_risk_factors, 1) >= 2 THEN 'high'
        WHEN array_length(v_risk_factors, 1) = 1 THEN 'medium'
        ELSE 'low'
    END;

    RETURN jsonb_build_object(
        'fieldId', p_field_id,
        'seasonId', p_season_id,
        'cropType', v_crop,
        'areaPlanted', ROUND(v_area::numeric, 2),
        'totalInputCosts', ROUND(v_total_costs::numeric, 2),
        'costBreakdown', COALESCE(v_cost_breakdown, '[]'::jsonb),
        'estimatedYield', ROUND(v_yield::numeric, 2),
        'yieldUnit', 'kg',
        'marketPrice', ROUND(v_price::numeric, 2),
        'estimatedRevenue', ROUND(v_revenue::numeric, 2),
        'estimatedProfit', ROUND(v_profit::numeric, 2),
        'profitMargin', ROUND(v_margin::numeric, 1),
        'roi', ROUND(v_roi::numeric, 1),
        'breakEvenYield', ROUND(v_break_even::numeric, 2),
        'riskLevel', v_risk_level,
        'riskFactors', v_risk_factors
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- FUNCTION: Get Cost Recommendations
-- =========================
CREATE OR REPLACE FUNCTION get_cost_recommendations(
    p_field_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_recommendations JSONB := '[]'::jsonb;
    v_total_cost DECIMAL;
    v_fertilizer_pct DECIMAL;
    v_pesticide_pct DECIMAL;
    v_labor_pct DECIMAL;
    v_avg_community_cost DECIMAL;
    v_user_cost_per_acre DECIMAL;
BEGIN
    -- Get user's cost breakdown
    SELECT
        SUM(total_amount),
        SUM(CASE WHEN category = 'fertilizer' THEN total_amount ELSE 0 END) / NULLIF(SUM(total_amount), 0) * 100,
        SUM(CASE WHEN category = 'pesticide' THEN total_amount ELSE 0 END) / NULLIF(SUM(total_amount), 0) * 100,
        SUM(CASE WHEN category = 'labor' THEN total_amount ELSE 0 END) / NULLIF(SUM(total_amount), 0) * 100
    INTO v_total_cost, v_fertilizer_pct, v_pesticide_pct, v_labor_pct
    FROM input_costs
    WHERE user_id = v_user_id
    AND (p_field_id IS NULL OR field_id = p_field_id)
    AND purchase_date >= CURRENT_DATE - INTERVAL '6 months';

    -- Generate recommendations based on spending patterns
    IF v_fertilizer_pct > 40 THEN
        v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
            'type', 'warning',
            'message', 'Fertilizer costs are high (above 40% of total). Consider soil testing to optimize application.',
            'messageSw', 'Gharama za mbolea ni kubwa (zaidi ya 40%). Fikiria kupima udongo ili kuboresha matumizi.',
            'category', 'fertilizer',
            'potentialSaving', v_total_cost * 0.1
        ));
    END IF;

    IF v_pesticide_pct > 25 THEN
        v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
            'type', 'tip',
            'message', 'High pesticide spending. Explore integrated pest management (IPM) techniques.',
            'messageSw', 'Matumizi makubwa ya dawa. Chunguza mbinu za usimamizi wa wadudu.',
            'category', 'pesticide',
            'potentialSaving', v_total_cost * 0.08
        ));
    END IF;

    IF v_labor_pct > 35 THEN
        v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
            'type', 'tip',
            'message', 'Labor costs are significant. Consider mechanization for larger operations.',
            'messageSw', 'Gharama za kazi ni kubwa. Fikiria kutumia mashine kwa shughuli kubwa.',
            'category', 'labor'
        ));
    END IF;

    -- Add general tips
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
        'type', 'tip',
        'message', 'Buy inputs in bulk during off-season for better prices.',
        'messageSw', 'Nunua pembejeo kwa wingi wakati wa msimu wa chini kwa bei nzuri.'
    ));

    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
        'type', 'saving',
        'message', 'Join a farmer cooperative to access discounted inputs.',
        'messageSw', 'Jiunge na ushirika wa wakulima kupata pembejeo kwa bei nafuu.'
    ));

    RETURN jsonb_build_object(
        'recommendations', v_recommendations,
        'totalCostAnalyzed', v_total_cost,
        'periodMonths', 6
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- FUNCTION: Delete Input Cost
-- =========================
CREATE OR REPLACE FUNCTION delete_input_cost(p_cost_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    DELETE FROM input_costs
    WHERE id = p_cost_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cost not found or unauthorized');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- FUNCTION: Update Input Cost
-- =========================
CREATE OR REPLACE FUNCTION update_input_cost(
    p_cost_id UUID,
    p_category TEXT DEFAULT NULL,
    p_item_name TEXT DEFAULT NULL,
    p_total_amount DECIMAL DEFAULT NULL,
    p_field_id UUID DEFAULT NULL,
    p_quantity DECIMAL DEFAULT NULL,
    p_unit TEXT DEFAULT NULL,
    p_unit_price DECIMAL DEFAULT NULL,
    p_purchase_date DATE DEFAULT NULL,
    p_supplier TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    UPDATE input_costs SET
        category = COALESCE(p_category, category),
        item_name = COALESCE(p_item_name, item_name),
        total_amount = COALESCE(p_total_amount, total_amount),
        field_id = COALESCE(p_field_id, field_id),
        quantity = COALESCE(p_quantity, quantity),
        unit = COALESCE(p_unit, unit),
        unit_price = COALESCE(p_unit_price, unit_price),
        purchase_date = COALESCE(p_purchase_date, purchase_date),
        supplier = COALESCE(p_supplier, supplier),
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE id = p_cost_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cost not found or unauthorized');
    END IF;

    RETURN jsonb_build_object('success', true, 'costId', p_cost_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- GRANT PERMISSIONS
-- =========================
GRANT EXECUTE ON FUNCTION add_input_cost TO authenticated;
GRANT EXECUTE ON FUNCTION get_input_costs TO authenticated;
GRANT EXECUTE ON FUNCTION get_input_cost_summary TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_profit_projection TO authenticated;
GRANT EXECUTE ON FUNCTION get_cost_recommendations TO authenticated;
GRANT EXECUTE ON FUNCTION delete_input_cost TO authenticated;
GRANT EXECUTE ON FUNCTION update_input_cost TO authenticated;

-- =========================
-- TRIGGER: Update timestamps
-- =========================
CREATE OR REPLACE FUNCTION update_input_cost_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_input_cost_timestamp ON input_costs;
CREATE TRIGGER trigger_update_input_cost_timestamp
    BEFORE UPDATE ON input_costs
    FOR EACH ROW
    EXECUTE FUNCTION update_input_cost_timestamp();

DROP TRIGGER IF EXISTS trigger_update_growing_season_timestamp ON growing_seasons;
CREATE TRIGGER trigger_update_growing_season_timestamp
    BEFORE UPDATE ON growing_seasons
    FOR EACH ROW
    EXECUTE FUNCTION update_input_cost_timestamp();
