-- =====================================================
-- Fix Input Cost Function - Correct award_xp call signature
-- The award_xp function expects (user_id, action, action_sw, xp_amount, metadata)
-- =====================================================

-- =========================
-- FUNCTION: Add Input Cost (Fixed)
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
    -- Verify user is authenticated
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

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

    -- Award XP for logging input cost with correct parameter order
    -- award_xp(user_id, action_en, action_sw, xp_amount, metadata)
    BEGIN
        PERFORM award_xp(
            v_user_id,
            'input_cost_logged',      -- action (English)
            'Gharama imeandikwa',     -- action_sw (Swahili)
            5,                         -- xp_amount
            jsonb_build_object('category', p_category, 'item_name', p_item_name)
        );
    EXCEPTION WHEN OTHERS THEN
        -- If award_xp fails, log but don't fail the whole operation
        RAISE NOTICE 'award_xp failed: %', SQLERRM;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'costId', v_cost_id,
        'xpAwarded', 5
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_input_cost TO authenticated;
