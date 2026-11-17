CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cutoff_date DATE NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Master cakes table
CREATE TABLE cakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    shelf_life VARCHAR(100) DEFAULT '7 days in ambient / 14 days refrigerated',
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cake variants (weights, church rates, MRPs, stock)
CREATE TABLE cake_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cake_id UUID REFERENCES cakes(id) ON DELETE CASCADE,
    weight VARCHAR(50) NOT NULL, -- e.g., '350 gms', '500 gms', '700 gms'
    church_rate DECIMAL(10, 2) NOT NULL,
    mrp DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    sku VARCHAR(100) UNIQUE
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    batch_id UUID REFERENCES batches(id),
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    cake_id UUID REFERENCES cakes(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    provider_reference VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    verified_by UUID REFERENCES staff_profiles(id),
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);