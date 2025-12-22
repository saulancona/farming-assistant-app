-- =====================================================
-- Seasonal Crop Missions - Complete Crop Plans as Quests
-- =====================================================

-- Add mission completion rewards columns
ALTER TABLE user_missions
ADD COLUMN IF NOT EXISTS badge_awarded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS priority_market_access_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS double_referral_points_until TIMESTAMPTZ;

-- Add weather trigger columns to mission steps
ALTER TABLE mission_step_progress
ADD COLUMN IF NOT EXISTS weather_trigger TEXT, -- 'rain_expected', 'dry_spell', 'temperature_high', etc.
ADD COLUMN IF NOT EXISTS auto_reminded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- =====================================================
-- INSERT CROP-SPECIFIC MISSION TEMPLATES
-- =====================================================

-- Maize Season Mission (90 days)
INSERT INTO seasonal_missions (
    name, name_sw, description, description_sw,
    crop_type, season, steps, xp_reward, points_reward,
    duration_days, difficulty, is_active
) VALUES (
    'Maize Season Success',
    'Mafanikio ya Msimu wa Mahindi',
    'Complete all 6 steps of your maize growing plan for maximum yield. Follow best practices from soil preparation to harvest.',
    'Kamilisha hatua zote 6 za mpango wako wa kukuza mahindi kwa mavuno ya juu. Fuata mazoea bora kuanzia kuandaa udongo hadi kuvuna.',
    'maize',
    'long_rains',
    '[
        {
            "name": "Soil Preparation",
            "name_sw": "Kuandaa Udongo",
            "description": "Test soil pH and nutrients. Add organic matter or fertilizer as needed. Plow and harrow the field.",
            "description_sw": "Pima pH na virutubisho vya udongo. Ongeza mboji au mbolea inavyohitajika. Lima na lainisha shamba.",
            "day_offset": 0,
            "xp_reward": 10,
            "weather_trigger": null,
            "photo_required": true
        },
        {
            "name": "Planting",
            "name_sw": "Kupanda",
            "description": "Plant seeds at 75cm x 25cm spacing, 5cm deep. Use certified seeds. Plant when soil is moist.",
            "description_sw": "Panda mbegu kwa nafasi ya 75cm x 25cm, kina cha 5cm. Tumia mbegu zilizoidhinishwa. Panda wakati udongo una unyevu.",
            "day_offset": 7,
            "xp_reward": 15,
            "weather_trigger": "rain_expected",
            "photo_required": true
        },
        {
            "name": "First Weeding & Fertilizer",
            "name_sw": "Kupalilia Kwanza na Mbolea",
            "description": "Weed the field 2-3 weeks after planting. Apply top dressing fertilizer (CAN or Urea) around plants.",
            "description_sw": "Palilia shamba wiki 2-3 baada ya kupanda. Weka mbolea ya kupalia (CAN au Urea) karibu na mimea.",
            "day_offset": 21,
            "xp_reward": 10,
            "weather_trigger": null,
            "photo_required": true
        },
        {
            "name": "Pest & Disease Inspection",
            "name_sw": "Ukaguzi wa Wadudu na Magonjwa",
            "description": "Scout for fall armyworm, stem borers, and maize streak virus. Take photos of any issues for AI diagnosis.",
            "description_sw": "Tafuta viwavi wa jeshi, wadudu wa shina, na virusi vya mistari ya mahindi. Piga picha za matatizo yoyote kwa utambuzi wa AI.",
            "day_offset": 35,
            "xp_reward": 15,
            "weather_trigger": null,
            "photo_required": true
        },
        {
            "name": "Second Fertilizer Application",
            "name_sw": "Kuweka Mbolea ya Pili",
            "description": "Apply second dose of fertilizer at tasseling stage. Ensure good soil moisture before application.",
            "description_sw": "Weka kipimo cha pili cha mbolea wakati wa kutoa maua. Hakikisha udongo una unyevu mzuri kabla ya kuweka.",
            "day_offset": 50,
            "xp_reward": 10,
            "weather_trigger": "rain_expected",
            "photo_required": true
        },
        {
            "name": "Harvest Preparation",
            "name_sw": "Kujiandaa Kuvuna",
            "description": "Monitor grain maturity. Prepare drying area and storage. Harvest when moisture is 20-25%.",
            "description_sw": "Fuatilia ukomavu wa nafaka. Andaa eneo la kukausha na kuhifadhi. Vuna wakati unyevu ni 20-25%.",
            "day_offset": 90,
            "xp_reward": 15,
            "weather_trigger": "dry_spell",
            "photo_required": true
        }
    ]'::jsonb,
    100,
    50,
    90,
    'medium',
    TRUE
) ON CONFLICT DO NOTHING;

-- Bean Season Mission (75 days)
INSERT INTO seasonal_missions (
    name, name_sw, description, description_sw,
    crop_type, season, steps, xp_reward, points_reward,
    duration_days, difficulty, is_active
) VALUES (
    'Bean Harvest Champion',
    'Bingwa wa Mavuno ya Maharagwe',
    'Master your bean cultivation from planting to harvest. Beans fix nitrogen in soil, improving future crops!',
    'Miliki kilimo chako cha maharagwe kuanzia kupanda hadi kuvuna. Maharagwe hurekebisha nitrojeni kwenye udongo, kuboresha mazao ya baadaye!',
    'beans',
    'short_rains',
    '[
        {
            "name": "Land Preparation",
            "name_sw": "Kuandaa Ardhi",
            "description": "Clear field of weeds. Make furrows 45-60cm apart. Test and amend soil if needed.",
            "description_sw": "Ondoa magugu shambani. Tengeneza mifereji umbali wa 45-60cm. Pima na rekebisha udongo ikiwa inahitajika.",
            "day_offset": 0,
            "xp_reward": 10,
            "weather_trigger": null,
            "photo_required": true
        },
        {
            "name": "Sowing Seeds",
            "name_sw": "Kupanda Mbegu",
            "description": "Plant 2-3 seeds per hole, 5cm deep, 15-20cm apart in rows. Use inoculant for better nitrogen fixation.",
            "description_sw": "Panda mbegu 2-3 kwa shimo, kina cha 5cm, umbali wa 15-20cm kwa safu. Tumia inoculant kwa kurekebisha nitrojeni vizuri.",
            "day_offset": 5,
            "xp_reward": 15,
            "weather_trigger": "rain_expected",
            "photo_required": true
        },
        {
            "name": "First Weeding",
            "name_sw": "Kupalilia Kwanza",
            "description": "Weed carefully 2 weeks after emergence. Avoid damaging shallow roots. Hill up soil around plants.",
            "description_sw": "Palilia kwa uangalifu wiki 2 baada ya kuchipua. Epuka kuharibu mizizi ya juu juu. Fuga udongo karibu na mimea.",
            "day_offset": 20,
            "xp_reward": 10,
            "weather_trigger": null,
            "photo_required": true
        },
        {
            "name": "Pest & Disease Check",
            "name_sw": "Ukaguzi wa Wadudu na Magonjwa",
            "description": "Scout for aphids, bean fly, and rust disease. Apply organic or chemical control as needed.",
            "description_sw": "Tafuta vidukari, inzi wa maharagwe, na ugonjwa wa kutu. Tumia udhibiti wa kikaboni au kemikali inavyohitajika.",
            "day_offset": 35,
            "xp_reward": 15,
            "weather_trigger": null,
            "photo_required": true
        },
        {
            "name": "Flowering Care",
            "name_sw": "Huduma ya Maua",
            "description": "Ensure adequate moisture during flowering. Avoid disturbing plants. Monitor for pod borers.",
            "description_sw": "Hakikisha unyevu wa kutosha wakati wa maua. Epuka kusumbua mimea. Fuatilia wadudu wa maganda.",
            "day_offset": 45,
            "xp_reward": 10,
            "weather_trigger": null,
            "photo_required": true
        },
        {
            "name": "Harvest & Dry",
            "name_sw": "Kuvuna na Kukausha",
            "description": "Harvest when 90% of pods turn yellow/brown. Dry on clean surface. Store in airtight containers.",
            "description_sw": "Vuna wakati 90% ya maganda yanageuka njano/kahawia. Kausha kwenye uso safi. Hifadhi kwenye vyombo visivyopitisha hewa.",
            "day_offset": 75,
            "xp_reward": 15,
            "weather_trigger": "dry_spell",
            "photo_required": true
        }
    ]'::jsonb,
    80,
    40,
    75,
    'easy',
    TRUE
) ON CONFLICT DO NOTHING;

-- Tomato Season Mission (120 days)
INSERT INTO seasonal_missions (
    name, name_sw, description, description_sw,
    crop_type, season, steps, xp_reward, points_reward,
    duration_days, difficulty, is_active
) VALUES (
    'Tomato Master Farmer',
    'Mtaalamu wa Nyanya',
    'Complete the full tomato growing cycle with expert techniques. High-value crop requiring careful management.',
    'Kamilisha mzunguko kamili wa kukuza nyanya na mbinu za kitaalamu. Zao la thamani kubwa linalohitaji usimamizi makini.',
    'tomato',
    'all',
    '[
        {
            "name": "Nursery Preparation",
            "name_sw": "Kuandaa Kitalu",
            "description": "Prepare raised nursery beds. Sow seeds 1cm deep, 5cm apart. Provide shade and water regularly.",
            "description_sw": "Andaa vitalu vilivyoinuliwa. Panda mbegu kina cha 1cm, umbali wa 5cm. Toa kivuli na maji mara kwa mara.",
            "day_offset": 0,
            "xp_reward": 10,
            "weather_trigger": null,
            "photo_required": true
        },
        {
            "name": "Transplanting",
            "name_sw": "Kupandikiza",
            "description": "Transplant seedlings when 15-20cm tall with 4-5 leaves. Space 60cm x 45cm. Water immediately.",
            "description_sw": "Pandikiza miche wakati ni 15-20cm kimo na majani 4-5. Nafasi ya 60cm x 45cm. Mwagilia maji mara moja.",
            "day_offset": 30,
            "xp_reward": 15,
            "weather_trigger": "rain_expected",
            "photo_required": true
        },
        {
            "name": "Staking & Pruning",
            "name_sw": "Kusimamisha na Kupogoa",
            "description": "Install stakes or cages. Remove suckers from leaf axils. Train main stem to grow upward.",
            "description_sw": "Weka vigingi au vizimba. Ondoa machipukizi kutoka kwa makalio ya majani. Elekeza shina kuu kukua juu.",
            "day_offset": 45,
            "xp_reward": 10,
            "weather_trigger": null,
            "photo_required": true
        },
        {
            "name": "Fertilizer Application",
            "name_sw": "Kuweka Mbolea",
            "description": "Apply NPK fertilizer at flowering. Side dress with CAN every 2 weeks. Ensure good drainage.",
            "description_sw": "Weka mbolea ya NPK wakati wa maua. Weka CAN pembeni kila wiki 2. Hakikisha mifereji mizuri.",
            "day_offset": 50,
            "xp_reward": 10,
            "weather_trigger": null,
            "photo_required": true
        },
        {
            "name": "Disease Management",
            "name_sw": "Usimamizi wa Magonjwa",
            "description": "Scout for blight, bacterial wilt, and leaf curl virus. Apply fungicides preventively. Remove infected plants.",
            "description_sw": "Tafuta ukungu, kunyauka kwa bakteria, na virusi vya kusokota majani. Weka dawa za ukungu kwa kuzuia. Ondoa mimea iliyoambukizwa.",
            "day_offset": 60,
            "xp_reward": 15,
            "weather_trigger": "rain_expected",
            "photo_required": true
        },
        {
            "name": "Fruit Care",
            "name_sw": "Huduma ya Matunda",
            "description": "Mulch to prevent fruit rot. Ensure consistent watering. Protect from direct sun damage.",
            "description_sw": "Tandaza matandiko kuzuia kuoza kwa matunda. Hakikisha kumwagilia kwa uthabiti. Linda kutokana na uharibifu wa jua moja kwa moja.",
            "day_offset": 75,
            "xp_reward": 10,
            "weather_trigger": null,
            "photo_required": true
        },
        {
            "name": "Harvest & Market",
            "name_sw": "Kuvuna na Kuuza",
            "description": "Harvest when fruits turn red/orange. Handle carefully to avoid bruising. Sell within 3-5 days.",
            "description_sw": "Vuna wakati matunda yanageuka nyekundu/machungwa. Shughulikia kwa uangalifu ili kuepuka michubuko. Uza ndani ya siku 3-5.",
            "day_offset": 120,
            "xp_reward": 20,
            "weather_trigger": null,
            "photo_required": true
        }
    ]'::jsonb,
    120,
    60,
    120,
    'hard',
    TRUE
) ON CONFLICT DO NOTHING;

-- Cabbage Season Mission (90 days)
INSERT INTO seasonal_missions (
    name, name_sw, description, description_sw,
    crop_type, season, steps, xp_reward, points_reward,
    duration_days, difficulty, is_active
) VALUES (
    'Cabbage Growing Expert',
    'Mtaalamu wa Kukuza Kabichi',
    'Grow healthy cabbages from seedling to harvest. Learn pest management and timing for best market prices.',
    'Kuza kabichi zenye afya kutoka kwa miche hadi kuvuna. Jifunze usimamizi wa wadudu na wakati wa bei bora sokoni.',
    'cabbage',
    'short_rains',
    '[
        {
            "name": "Nursery Setup",
            "name_sw": "Kuanzisha Kitalu",
            "description": "Prepare nursery with fine tilth. Sow seeds in rows 10cm apart. Water morning and evening.",
            "description_sw": "Andaa kitalu chenye udongo laini. Panda mbegu kwa safu umbali wa 10cm. Mwagilia maji asubuhi na jioni.",
            "day_offset": 0,
            "xp_reward": 10,
            "weather_trigger": null,
            "photo_required": true
        },
        {
            "name": "Transplanting",
            "name_sw": "Kupandikiza",
            "description": "Transplant 4-5 week old seedlings. Space 45cm x 45cm. Apply starter fertilizer. Water deeply.",
            "description_sw": "Pandikiza miche ya wiki 4-5. Nafasi ya 45cm x 45cm. Weka mbolea ya kuanzia. Mwagilia maji kwa kina.",
            "day_offset": 30,
            "xp_reward": 15,
            "weather_trigger": "rain_expected",
            "photo_required": true
        },
        {
            "name": "Pest Control",
            "name_sw": "Kudhibiti Wadudu",
            "description": "Scout for diamondback moth, aphids, and cutworms. Apply appropriate pesticides or organic solutions.",
            "description_sw": "Tafuta nondo wa almasi, vidukari, na minyoo wa kukata. Tumia viuatilifu vinavyofaa au suluhisho za kikaboni.",
            "day_offset": 45,
            "xp_reward": 15,
            "weather_trigger": null,
            "photo_required": true
        },
        {
            "name": "Top Dressing",
            "name_sw": "Kupalia Mbolea",
            "description": "Apply CAN fertilizer for head formation. Water well after application. Monitor plant health.",
            "description_sw": "Weka mbolea ya CAN kwa uundaji wa kichwa. Mwagilia maji vizuri baada ya kuweka. Fuatilia afya ya mmea.",
            "day_offset": 55,
            "xp_reward": 10,
            "weather_trigger": null,
            "photo_required": true
        },
        {
            "name": "Head Development",
            "name_sw": "Ukuaji wa Kichwa",
            "description": "Ensure consistent moisture. Remove outer damaged leaves. Protect from excessive heat.",
            "description_sw": "Hakikisha unyevu wa mara kwa mara. Ondoa majani ya nje yaliyoharibiwa. Linda kutokana na joto kupita kiasi.",
            "day_offset": 70,
            "xp_reward": 10,
            "weather_trigger": null,
            "photo_required": true
        },
        {
            "name": "Harvest",
            "name_sw": "Kuvuna",
            "description": "Harvest when heads are firm and compact. Cut at base with sharp knife. Market immediately for best price.",
            "description_sw": "Vuna wakati vichwa vimeshikamana na vimeenea. Kata chini kwa kisu kikali. Uza sokoni mara moja kwa bei bora.",
            "day_offset": 90,
            "xp_reward": 15,
            "weather_trigger": null,
            "photo_required": true
        }
    ]'::jsonb,
    90,
    45,
    90,
    'medium',
    TRUE
) ON CONFLICT DO NOTHING;

-- Potato Season Mission (100 days)
INSERT INTO seasonal_missions (
    name, name_sw, description, description_sw,
    crop_type, season, steps, xp_reward, points_reward,
    duration_days, difficulty, is_active
) VALUES (
    'Potato Farming Pro',
    'Mtaalamu wa Kilimo cha Viazi',
    'Master potato cultivation from seed selection to storage. Learn proper hilling and disease prevention.',
    'Miliki kilimo cha viazi kutoka kuchagua mbegu hadi kuhifadhi. Jifunze kufuga na kuzuia magonjwa ipasavyo.',
    'potato',
    'long_rains',
    '[
        {
            "name": "Seed Selection & Treatment",
            "name_sw": "Kuchagua na Kutibu Mbegu",
            "description": "Select certified disease-free seed potatoes. Cut large ones with 2-3 eyes per piece. Treat with fungicide.",
            "description_sw": "Chagua viazi vya mbegu vilivyoidhinishwa visivyo na magonjwa. Kata vikubwa na macho 2-3 kwa kipande. Tibu na dawa ya ukungu.",
            "day_offset": 0,
            "xp_reward": 10,
            "weather_trigger": null,
            "photo_required": true
        },
        {
            "name": "Planting",
            "name_sw": "Kupanda",
            "description": "Plant in furrows 75cm apart, 30cm between plants. Cover with 10cm soil. Apply basal fertilizer.",
            "description_sw": "Panda kwenye mifereji umbali wa 75cm, 30cm kati ya mimea. Funika kwa udongo wa 10cm. Weka mbolea ya msingi.",
            "day_offset": 7,
            "xp_reward": 15,
            "weather_trigger": "rain_expected",
            "photo_required": true
        },
        {
            "name": "First Hilling",
            "name_sw": "Kufuga Kwanza",
            "description": "Hill up soil around plants when 15-20cm tall. This encourages more tuber formation.",
            "description_sw": "Fuga udongo karibu na mimea wakati ni 15-20cm kimo. Hii inashawishi uundaji wa viazi zaidi.",
            "day_offset": 30,
            "xp_reward": 10,
            "weather_trigger": null,
            "photo_required": true
        },
        {
            "name": "Second Hilling & Fertilizer",
            "name_sw": "Kufuga Pili na Mbolea",
            "description": "Hill again before flowering. Apply top dressing fertilizer. Ensure good soil coverage of tubers.",
            "description_sw": "Fuga tena kabla ya maua. Weka mbolea ya kupalia. Hakikisha viazi vimefunikwa vizuri na udongo.",
            "day_offset": 45,
            "xp_reward": 10,
            "weather_trigger": null,
            "photo_required": true
        },
        {
            "name": "Blight Prevention",
            "name_sw": "Kuzuia Ukungu",
            "description": "Apply fungicides to prevent late blight, especially in wet weather. Scout for early signs.",
            "description_sw": "Weka dawa za ukungu kuzuia ukungu wa kuchelewa, hasa wakati wa mvua. Tafuta ishara za mapema.",
            "day_offset": 60,
            "xp_reward": 15,
            "weather_trigger": "rain_expected",
            "photo_required": true
        },
        {
            "name": "Harvest & Cure",
            "name_sw": "Kuvuna na Kuponya",
            "description": "Harvest 2-3 weeks after vines die. Cure in shade for 2 weeks before storage. Check for disease.",
            "description_sw": "Vuna wiki 2-3 baada ya mizabibu kufa. Ponya kivulini kwa wiki 2 kabla ya kuhifadhi. Angalia magonjwa.",
            "day_offset": 100,
            "xp_reward": 15,
            "weather_trigger": "dry_spell",
            "photo_required": true
        }
    ]'::jsonb,
    90,
    45,
    100,
    'medium',
    TRUE
) ON CONFLICT DO NOTHING;

-- =====================================================
-- FUNCTION: Award Mission Completion Rewards
-- =====================================================
CREATE OR REPLACE FUNCTION award_mission_completion_rewards(
    p_user_id UUID,
    p_user_mission_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_mission RECORD;
    v_user_mission RECORD;
    v_badge_id TEXT;
    v_result JSONB;
BEGIN
    -- Get mission and user mission details
    SELECT um.*, sm.name, sm.crop_type, sm.xp_reward, sm.points_reward, sm.badge_id
    INTO v_user_mission
    FROM user_missions um
    JOIN seasonal_missions sm ON sm.id = um.mission_id
    WHERE um.id = p_user_mission_id AND um.user_id = p_user_id;

    IF v_user_mission IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mission not found');
    END IF;

    -- Grant priority market access for 7 days
    UPDATE user_missions
    SET priority_market_access_until = NOW() + INTERVAL '7 days',
        double_referral_points_until = NOW() + INTERVAL '7 days'
    WHERE id = p_user_mission_id;

    -- Create seasonal badge achievement if not exists
    v_badge_id := 'seasonal_' || COALESCE(v_user_mission.crop_type, 'general') || '_master';

    INSERT INTO achievements (id, name, name_sw, description, description_sw, category, xp_reward, icon, criteria)
    VALUES (
        v_badge_id,
        v_user_mission.crop_type || ' Season Master',
        'Bwana wa Msimu wa ' || v_user_mission.crop_type,
        'Completed a full seasonal mission for ' || v_user_mission.crop_type,
        'Imekamilisha misheni kamili ya msimu kwa ' || v_user_mission.crop_type,
        'missions',
        25,
        CASE v_user_mission.crop_type
            WHEN 'maize' THEN '🌽'
            WHEN 'beans' THEN '🫘'
            WHEN 'tomato' THEN '🍅'
            WHEN 'cabbage' THEN '🥬'
            WHEN 'potato' THEN '🥔'
            ELSE '🏆'
        END,
        jsonb_build_object('type', 'mission_complete', 'crop', v_user_mission.crop_type)
    )
    ON CONFLICT (id) DO NOTHING;

    -- Award the badge to user
    INSERT INTO user_achievements (user_id, achievement_id, completed, completed_at)
    VALUES (p_user_id, v_badge_id, true, NOW())
    ON CONFLICT (user_id, achievement_id) DO UPDATE SET completed = true, completed_at = NOW();

    -- Mark badge as awarded
    UPDATE user_missions SET badge_awarded = TRUE WHERE id = p_user_mission_id;

    RETURN jsonb_build_object(
        'success', true,
        'badge_awarded', v_badge_id,
        'priority_market_access', true,
        'double_referral_points', true,
        'expires_in_days', 7
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Check and Trigger Weather-Based Step Reminders
-- =====================================================
CREATE OR REPLACE FUNCTION check_weather_step_triggers(
    p_weather_condition TEXT, -- 'rain_expected', 'dry_spell', 'temperature_high'
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_triggered_steps INTEGER := 0;
    v_step RECORD;
BEGIN
    -- Find steps that match the weather trigger and are pending/in_progress
    FOR v_step IN
        SELECT msp.id, msp.user_mission_id, msp.step_name, um.user_id
        FROM mission_step_progress msp
        JOIN user_missions um ON um.id = msp.user_mission_id
        WHERE msp.weather_trigger = p_weather_condition
        AND msp.status IN ('pending', 'in_progress')
        AND msp.auto_reminded = FALSE
        AND um.status = 'active'
        AND (p_user_id IS NULL OR um.user_id = p_user_id)
    LOOP
        -- Mark step as in_progress if pending
        UPDATE mission_step_progress
        SET status = CASE WHEN status = 'pending' THEN 'in_progress' ELSE status END,
            auto_reminded = TRUE,
            reminder_sent_at = NOW()
        WHERE id = v_step.id;

        v_triggered_steps := v_triggered_steps + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'triggered_steps', v_triggered_steps,
        'weather_condition', p_weather_condition
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Get User's Recommended Missions Based on Fields
-- =====================================================
CREATE OR REPLACE FUNCTION get_recommended_missions(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_field_crops TEXT[];
    v_current_season TEXT;
    v_recommendations JSONB;
BEGIN
    -- Get crops from user's fields
    SELECT ARRAY_AGG(DISTINCT crop_type)
    INTO v_field_crops
    FROM fields
    WHERE user_id = p_user_id AND crop_type IS NOT NULL;

    -- Determine current season based on month
    v_current_season := CASE
        WHEN EXTRACT(MONTH FROM NOW()) IN (3, 4, 5) THEN 'long_rains'
        WHEN EXTRACT(MONTH FROM NOW()) IN (10, 11, 12) THEN 'short_rains'
        ELSE 'dry_season'
    END;

    -- Get matching missions
    SELECT jsonb_agg(jsonb_build_object(
        'id', sm.id,
        'name', sm.name,
        'name_sw', sm.name_sw,
        'crop_type', sm.crop_type,
        'season', sm.season,
        'difficulty', sm.difficulty,
        'xp_reward', sm.xp_reward,
        'points_reward', sm.points_reward,
        'duration_days', sm.duration_days,
        'match_reason', CASE
            WHEN sm.crop_type = ANY(v_field_crops) THEN 'crop_match'
            WHEN sm.season = v_current_season THEN 'season_match'
            WHEN sm.season = 'all' THEN 'general'
            ELSE 'available'
        END
    ))
    INTO v_recommendations
    FROM seasonal_missions sm
    WHERE sm.is_active = TRUE
    AND NOT EXISTS (
        SELECT 1 FROM user_missions um
        WHERE um.user_id = p_user_id
        AND um.mission_id = sm.id
        AND um.status IN ('active', 'completed')
    )
    ORDER BY
        CASE WHEN sm.crop_type = ANY(v_field_crops) THEN 0 ELSE 1 END,
        CASE WHEN sm.season = v_current_season THEN 0 ELSE 1 END;

    RETURN COALESCE(v_recommendations, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Check Double Referral Points Status
-- =====================================================
CREATE OR REPLACE FUNCTION check_double_referral_bonus(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_missions
        WHERE user_id = p_user_id
        AND double_referral_points_until > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Check Priority Market Access
-- =====================================================
CREATE OR REPLACE FUNCTION check_priority_market_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_missions
        WHERE user_id = p_user_id
        AND priority_market_access_until > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UPDATE complete_mission_step to call rewards
-- =====================================================
CREATE OR REPLACE FUNCTION complete_mission_step(
    p_user_mission_id UUID,
    p_step_index INTEGER,
    p_evidence_photo_url TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_mission RECORD;
    v_mission RECORD;
    v_step_xp INTEGER := 10;
    v_completed_steps INTEGER;
    v_new_progress DECIMAL;
    v_rewards_result JSONB;
BEGIN
    -- Get user mission
    SELECT * INTO v_user_mission FROM user_missions WHERE id = p_user_mission_id;
    IF v_user_mission IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mission not found');
    END IF;

    -- Get mission details
    SELECT * INTO v_mission FROM seasonal_missions WHERE id = v_user_mission.mission_id;

    -- Get step XP from mission steps JSON
    SELECT COALESCE((elem->>'xp_reward')::INTEGER, 10) INTO v_step_xp
    FROM jsonb_array_elements(v_mission.steps) WITH ORDINALITY AS t(elem, idx)
    WHERE idx = p_step_index + 1;

    -- Update step progress
    UPDATE mission_step_progress SET
        status = 'completed',
        completed_at = NOW(),
        evidence_photo_url = COALESCE(p_evidence_photo_url, evidence_photo_url),
        notes = COALESCE(p_notes, notes),
        xp_awarded = v_step_xp
    WHERE user_mission_id = p_user_mission_id AND step_index = p_step_index AND status != 'completed';

    -- Award XP for step completion
    PERFORM award_xp(v_user_mission.user_id, 'mission_step', 'Hatua ya misheni imekamilika', v_step_xp, '{}');

    -- If photo evidence provided, award bonus
    IF p_evidence_photo_url IS NOT NULL THEN
        PERFORM award_xp(v_user_mission.user_id, 'photo_evidence', 'Bonasi ya ushahidi wa picha', 5, '{}');
        PERFORM award_points(v_user_mission.user_id, 2, 'photo', p_user_mission_id, 'Photo evidence bonus');
    END IF;

    -- Calculate progress
    SELECT COUNT(*) INTO v_completed_steps FROM mission_step_progress
    WHERE user_mission_id = p_user_mission_id AND status = 'completed';

    v_new_progress := (v_completed_steps::DECIMAL / v_user_mission.total_steps) * 100;

    -- Advance to next step
    UPDATE mission_step_progress SET status = 'in_progress'
    WHERE user_mission_id = p_user_mission_id
    AND step_index = p_step_index + 1
    AND status = 'pending';

    -- Update mission progress
    UPDATE user_missions SET
        current_step = v_completed_steps,
        progress_percentage = v_new_progress,
        xp_earned = xp_earned + v_step_xp
    WHERE id = p_user_mission_id;

    -- Check if mission is complete
    IF v_completed_steps = v_user_mission.total_steps THEN
        UPDATE user_missions SET
            status = 'completed',
            completed_at = NOW(),
            progress_percentage = 100,
            xp_earned = xp_earned + v_mission.xp_reward,
            points_earned = v_mission.points_reward
        WHERE id = p_user_mission_id;

        -- Award completion rewards
        PERFORM award_xp(v_user_mission.user_id, 'mission_complete', 'Misheni imekamilika: ' || v_mission.name, v_mission.xp_reward, '{}');
        PERFORM award_points(v_user_mission.user_id, v_mission.points_reward, 'mission', v_user_mission.mission_id, 'Mission completion reward');

        -- Award special completion rewards (badge, market access, double referrals)
        SELECT award_mission_completion_rewards(v_user_mission.user_id, p_user_mission_id) INTO v_rewards_result;

        -- Recalculate farmer score
        PERFORM calculate_farmer_score(v_user_mission.user_id);

        RETURN jsonb_build_object(
            'success', true,
            'mission_completed', true,
            'xp_awarded', v_step_xp + v_mission.xp_reward,
            'points_awarded', v_mission.points_reward,
            'special_rewards', v_rewards_result
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'mission_completed', false,
        'step_completed', p_step_index,
        'xp_awarded', v_step_xp,
        'new_progress', v_new_progress
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEW: User missions with reward status
-- =====================================================
CREATE OR REPLACE VIEW user_missions_with_rewards AS
SELECT
    um.*,
    sm.name as mission_name,
    sm.name_sw as mission_name_sw,
    sm.description as mission_description,
    sm.crop_type,
    sm.season,
    sm.xp_reward as mission_xp_reward,
    sm.points_reward as mission_points_reward,
    sm.difficulty,
    f.name as field_name,
    um.priority_market_access_until > NOW() as has_priority_market,
    um.double_referral_points_until > NOW() as has_double_referrals,
    CASE
        WHEN um.priority_market_access_until > NOW()
        THEN EXTRACT(EPOCH FROM (um.priority_market_access_until - NOW())) / 86400
        ELSE 0
    END as priority_days_remaining
FROM user_missions um
JOIN seasonal_missions sm ON sm.id = um.mission_id
LEFT JOIN fields f ON f.id = um.field_id;

-- =====================================================
-- Add RLS policies
-- =====================================================
-- Policies already exist from previous migration, just ensure view access
GRANT SELECT ON user_missions_with_rewards TO authenticated;
