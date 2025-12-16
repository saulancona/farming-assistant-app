-- Orders Schema for AgroAfrica B2B Marketplace
-- This creates the infrastructure for order management, tracking, and subscriptions

-- ==========================================
-- Orders Table
-- ==========================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE, -- Human-readable e.g., "AGR-2024-000001"

  -- Buyer Information
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  buyer_email TEXT,

  -- Delivery Details
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('pickup', 'delivery')),
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_region TEXT,
  delivery_country TEXT DEFAULT 'Kenya',
  delivery_coordinates JSONB, -- {lat: number, lng: number}
  delivery_date DATE,
  delivery_time_slot TEXT,
  delivery_instructions TEXT,

  -- Pricing
  subtotal DECIMAL(12,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  service_fee DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,

  -- Payment
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mpesa', 'bank_transfer', 'cash_on_delivery', 'credit')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_reference TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Order Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),

  -- Notes
  buyer_notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);

-- ==========================================
-- Order Items Table
-- ==========================================

CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE SET NULL,

  -- Seller Information
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_name TEXT NOT NULL,
  seller_phone TEXT,
  seller_whatsapp TEXT,

  -- Product Information (snapshot at time of order)
  product_name TEXT NOT NULL,
  variety TEXT,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  price_per_unit DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,

  -- Item Status (for multi-seller orders)
  item_status TEXT NOT NULL DEFAULT 'pending' CHECK (item_status IN ('pending', 'confirmed', 'preparing', 'ready', 'shipped', 'delivered', 'cancelled')),
  seller_notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for order items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_id ON order_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_items_listing_id ON order_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item_status ON order_items(item_status);

-- ==========================================
-- Order Status History Table
-- ==========================================

CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for status history
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);

-- ==========================================
-- Subscriptions Table (for recurring orders)
-- ==========================================

CREATE TABLE IF NOT EXISTS order_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Subscription Details
  name TEXT NOT NULL, -- e.g., "Weekly Vegetables"

  -- Schedule
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 28),
  preferred_time_slot TEXT,

  -- Delivery (same as orders)
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('pickup', 'delivery')),
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_region TEXT,
  delivery_country TEXT DEFAULT 'Kenya',
  delivery_instructions TEXT,

  -- Payment
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mpesa', 'bank_transfer', 'cash_on_delivery', 'credit')),

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  next_order_date DATE,
  last_order_date DATE,
  total_orders_placed INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paused_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Index for subscriptions
CREATE INDEX IF NOT EXISTS idx_order_subscriptions_buyer_id ON order_subscriptions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_order_subscriptions_status ON order_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_order_subscriptions_next_order_date ON order_subscriptions(next_order_date);

-- ==========================================
-- Subscription Items Table
-- ==========================================

CREATE TABLE IF NOT EXISTS subscription_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES order_subscriptions(id) ON DELETE CASCADE,

  -- Preferred Seller (optional)
  preferred_seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Product Preferences
  category_id TEXT,
  subcategory_id TEXT,
  product_name TEXT NOT NULL,
  variety TEXT,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  max_price_per_unit DECIMAL(10,2), -- Maximum price willing to pay
  quality_preference TEXT CHECK (quality_preference IN ('premium', 'grade_a', 'grade_b', 'standard', 'any')),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for subscription items
CREATE INDEX IF NOT EXISTS idx_subscription_items_subscription_id ON subscription_items(subscription_id);

-- ==========================================
-- Enable Row Level Security
-- ==========================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_items ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS Policies for Orders
-- ==========================================

-- Buyers can view their own orders
CREATE POLICY "Buyers can view their own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

-- Buyers can create orders
CREATE POLICY "Buyers can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- Buyers can update their own orders (limited - mainly for cancellation)
CREATE POLICY "Buyers can update their own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- ==========================================
-- RLS Policies for Order Items
-- ==========================================

-- Buyers can view items in their orders
CREATE POLICY "Buyers can view their order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    order_id IN (SELECT id FROM orders WHERE buyer_id = auth.uid())
  );

-- Sellers can view items they need to fulfill
CREATE POLICY "Sellers can view their order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

-- Buyers can create order items (through order creation)
CREATE POLICY "Buyers can create order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE buyer_id = auth.uid())
  );

-- Sellers can update their order items (status, notes)
CREATE POLICY "Sellers can update their order items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- ==========================================
-- RLS Policies for Order Status History
-- ==========================================

-- Anyone involved can view status history
CREATE POLICY "Users can view order status history"
  ON order_status_history FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE buyer_id = auth.uid()
      UNION
      SELECT order_id FROM order_items WHERE seller_id = auth.uid()
    )
  );

-- Authenticated users can add status history
CREATE POLICY "Users can add order status history"
  ON order_status_history FOR INSERT
  TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- ==========================================
-- RLS Policies for Subscriptions
-- ==========================================

-- Buyers can view their own subscriptions
CREATE POLICY "Buyers can view their own subscriptions"
  ON order_subscriptions FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

-- Buyers can create subscriptions
CREATE POLICY "Buyers can create subscriptions"
  ON order_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid());

-- Buyers can update their own subscriptions
CREATE POLICY "Buyers can update their own subscriptions"
  ON order_subscriptions FOR UPDATE
  TO authenticated
  USING (buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());

-- Buyers can delete their own subscriptions
CREATE POLICY "Buyers can delete their own subscriptions"
  ON order_subscriptions FOR DELETE
  TO authenticated
  USING (buyer_id = auth.uid());

-- ==========================================
-- RLS Policies for Subscription Items
-- ==========================================

-- Buyers can view their subscription items
CREATE POLICY "Buyers can view their subscription items"
  ON subscription_items FOR SELECT
  TO authenticated
  USING (
    subscription_id IN (SELECT id FROM order_subscriptions WHERE buyer_id = auth.uid())
  );

-- Buyers can manage their subscription items
CREATE POLICY "Buyers can create subscription items"
  ON subscription_items FOR INSERT
  TO authenticated
  WITH CHECK (
    subscription_id IN (SELECT id FROM order_subscriptions WHERE buyer_id = auth.uid())
  );

CREATE POLICY "Buyers can update subscription items"
  ON subscription_items FOR UPDATE
  TO authenticated
  USING (
    subscription_id IN (SELECT id FROM order_subscriptions WHERE buyer_id = auth.uid())
  );

CREATE POLICY "Buyers can delete subscription items"
  ON subscription_items FOR DELETE
  TO authenticated
  USING (
    subscription_id IN (SELECT id FROM order_subscriptions WHERE buyer_id = auth.uid())
  );

-- ==========================================
-- Functions
-- ==========================================

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  new_order_number TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(order_number FROM 10) AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM orders
  WHERE order_number LIKE 'AGR-' || year_part || '-%';

  new_order_number := 'AGR-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');

  RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_timestamp();

DROP TRIGGER IF EXISTS order_items_updated_at ON order_items;
CREATE TRIGGER order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_timestamp();

DROP TRIGGER IF EXISTS order_subscriptions_updated_at ON order_subscriptions;
CREATE TRIGGER order_subscriptions_updated_at
  BEFORE UPDATE ON order_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_order_timestamp();

DROP TRIGGER IF EXISTS subscription_items_updated_at ON subscription_items;
CREATE TRIGGER subscription_items_updated_at
  BEFORE UPDATE ON subscription_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_timestamp();

-- Function to update order status with history
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Update the order status
  UPDATE orders
  SET
    status = p_new_status,
    confirmed_at = CASE WHEN p_new_status = 'confirmed' THEN NOW() ELSE confirmed_at END,
    shipped_at = CASE WHEN p_new_status = 'shipped' THEN NOW() ELSE shipped_at END,
    delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
    cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END
  WHERE id = p_order_id;

  -- Add to status history
  INSERT INTO order_status_history (order_id, status, note, changed_by)
  VALUES (p_order_id, p_new_status, p_note, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_order_status(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_order_number() TO authenticated;
