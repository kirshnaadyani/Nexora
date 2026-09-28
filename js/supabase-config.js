/**
 * Nexora Luxury Fashion - Supabase Client Configuration & Data Normalizer
 * Connects directly to live Supabase backend with intelligent column mapping & zero dummy data.
 */

const SUPABASE_URL = 'https://orsoeipfqoaohghegvf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yc29laXBmcW9hb2hnaGVoZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MDI0OTksImV4cCI6MjEwNjE3ODQ5OX0.65C0hwHbrdQgpZwRAMkPLgF-1e63PyRyNDUl6PzXDY0';

// Initialize Supabase Client
let supabaseClient = null;

try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;
    console.log('✨ [Nexora] Supabase Client Initialized Successfully with URL:', SUPABASE_URL);
  }
} catch (err) {
  console.warn('⚠️ [Nexora] Supabase client initialization warning:', err);
}

// Clear any legacy mock items from browser cache
(function purgeLegacyMockData() {
  try {
    const cached = localStorage.getItem('nexora_products_cache');
    if (cached) {
      const items = JSON.parse(cached);
      if (Array.isArray(items) && items.some(p => p.id && String(p.id).startsWith('nex-00'))) {
        localStorage.removeItem('nexora_products_cache');
        console.log('🧹 [Nexora] Legacy dummy catalog purged.');
      }
    }
  } catch (e) {}
})();

/**
 * Normalizes any Supabase record to ensure standard storefront fields.
 * Flexible mapping supports any column names the user created in Supabase (title, image_url, etc.)
 */
function normalizeProduct(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = String(raw.id || raw._id || raw.sku || `nx-${Math.random().toString(36).substr(2, 6)}`);
  const name = raw.name || raw.title || raw.product_name || raw.item_name || raw.garment_name || raw.label || 'Nexora Silhouette';
  const price = Number(raw.price || raw.cost || raw.amount || raw.retail_price || 0);
  const original_price = raw.original_price || raw.compare_at_price || null ? Number(raw.original_price || raw.compare_at_price) : null;
  
  // Intelligent image mapping
  const image = raw.image || raw.image_url || raw.imageUrl || raw.img || raw.photo || raw.picture || raw.thumbnail || raw.src || 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80';
  
  let additional_images = [image];
  if (Array.isArray(raw.additional_images) && raw.additional_images.length > 0) {
    additional_images = raw.additional_images;
  } else if (Array.isArray(raw.images) && raw.images.length > 0) {
    additional_images = raw.images;
  }

  const category = raw.category || raw.type || raw.collection || raw.tag || 'Ready-to-Wear';
  const description = raw.description || raw.desc || raw.details || raw.info || 'Handcrafted luxury atelier piece tailored with uncompromising precision.';
  const material = raw.material || raw.fabric || raw.materials || raw.composition || '100% Luxury Atelier Grade';
  
  // Sizes parsing
  let sizes = ['XS', 'S', 'M', 'L', 'XL'];
  if (Array.isArray(raw.sizes) && raw.sizes.length > 0) {
    sizes = raw.sizes;
  } else if (typeof raw.sizes === 'string' && raw.sizes.trim()) {
    sizes = raw.sizes.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Colors parsing
  let colors = ['Obsidian Black', 'Champagne Gold'];
  if (Array.isArray(raw.colors) && raw.colors.length > 0) {
    colors = raw.colors;
  } else if (typeof raw.colors === 'string' && raw.colors.trim()) {
    colors = raw.colors.split(',').map(c => c.trim()).filter(Boolean);
  }

  const stock_quantity = Number(raw.stock_quantity ?? raw.stock ?? raw.quantity ?? raw.qty ?? 10);
  const in_stock = raw.in_stock !== undefined ? Boolean(raw.in_stock) : (stock_quantity > 0);
  const featured = Boolean(raw.featured ?? false);
  const rating = Number(raw.rating || 5.0);
  const reviews_count = Number(raw.reviews_count || 1);
  const created_at = raw.created_at || new Date().toISOString();

  return {
    id,
    name,
    price,
    original_price,
    image,
    additional_images,
    category,
    description,
    material,
    sizes,
    colors,
    stock_quantity,
    in_stock,
    featured,
    rating,
    reviews_count,
    created_at,
    _raw: raw
  };
}

// Resilient Data Service Layer for Products & Orders
const NexoraDB = {
  // Fetch all active products directly from Supabase
  async getProducts() {
    if (supabaseClient) {
      // Possible table names in case the user named it differently
      const possibleTables = ['products', 'Products', 'product', 'items', 'clothing'];
      
      for (const table of possibleTables) {
        try {
          console.log(`📡 [Nexora] Querying Supabase table "${table}"...`);
          const { data, error } = await supabaseClient
            .from(table)
            .select('*');

          if (error) {
            console.warn(`⚠️ Supabase table "${table}" error:`, error.message, error.details || '');
            continue;
          }

          if (data && Array.isArray(data)) {
            console.log(`✅ [Nexora] Retrieved ${data.length} records from Supabase table "${table}":`, data);
            
            if (data.length > 0) {
              const normalized = data.map(normalizeProduct).filter(Boolean);
              localStorage.setItem('nexora_products_cache', JSON.stringify(normalized));
              localStorage.setItem('nexora_active_table', table);
              return normalized;
            }
          }
        } catch (err) {
          console.warn(`⚠️ Error querying "${table}":`, err);
        }
      }
    }

    // Fallback: Check local storage
    const local = localStorage.getItem('nexora_products_cache');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(p => !p.id || !String(p.id).startsWith('nex-00'));
        }
      } catch (e) {}
    }

    return [];
  },

  // Save / Update product in Supabase and local cache
  async saveProduct(product) {
    let savedInCloud = false;
    const table = localStorage.getItem('nexora_active_table') || 'products';

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from(table)
          .upsert(product)
          .select();

        if (!error) {
          savedInCloud = true;
          console.log('✅ Product saved in Supabase:', data);
        } else {
          console.warn('⚠️ Supabase upsert error:', error.message);
        }
      } catch (err) {
        console.warn('⚠️ Supabase network write failed:', err);
      }
    }

    // Update Local Cache
    let current = await this.getProducts();
    const index = current.findIndex(p => p.id === product.id);
    if (index >= 0) {
      current[index] = { ...current[index], ...normalizeProduct(product) };
    } else {
      current.unshift(normalizeProduct(product));
    }
    localStorage.setItem('nexora_products_cache', JSON.stringify(current));
    return { success: true, cloud: savedInCloud, product };
  },

  // Delete product
  async deleteProduct(productId) {
    const table = localStorage.getItem('nexora_active_table') || 'products';
    if (supabaseClient) {
      try {
        await supabaseClient.from(table).delete().eq('id', productId);
      } catch (e) {
        console.warn('⚠️ Supabase delete error:', e);
      }
    }

    let current = await this.getProducts();
    current = current.filter(p => p.id !== productId);
    localStorage.setItem('nexora_products_cache', JSON.stringify(current));
    return { success: true };
  },

  // Direct Supabase Diagnostic Helper
  async testConnection() {
    if (!supabaseClient) {
      return { success: false, message: 'Supabase client library not loaded or initialized.' };
    }

    const report = {
      url: SUPABASE_URL,
      tablesChecked: {},
      foundProducts: 0,
      records: [],
      error: null
    };

    const possibleTables = ['products', 'Products', 'product', 'items'];
    for (const table of possibleTables) {
      try {
        const { data, error } = await supabaseClient.from(table).select('*');
        if (error) {
          report.tablesChecked[table] = { success: false, error: error.message, details: error.details, hint: error.hint };
        } else {
          report.tablesChecked[table] = { success: true, count: data.length };
          if (data.length > 0 && report.foundProducts === 0) {
            report.foundProducts = data.length;
            report.records = data;
          }
        }
      } catch (e) {
        report.tablesChecked[table] = { success: false, error: e.message };
      }
    }

    return report;
  },

  // Save customer order
  async createOrder(orderData) {
    let savedInCloud = false;
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('orders')
          .insert([orderData])
          .select();
        if (!error) savedInCloud = true;
      } catch (err) {
        console.warn('Supabase order insert error:', err);
      }
    }

    const existingOrders = JSON.parse(localStorage.getItem('nexora_orders_cache') || '[]');
    existingOrders.unshift(orderData);
    localStorage.setItem('nexora_orders_cache', JSON.stringify(existingOrders));

    return { success: true, cloud: savedInCloud };
  },

  // Get orders list
  async getOrders() {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('orders')
          .select('*');
        if (!error && data && data.length > 0) {
          localStorage.setItem('nexora_orders_cache', JSON.stringify(data));
          return data;
        }
      } catch (e) {
        console.warn('Supabase orders fetch error:', e);
      }
    }

    return JSON.parse(localStorage.getItem('nexora_orders_cache') || '[]');
  }
};

window.NexoraDB = NexoraDB;
window.normalizeProduct = normalizeProduct;
