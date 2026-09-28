-- Nexora Luxury Fashion Database Schema for Supabase
-- You can run this in the Supabase SQL Editor if you wish to initialize tables manually.

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC NOT NULL,
    original_price NUMERIC,
    image TEXT NOT NULL,
    additional_images TEXT[],
    description TEXT NOT NULL,
    material TEXT NOT NULL,
    sizes TEXT[] DEFAULT ARRAY['XS', 'S', 'M', 'L', 'XL'],
    colors TEXT[] DEFAULT ARRAY['Obsidian', 'Champagne', 'Ivory'],
    in_stock BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    rating NUMERIC DEFAULT 4.9,
    reviews_count INT DEFAULT 12,
    stock_quantity INT DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    shipping_address TEXT NOT NULL,
    items JSONB NOT NULL,
    total_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'Processing',
    payment_method TEXT DEFAULT 'Credit Card / Luxury Concierge',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow public read and write access for client demo operations
CREATE POLICY "Public select access for products" ON products FOR SELECT USING (true);
CREATE POLICY "Public insert access for products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for products" ON products FOR UPDATE USING (true);
CREATE POLICY "Public delete access for products" ON products FOR DELETE USING (true);

CREATE POLICY "Public select access for orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Public insert access for orders" ON orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Public insert for newsletter" ON newsletter_subscribers FOR INSERT WITH CHECK (true);
