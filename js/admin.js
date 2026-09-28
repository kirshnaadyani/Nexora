/**
 * Nexora - Secret Admin Portal Controller
 * Discreet access, password protected, inventory management & Supabase sync
 */

const ADMIN_SECRET_PASS = 'nexora2026';
let isAdminAuthenticated = false;
let currentEditingProductId = null;

// Initialize Admin Handlers
document.addEventListener('DOMContentLoaded', () => {
  initAdminSecretTriggers();
  initAdminEventListeners();
});

// Setup Secret Activation Triggers
function initAdminSecretTriggers() {
  const secretFingerprintBtn = document.getElementById('secretFingerprintBtn');
  const secretHomeDot = document.getElementById('secretHomeDot');
  const secretFooterDot = document.getElementById('secretFooterDot');
  const brandLogoWrap = document.querySelector('.brand-logo-wrap');

  // Trigger 1: Fingerprint icon in navbar / home line
  if (secretFingerprintBtn) {
    secretFingerprintBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openAdminAuthModal();
    });
  }

  // Trigger 1b: Secret dot on home line
  if (secretHomeDot) {
    secretHomeDot.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openAdminAuthModal();
    });
  }

  // Trigger 2: Secret dot in footer
  if (secretFooterDot) {
    secretFooterDot.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openAdminAuthModal();
    });
  }

  // Trigger 3: Triple click on Brand Logo
  let logoClickCount = 0;
  let logoClickTimer = null;
  if (brandLogoWrap) {
    brandLogoWrap.addEventListener('click', (e) => {
      logoClickCount++;
      clearTimeout(logoClickTimer);
      if (logoClickCount >= 3) {
        logoClickCount = 0;
        openAdminAuthModal();
      } else {
        logoClickTimer = setTimeout(() => {
          logoClickCount = 0;
        }, 600);
      }
    });
  }

  // Trigger 4: Keyboard shortcut Ctrl + Shift + A
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      openAdminAuthModal();
    }
  });
}

// Open Password Prompt Modal
function openAdminAuthModal() {
  if (isAdminAuthenticated) {
    openAdminDashboard();
    return;
  }
  const modal = document.getElementById('adminAuthModal');
  const passInput = document.getElementById('adminPasswordInput');
  if (modal) {
    modal.classList.add('active');
    if (passInput) {
      passInput.value = '';
      setTimeout(() => passInput.focus(), 150);
    }
  }
}

function closeAdminAuthModal() {
  const modal = document.getElementById('adminAuthModal');
  if (modal) modal.classList.remove('active');
}

// Open Main Admin Dashboard
async function openAdminDashboard() {
  closeAdminAuthModal();
  const modal = document.getElementById('adminDashboardModal');
  if (modal) {
    modal.classList.add('active');
    await loadAdminDashboardData();
  }
}

function closeAdminDashboard() {
  const modal = document.getElementById('adminDashboardModal');
  if (modal) modal.classList.remove('active');
}

// Admin Event Listeners
function initAdminEventListeners() {
  // Auth Submit
  const authForm = document.getElementById('adminAuthForm');
  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const passInput = document.getElementById('adminPasswordInput');
      const errorMsg = document.getElementById('adminAuthError');
      
      if (passInput && passInput.value === ADMIN_SECRET_PASS) {
        isAdminAuthenticated = true;
        if (errorMsg) errorMsg.style.display = 'none';
        showToast('Secret Atelier Access Granted', 'fa-key');
        openAdminDashboard();
      } else {
        if (errorMsg) {
          errorMsg.style.display = 'block';
          errorMsg.textContent = 'Incorrect Secret Passcode. Access Denied.';
        }
        if (passInput) passInput.value = '';
      }
    });
  }

  // Admin Tab Navigation
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetTab = btn.getAttribute('data-tab');
      document.querySelectorAll('.admin-tab-pane').forEach(p => p.style.display = 'none');
      const activePane = document.getElementById(`admin-tab-${targetTab}`);
      if (activePane) activePane.style.display = 'block';
    });
  });

  // Product Form Save Submit
  const productForm = document.getElementById('adminProductForm');
  if (productForm) {
    productForm.addEventListener('submit', handleProductFormSubmit);
  }

  // Reset / Clear Form
  const resetFormBtn = document.getElementById('btnResetProductForm');
  if (resetFormBtn) {
    resetFormBtn.addEventListener('click', resetProductForm);
  }

  // Direct Supabase Sync / Restore Button
  const syncBtn = document.getElementById('btnAdminSyncSupabase');
  if (syncBtn) {
    syncBtn.addEventListener('click', handleSyncToSupabase);
  }
}

// Load Dashboard Metrics & Inventory
async function loadAdminDashboardData() {
  const products = await window.NexoraDB.getProducts();
  const orders = await window.NexoraDB.getOrders();

  // Metrics
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + (parseInt(p.stock_quantity) || 0), 0);
  const totalValue = products.reduce((sum, p) => sum + ((parseFloat(p.price) || 0) * (parseInt(p.stock_quantity) || 0)), 0);
  const totalOrders = orders.length;

  document.getElementById('metricTotalProducts').textContent = totalProducts;
  document.getElementById('metricTotalStock').textContent = totalStock;
  document.getElementById('metricInventoryValue').textContent = `$${totalValue.toLocaleString()}`;
  document.getElementById('metricTotalOrders').textContent = totalOrders;

  // Render Table
  renderAdminProductsTable(products);
  renderAdminOrdersTable(orders);
}

// Render Products Table
function renderAdminProductsTable(products) {
  const tbody = document.getElementById('adminProductsTableBody');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-muted);">No products found. Add your first luxury garment.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr>
      <td>
        <img src="${p.image}" class="admin-table-img" alt="${p.name}" onerror="this.src='https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=200&q=80'">
      </td>
      <td>
        <strong>${p.name}</strong><br>
        <small style="color: var(--text-muted);">${p.id}</small>
      </td>
      <td><span style="color: var(--accent-gold); font-size: 0.75rem;">${p.category}</span></td>
      <td><strong>$${parseFloat(p.price).toLocaleString()}</strong></td>
      <td>${p.stock_quantity || 1} in stock</td>
      <td>
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${p.in_stock ? 'var(--success)' : 'var(--danger)'}; margin-right:4px;"></span>
        ${p.in_stock ? 'Active' : 'Archived'}
      </td>
      <td>
        <div class="admin-table-actions">
          <button class="admin-action-btn" onclick="editProductInAdmin('${p.id}')"><i class="fas fa-edit"></i> Edit</button>
          <button class="admin-action-btn delete" onclick="deleteProductInAdmin('${p.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Render Orders Table
function renderAdminOrdersTable(orders) {
  const tbody = document.getElementById('adminOrdersTableBody');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">No orders recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong>${o.id}</strong></td>
      <td>${o.customer_name}<br><small style="color:var(--text-muted);">${o.customer_email}</small></td>
      <td>${o.items ? (Array.isArray(o.items) ? o.items.length : 1) : 1} items</td>
      <td><strong style="color:var(--accent-gold);">$${parseFloat(o.total_amount).toLocaleString()}</strong></td>
      <td><span style="color:var(--success); font-size:0.75rem;">● ${o.status || 'Confirmed'}</span></td>
      <td><small style="color:var(--text-muted);">${new Date(o.created_at).toLocaleDateString()}</small></td>
    </tr>
  `).join('');
}

// Handle Add/Edit Product Submission
async function handleProductFormSubmit(e) {
  e.preventDefault();
  
  const idInput = document.getElementById('prodId');
  const nameInput = document.getElementById('prodName');
  const categoryInput = document.getElementById('prodCategory');
  const priceInput = document.getElementById('prodPrice');
  const origPriceInput = document.getElementById('prodOrigPrice');
  const imageInput = document.getElementById('prodImage');
  const descInput = document.getElementById('prodDescription');
  const materialInput = document.getElementById('prodMaterial');
  const sizesInput = document.getElementById('prodSizes');
  const colorsInput = document.getElementById('prodColors');
  const stockInput = document.getElementById('prodStock');
  const featuredInput = document.getElementById('prodFeatured');

  const productId = idInput.value.trim() || `nex-${Date.now().toString().slice(-4)}`;
  
  const productData = {
    id: productId,
    name: nameInput.value.trim(),
    category: categoryInput.value,
    price: parseFloat(priceInput.value),
    original_price: origPriceInput.value ? parseFloat(origPriceInput.value) : null,
    image: imageInput.value.trim() || 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=85',
    additional_images: [imageInput.value.trim()],
    description: descInput.value.trim(),
    material: materialInput.value.trim() || '100% Luxury Atelier Grade',
    sizes: sizesInput.value.split(',').map(s => s.trim()).filter(Boolean),
    colors: colorsInput.value.split(',').map(c => c.trim()).filter(Boolean),
    stock_quantity: parseInt(stockInput.value) || 10,
    in_stock: (parseInt(stockInput.value) || 10) > 0,
    featured: featuredInput.checked,
    rating: 4.95,
    reviews_count: 12,
    created_at: new Date().toISOString()
  };

  await window.NexoraDB.saveProduct(productData);
  showToast(`Product "${productData.name}" saved successfully!`, 'fa-check-circle');

  resetProductForm();
  await loadAdminDashboardData();

  // Refresh Storefront
  if (typeof window.renderStorefront === 'function') {
    await window.renderStorefront();
  }

  // Switch to inventory list tab
  document.querySelector('[data-tab="products"]').click();
}

// Edit Product Helper
async function editProductInAdmin(productId) {
  const products = await window.NexoraDB.getProducts();
  const prod = products.find(p => p.id === productId);
  if (!prod) return;

  currentEditingProductId = productId;
  document.getElementById('prodId').value = prod.id;
  document.getElementById('prodName').value = prod.name;
  document.getElementById('prodCategory').value = prod.category;
  document.getElementById('prodPrice').value = prod.price;
  document.getElementById('prodOrigPrice').value = prod.original_price || '';
  document.getElementById('prodImage').value = prod.image;
  document.getElementById('prodDescription').value = prod.description;
  document.getElementById('prodMaterial').value = prod.material;
  document.getElementById('prodSizes').value = Array.isArray(prod.sizes) ? prod.sizes.join(', ') : 'XS, S, M, L';
  document.getElementById('prodColors').value = Array.isArray(prod.colors) ? prod.colors.join(', ') : 'Obsidian, Champagne';
  document.getElementById('prodStock').value = prod.stock_quantity || 10;
  document.getElementById('prodFeatured').checked = !!prod.featured;

  document.getElementById('adminFormTitle').textContent = `Edit Product: ${prod.name}`;
  document.getElementById('btnSaveProduct').textContent = 'Update Product';

  // Switch to Form tab
  document.querySelector('[data-tab="add-product"]').click();
}

// Delete Product Helper
async function deleteProductInAdmin(productId) {
  if (confirm(`Are you sure you want to delete product "${productId}" from Nexora inventory?`)) {
    await window.NexoraDB.deleteProduct(productId);
    showToast('Product removed from inventory', 'fa-trash');
    await loadAdminDashboardData();
    if (typeof window.renderStorefront === 'function') {
      await window.renderStorefront();
    }
  }
}

// Clear All Products Helper
async function clearAllProductsInAdmin() {
  if (confirm('Are you sure you want to clear all products from the catalog? This will leave the store completely empty until you manually add your own products.')) {
    localStorage.removeItem('nexora_products_cache');
    if (window.supabaseClient) {
      try {
        await window.supabaseClient.from('products').delete().neq('id', '___non_existent___');
      } catch (e) {}
    }
    showToast('All items cleared. Catalog is now completely empty.', 'fa-trash-alt');
    await loadAdminDashboardData();
    if (typeof window.renderStorefront === 'function') {
      await window.renderStorefront();
    }
  }
}

// Reset Form
function resetProductForm() {
  currentEditingProductId = null;
  const form = document.getElementById('adminProductForm');
  if (form) form.reset();
  document.getElementById('prodId').value = '';
  document.getElementById('adminFormTitle').textContent = 'Add New Luxury Garment';
  document.getElementById('btnSaveProduct').textContent = 'Publish to Collection';
}

// Sync to Supabase
async function handleSyncToSupabase() {
  const btn = document.getElementById('btnAdminSyncSupabase') || document.getElementById('btnSyncSupabasePage');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing to Supabase...';
  }

  const products = await window.NexoraDB.getProducts();
  let syncCount = 0;

  for (const item of products) {
    const res = await window.NexoraDB.saveProduct(item);
    if (res.cloud) syncCount++;
  }

  showToast(`Cloud Sync Complete. ${syncCount} products synced to Supabase database.`, 'fa-cloud-upload-alt');

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sync"></i> Sync to Supabase';
  }
}

// Live Supabase Diagnostic & Troubleshooter
async function runSupabaseDiagnostic() {
  const diagOutput = document.getElementById('supabaseDiagOutput');
  const btn = document.getElementById('btnRunSupabaseDiag');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Testing Connection...';
  }

  if (diagOutput) {
    diagOutput.style.display = 'block';
    diagOutput.innerHTML = '<p style="color: var(--accent-gold);"><i class="fas fa-spinner fa-spin"></i> Interrogating Supabase REST endpoints...</p>';
  }

  const report = await window.NexoraDB.testConnection();

  if (diagOutput) {
    let html = `
      <div style="background: #181818; border: 1px solid var(--border-gold); padding: 1.2rem; border-radius: 4px; font-family: monospace; font-size: 0.8rem; color: var(--text-primary);">
        <p><strong>🌐 Supabase Endpoint:</strong> ${report.url}</p>
        <p><strong>📦 Products Found in Supabase:</strong> <span style="color: ${report.foundProducts > 0 ? 'var(--success)' : 'var(--accent-gold)'}; font-weight: bold;">${report.foundProducts} items</span></p>
        
        <div style="margin: 0.8rem 0; padding-top: 0.8rem; border-top: 1px solid var(--border-light);">
          <strong>Table Statuses:</strong>
          <ul style="margin-left: 1.2rem; margin-top: 0.3rem;">
    `;

    for (const [table, res] of Object.entries(report.tablesChecked)) {
      if (res.success) {
        html += `<li style="color: var(--success);"><i class="fas fa-check-circle"></i> Table "<strong>${table}</strong>": Found ${res.count} records</li>`;
      } else {
        html += `<li style="color: var(--danger);"><i class="fas fa-times-circle"></i> Table "<strong>${table}</strong>": ${res.error || 'Access denied / not found'}</li>`;
      }
    }

    html += `
          </ul>
        </div>
    `;

    if (report.foundProducts === 0) {
      html += `
        <div style="margin-top: 1rem; padding: 1rem; background: rgba(212,175,55,0.08); border: 1px solid var(--border-gold); border-radius: 4px;">
          <p style="color: var(--accent-gold-light); font-weight: bold; margin-bottom: 0.4rem;">
            <i class="fas fa-info-circle"></i> Why are products not showing up?
          </p>
          <p style="color: var(--text-secondary); margin-bottom: 0.6rem; font-size: 0.75rem;">
            In Supabase, Row Level Security (RLS) is enabled by default. If your table has RLS enabled without a public SELECT policy, Supabase hides the rows from anonymous visitors.
          </p>
          <p style="font-size: 0.75rem; color: var(--text-primary); margin-bottom: 0.4rem;"><strong>Run this quick 1-line command in your Supabase SQL Editor:</strong></p>
          <pre style="background: #0d0d0d; padding: 0.8rem; border: 1px solid var(--border-light); color: var(--accent-gold); border-radius: 4px; overflow-x: auto; user-select: all;">ALTER TABLE products DISABLE ROW LEVEL SECURITY;</pre>
        </div>
      `;
    } else {
      html += `
        <div style="margin-top: 0.8rem; padding: 0.6rem; background: rgba(78,186,135,0.1); border: 1px solid var(--success); border-radius: 4px; color: var(--success);">
          <i class="fas fa-check-circle"></i> Successfully loaded ${report.foundProducts} live products from Supabase!
        </div>
      `;
    }

    html += `</div>`;
    diagOutput.innerHTML = html;
  }

  // Refresh Storefront
  if (typeof window.renderStorefront === 'function') {
    await window.renderStorefront();
  }
  await loadAdminDashboardData();

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-vial"></i> Test & Refresh Supabase';
  }
}

window.openAdminAuthModal = openAdminAuthModal;
window.closeAdminAuthModal = closeAdminAuthModal;
window.openAdminDashboard = openAdminDashboard;
window.closeAdminDashboard = closeAdminDashboard;
window.editProductInAdmin = editProductInAdmin;
window.deleteProductInAdmin = deleteProductInAdmin;
window.clearAllProductsInAdmin = clearAllProductsInAdmin;
window.handleSyncToSupabase = handleSyncToSupabase;
window.runSupabaseDiagnostic = runSupabaseDiagnostic;

