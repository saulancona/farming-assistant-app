-- =====================================================
-- Harvest Tracking & Analytics System
-- Track harvests, yields, costs, and calculate ROI
-- =====================================================

-- =========================
-- HARVESTS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS harvests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
    crop_type TEXT NOT NULL,
    crop_variety TEXT,

    -- Harvest details
    harvest_date DATE NOT NULL DEFAULT CURRENT_DATE,
    quantity DECIMAL(10,2) NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg', -- kg, bags, tonnes, crates
    quality_grade TEXT DEFAULT 'A', -- A, B, C, Rejected

    -- Storage & Sales
    storage_location TEXT,
    sold_quantity DECIMAL(10,2) DEFAULT 0,
    sold_amount DECIMAL(12,2) DEFAULT 0,
    sale_price_per_unit DECIMAL(10,2),
    buyer_name TEXT,
    sale_date DATE,

    -- Costs for this harvest cycle
    seed_cost DECIMAL(10,2) DEFAULT 0,
    fertilizer_cost DECIMAL(10,2) DEFAULT 0,
    pesticide_cost DECIMAL(10,2) DEFAULT 0,
    labor_cost DECIMAL(10,2) DEFAULT 0,
    transport_cost DECIMAL(10,2) DEFAULT 0,
    other_cost DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(12,2) GENERATED ALWAYS AS (
        COALESCE(seed_cost, 0) + COALESCE(fertilizer_cost, 0) +
        COALESCE(pesticide_cost, 0) + COALESCE(labor_cost, 0) +
        COALESCE(transport_cost, 0) + COALESCE(other_cost, 0)
    ) STORED,

    -- Calculated fields
    profit DECIMAL(12,2) GENERATED ALWAYS AS (
        COALESCE(sold_amount, 0) - (
            COALESCE(seed_cost, 0) + COALESCE(fertilizer_cost, 0) +
            COALESCE(pesticide_cost, 0) + COALESCE(labor_cost, 0) +
            COALESCE(transport_cost, 0) + COALESCE(other_cost, 0)
        )
    ) STORED,

    -- Area planted (for yield calculations)
    area_planted DECIMAL(8,2), -- in acres
    area_unit TEXT DEFAULT 'acres', -- acres, hectares

    -- Photos
    photo_urls TEXT[] DEFAULT '{}',

    -- Notes
    notes TEXT,
    weather_conditions TEXT,

    -- Metadata
    season TEXT, -- long_rains, short_rains, irrigated
    year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE harvests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own harvests" ON harvests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own harvests" ON harvests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own harvests" ON harvests
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own harvests" ON harvests
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_harvests_user_id ON harvests(user_id);
CREATE INDEX IF NOT EXISTS idx_harvests_field_id ON harvests(field_id);
CREATE INDEX IF NOT EXISTS idx_harvests_crop_type ON harvests(crop_type);
CREATE INDEX IF NOT EXISTS idx_harvests_date ON harvests(harvest_date);
CREATE INDEX IF NOT EXISTS idx_harvests_year_season ON harvests(year, season);

-- =========================
-- INPUT COSTS TABLE (for tracking costs separately)
-- =========================
CREATE TABLE IF NOT EXISTS input_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
    harvest_id UUID REFERENCES harvests(id) ON DELETE CASCADE,

    category TEXT NOT NULL, -- seed, fertilizer, pesticide, labor, transport, equipment, other
    item_name TEXT NOT NULL,
    quantity DECIMAL(10,2),
    unit TEXT,
    unit_price DECIMAL(10,2),
    total_amount DECIMAL(12,2) NOT NULL,

    purchase_date DATE DEFAULT CURRENT_DATE,
    supplier TEXT,
    receipt_photo_url TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE input_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own input costs" ON input_costs
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_input_costs_user ON input_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_input_costs_harvest ON input_costs(harvest_id);
CREATE INDEX IF NOT EXISTS idx_input_costs_category ON input_costs(category);

-- =========================
-- FUNCTION: Get Harvest Analytics
-- =========================
CREATE OR REPLACE FUNCTION get_harvest_analytics(
    p_user_id UUID,
    p_year INTEGER DEFAULT NULL,
    p_crop_type TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_total_harvests INTEGER;
    v_total_quantity DECIMAL;
    v_total_revenue DECIMAL;
    v_total_cost DECIMAL;
    v_total_profit DECIMAL;
    v_avg_yield DECIMAL;
    v_best_crop RECORD;
    v_by_crop JSONB;
    v_by_season JSONB;
    v_by_month JSONB;
BEGIN
    -- Get totals
    SELECT
        COUNT(*),
        COALESCE(SUM(quantity), 0),
        COALESCE(SUM(sold_amount), 0),
        COALESCE(SUM(total_cost), 0),
        COALESCE(SUM(profit), 0)
    INTO v_total_harvests, v_total_quantity, v_total_revenue, v_total_cost, v_total_profit
    FROM harvests
    WHERE user_id = p_user_id
    AND (p_year IS NULL OR year = p_year)
    AND (p_crop_type IS NULL OR crop_type = p_crop_type);

    -- Calculate average yield per acre
    SELECT COALESCE(AVG(quantity / NULLIF(area_planted, 0)), 0)
    INTO v_avg_yield
    FROM harvests
    WHERE user_id = p_user_id
    AND area_planted > 0
    AND (p_year IS NULL OR year = p_year);

    -- Get best performing crop
    SELECT crop_type, SUM(profit) as total_profit, SUM(quantity) as total_quantity
    INTO v_best_crop
    FROM harvests
    WHERE user_id = p_user_id
    AND (p_year IS NULL OR year = p_year)
    GROUP BY crop_type
    ORDER BY total_profit DESC
    LIMIT 1;

    -- Analytics by crop
    SELECT jsonb_agg(jsonb_build_object(
        'crop', crop_type,
        'harvests', harvest_count,
        'totalQuantity', total_qty,
        'totalRevenue', total_rev,
        'totalCost', total_cst,
        'profit', prft,
        'avgYieldPerAcre', avg_yld
    ))
    INTO v_by_crop
    FROM (
        SELECT
            crop_type,
            COUNT(*) as harvest_count,
            SUM(quantity) as total_qty,
            SUM(sold_amount) as total_rev,
            SUM(total_cost) as total_cst,
            SUM(profit) as prft,
            AVG(quantity / NULLIF(area_planted, 0)) as avg_yld
        FROM harvests
        WHERE user_id = p_user_id
        AND (p_year IS NULL OR year = p_year)
        GROUP BY crop_type
        ORDER BY prft DESC
    ) t;

    -- Analytics by season
    SELECT jsonb_agg(jsonb_build_object(
        'season', season,
        'harvests', harvest_count,
        'totalQuantity', total_qty,
        'profit', prft
    ))
    INTO v_by_season
    FROM (
        SELECT
            COALESCE(season, 'unknown') as season,
            COUNT(*) as harvest_count,
            SUM(quantity) as total_qty,
            SUM(profit) as prft
        FROM harvests
        WHERE user_id = p_user_id
        AND (p_year IS NULL OR year = p_year)
        GROUP BY season
    ) t;

    -- Analytics by month
    SELECT jsonb_agg(jsonb_build_object(
        'month', month_num,
        'harvests', harvest_count,
        'quantity', total_qty,
        'revenue', total_rev
    ) ORDER BY month_num)
    INTO v_by_month
    FROM (
        SELECT
            EXTRACT(MONTH FROM harvest_date) as month_num,
            COUNT(*) as harvest_count,
            SUM(quantity) as total_qty,
            SUM(sold_amount) as total_rev
        FROM harvests
        WHERE user_id = p_user_id
        AND (p_year IS NULL OR year = p_year)
        GROUP BY EXTRACT(MONTH FROM harvest_date)
    ) t;

    v_result := jsonb_build_object(
        'summary', jsonb_build_object(
            'totalHarvests', v_total_harvests,
            'totalQuantity', v_total_quantity,
            'totalRevenue', v_total_revenue,
            'totalCost', v_total_cost,
            'totalProfit', v_total_profit,
            'avgYieldPerAcre', ROUND(v_avg_yield::numeric, 2),
            'profitMargin', CASE WHEN v_total_revenue > 0
                THEN ROUND((v_total_profit / v_total_revenue * 100)::numeric, 1)
                ELSE 0 END
        ),
        'bestCrop', CASE WHEN v_best_crop.crop_type IS NOT NULL THEN
            jsonb_build_object(
                'crop', v_best_crop.crop_type,
                'profit', v_best_crop.total_profit,
                'quantity', v_best_crop.total_quantity
            )
            ELSE NULL END,
        'byCrop', COALESCE(v_by_crop, '[]'::jsonb),
        'bySeason', COALESCE(v_by_season, '[]'::jsonb),
        'byMonth', COALESCE(v_by_month, '[]'::jsonb)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- FUNCTION: Get Yield Comparison
-- =========================
CREATE OR REPLACE FUNCTION get_yield_comparison(
    p_user_id UUID,
    p_crop_type TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user_avg DECIMAL;
    v_community_avg DECIMAL;
    v_user_harvests JSONB;
BEGIN
    -- Get user's average yield for this crop
    SELECT AVG(quantity / NULLIF(area_planted, 0))
    INTO v_user_avg
    FROM harvests
    WHERE user_id = p_user_id
    AND crop_type = p_crop_type
    AND area_planted > 0;

    -- Get community average (all users)
    SELECT AVG(quantity / NULLIF(area_planted, 0))
    INTO v_community_avg
    FROM harvests
    WHERE crop_type = p_crop_type
    AND area_planted > 0;

    -- Get user's harvests for this crop
    SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'date', harvest_date,
        'quantity', quantity,
        'area', area_planted,
        'yield', ROUND((quantity / NULLIF(area_planted, 0))::numeric, 2),
        'profit', profit,
        'season', season
    ) ORDER BY harvest_date DESC)
    INTO v_user_harvests
    FROM harvests
    WHERE user_id = p_user_id
    AND crop_type = p_crop_type
    LIMIT 10;

    RETURN jsonb_build_object(
        'cropType', p_crop_type,
        'userAvgYield', ROUND(COALESCE(v_user_avg, 0)::numeric, 2),
        'communityAvgYield', ROUND(COALESCE(v_community_avg, 0)::numeric, 2),
        'comparison', CASE
            WHEN v_community_avg > 0 AND v_user_avg > 0 THEN
                ROUND(((v_user_avg - v_community_avg) / v_community_avg * 100)::numeric, 1)
            ELSE 0 END,
        'harvests', COALESCE(v_user_harvests, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- FUNCTION: Record Harvest
-- =========================
CREATE OR REPLACE FUNCTION record_harvest(
    p_user_id UUID,
    p_crop_type TEXT,
    p_quantity DECIMAL,
    p_unit TEXT DEFAULT 'kg',
    p_field_id UUID DEFAULT NULL,
    p_harvest_date DATE DEFAULT CURRENT_DATE,
    p_area_planted DECIMAL DEFAULT NULL,
    p_quality_grade TEXT DEFAULT 'A',
    p_season TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_photo_urls TEXT[] DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
    v_harvest_id UUID;
    v_xp_awarded INTEGER := 15;
    v_field_name TEXT;
BEGIN
    -- Get field name if field_id provided
    IF p_field_id IS NOT NULL THEN
        SELECT name INTO v_field_name FROM fields WHERE id = p_field_id;
    END IF;

    -- Insert harvest record
    INSERT INTO harvests (
        user_id, field_id, crop_type, harvest_date,
        quantity, unit, area_planted, quality_grade,
        season, notes, photo_urls, year
    ) VALUES (
        p_user_id, p_field_id, p_crop_type, p_harvest_date,
        p_quantity, p_unit, p_area_planted, p_quality_grade,
        p_season, p_notes, p_photo_urls, EXTRACT(YEAR FROM p_harvest_date)
    )
    RETURNING id INTO v_harvest_id;

    -- Award XP for recording harvest
    PERFORM award_xp(p_user_id, 'harvest_recorded', 'Recorded harvest: ' || p_crop_type, v_xp_awarded, '{}');

    -- Award points
    PERFORM award_points(p_user_id, 5, 'harvest', v_harvest_id::TEXT, 'Harvest recorded');

    -- Check for harvest achievements
    PERFORM check_harvest_achievements(p_user_id);

    RETURN jsonb_build_object(
        'success', true,
        'harvestId', v_harvest_id,
        'xpAwarded', v_xp_awarded,
        'pointsAwarded', 5,
        'message', 'Harvest recorded successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- FUNCTION: Record Sale
-- =========================
CREATE OR REPLACE FUNCTION record_harvest_sale(
    p_harvest_id UUID,
    p_sold_quantity DECIMAL,
    p_sold_amount DECIMAL,
    p_buyer_name TEXT DEFAULT NULL,
    p_sale_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_harvest RECORD;
BEGIN
    -- Get harvest details
    SELECT * INTO v_harvest FROM harvests WHERE id = p_harvest_id;

    IF v_harvest IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Harvest not found');
    END IF;

    -- Check if user owns the harvest
    IF v_harvest.user_id != auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- Update harvest with sale info
    UPDATE harvests SET
        sold_quantity = COALESCE(sold_quantity, 0) + p_sold_quantity,
        sold_amount = COALESCE(sold_amount, 0) + p_sold_amount,
        sale_price_per_unit = p_sold_amount / NULLIF(p_sold_quantity, 0),
        buyer_name = COALESCE(p_buyer_name, buyer_name),
        sale_date = COALESCE(p_sale_date, sale_date),
        updated_at = NOW()
    WHERE id = p_harvest_id;

    -- Award XP for sale
    PERFORM award_xp(v_harvest.user_id, 'harvest_sold', 'Sold harvest', 10, '{}');

    RETURN jsonb_build_object(
        'success', true,
        'harvestId', p_harvest_id,
        'soldQuantity', p_sold_quantity,
        'soldAmount', p_sold_amount,
        'xpAwarded', 10
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- FUNCTION: Check Harvest Achievements
-- =========================
CREATE OR REPLACE FUNCTION check_harvest_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_harvests INTEGER;
    v_total_sold DECIMAL;
    v_crops_grown INTEGER;
BEGIN
    -- Count total harvests
    SELECT COUNT(*) INTO v_total_harvests FROM harvests WHERE user_id = p_user_id;

    -- Count total sold amount
    SELECT COALESCE(SUM(sold_amount), 0) INTO v_total_sold FROM harvests WHERE user_id = p_user_id;

    -- Count unique crops grown
    SELECT COUNT(DISTINCT crop_type) INTO v_crops_grown FROM harvests WHERE user_id = p_user_id;

    -- First Harvest achievement
    IF v_total_harvests >= 1 THEN
        INSERT INTO user_achievements (user_id, achievement_id, completed, completed_at, progress)
        VALUES (p_user_id, 'first_harvest', true, NOW(), 100)
        ON CONFLICT (user_id, achievement_id) DO UPDATE SET completed = true, completed_at = NOW();
    END IF;

    -- 10 Harvests achievement
    IF v_total_harvests >= 10 THEN
        INSERT INTO user_achievements (user_id, achievement_id, completed, completed_at, progress)
        VALUES (p_user_id, 'harvest_veteran', true, NOW(), 100)
        ON CONFLICT (user_id, achievement_id) DO UPDATE SET completed = true, completed_at = NOW();
    END IF;

    -- Crop Diversity achievement (5+ different crops)
    IF v_crops_grown >= 5 THEN
        INSERT INTO user_achievements (user_id, achievement_id, completed, completed_at, progress)
        VALUES (p_user_id, 'crop_diversity', true, NOW(), 100)
        ON CONFLICT (user_id, achievement_id) DO UPDATE SET completed = true, completed_at = NOW();
    END IF;

    -- Big Seller achievement ($1000+ in sales)
    IF v_total_sold >= 1000 THEN
        INSERT INTO user_achievements (user_id, achievement_id, completed, completed_at, progress)
        VALUES (p_user_id, 'big_seller', true, NOW(), 100)
        ON CONFLICT (user_id, achievement_id) DO UPDATE SET completed = true, completed_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- INSERT HARVEST ACHIEVEMENTS
-- =========================
INSERT INTO achievements (id, name, name_sw, description, description_sw, category, xp_reward, icon, criteria)
VALUES
    ('first_harvest', 'First Harvest', 'Mavuno ya Kwanza', 'Record your first harvest', 'Rekodi mavuno yako ya kwanza', 'farming', 25, '🌾', '{"type": "harvest_count", "count": 1}'),
    ('harvest_veteran', 'Harvest Veteran', 'Mkongwe wa Mavuno', 'Record 10 harvests', 'Rekodi mavuno 10', 'farming', 50, '🏆', '{"type": "harvest_count", "count": 10}'),
    ('crop_diversity', 'Crop Diversity Master', 'Bwana wa Aina za Mazao', 'Grow 5 different crop types', 'Panda aina 5 tofauti za mazao', 'farming', 75, '🌈', '{"type": "crop_variety", "count": 5}'),
    ('big_seller', 'Big Seller', 'Muuzaji Mkubwa', 'Sell harvests worth $1000+', 'Uza mavuno yenye thamani ya $1000+', 'marketplace', 100, '💰', '{"type": "sales_total", "amount": 1000}')
ON CONFLICT (id) DO NOTHING;

-- =========================
-- TRIGGER: Update harvest timestamp
-- =========================
CREATE OR REPLACE FUNCTION update_harvest_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_harvest_timestamp ON harvests;
CREATE TRIGGER trigger_update_harvest_timestamp
    BEFORE UPDATE ON harvests
    FOR EACH ROW
    EXECUTE FUNCTION update_harvest_timestamp();

-- =========================
-- VIEW: Harvest Summary
-- =========================
CREATE OR REPLACE VIEW harvest_summary AS
SELECT
    h.user_id,
    h.year,
    h.crop_type,
    COUNT(*) as harvest_count,
    SUM(h.quantity) as total_quantity,
    h.unit,
    SUM(h.area_planted) as total_area,
    AVG(h.quantity / NULLIF(h.area_planted, 0)) as avg_yield,
    SUM(h.sold_amount) as total_revenue,
    SUM(h.total_cost) as total_cost,
    SUM(h.profit) as total_profit,
    AVG(h.sale_price_per_unit) as avg_price_per_unit
FROM harvests h
GROUP BY h.user_id, h.year, h.crop_type, h.unit;

GRANT SELECT ON harvest_summary TO authenticated;
