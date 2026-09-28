/**
 * Nexora Luxury Fashion - Storefront Application Engine
 * Catalog rendering, Cart, Wishlist, Quick View, Search & Checkout
 */

let allProducts = [];
let currentCategory = 'all';
let currentSearchQuery = '';
let currentSort = 'featured';

let cart = JSON.parse(localStorage.getItem('nexora_cart') || '[]');
let wishlist = JSON.parse(localStorage.getItem('nexora_wishlist') || '[]');
let activeQuickViewProduct = null;
let selectedSize = null;
let selectedColor = null;
let discountPercent = 0;

// Initialize Storefront
document.addEventListener('DOMContentLoaded', async () => {
  await renderStorefront();
  initStorefrontListeners();
  updateCartUI();
  updateWishlistUI();
});

// Load and Render Storefront Catalog
async function renderStorefront() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 4rem 0; color: var(--text-muted);">
      <i class="fas fa-circle-notch fa-spin fa-2x" style="color: var(--accent-gold); margin-bottom: 1rem;"></i>
      <p style="letter-spacing: 0.15em; text-transform: uppercase; font-size: 0.8rem;">Loading Atelier Collection...</p>
    </div>
  `;

  allProducts = await window.NexoraDB.getProducts();

  // Filter Products
  let filtered = [...allProducts];

  if (currentCategory !== 'all') {
    filtered = filtered.filter(p => p.category.toLowerCase() === currentCategory.toLowerCase());
  }

  if (currentSearchQuery) {
    const q = currentSearchQuery.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q) || 
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.material && p.material.toLowerCase().includes(q))
    );
  }

  // Sort Products
  if (currentSort === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (currentSort === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (currentSort === 'rating') {
    filtered.sort((a, b) => (b.rating || 5) - (a.rating || 5));
  } else {
    // Featured / Newest
    filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }

  if (filtered.length === 0) {
    const isTotalEmpty = allProducts.length === 0;
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 5rem 1rem; color: var(--text-muted); background: var(--bg-card); border: 1px dashed var(--border-gold); border-radius: var(--radius-md);">
        <i class="fas ${isTotalEmpty ? 'fa-fingerprint' : 'fa-search'} fa-2x" style="color: var(--accent-gold); margin-bottom: 1rem;"></i>
        <h4 style="font-family: var(--font-display); font-size: 1.25rem; color: var(--text-primary); margin-bottom: 0.6rem;">
          ${isTotalEmpty ? 'Atelier Collection Awaiting Publication' : 'No Silhouettes Match Your Criteria'}
        </h4>
        <p style="font-size: 0.85rem; max-width: 480px; margin: 0 auto 1.5rem auto; line-height: 1.6;">
          ${isTotalEmpty ? 'The catalog is clean with zero dummy data. Click the fingerprint icon in the top navbar or open admin.html to add your authentic luxury garments.' : 'Try adjusting your category filter or search query.'}
        </p>
        ${isTotalEmpty ? `
          <button onclick="openAdminAuthModal()" class="btn-luxury-outline" style="font-size: 0.75rem; padding: 0.8rem 1.6rem;">
            <i class="fas fa-plus"></i> Open Atelier Admin
          </button>
        ` : ''}
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(product => `
    <article class="product-card" data-id="${product.id}">
      <div class="product-image-wrap">
        ${product.featured ? `<span class="product-badge">Atelier Capsule</span>` : ''}
        <img src="${product.image}" class="product-image" alt="${product.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80'">
        
        <div class="product-card-actions">
          <button class="card-action-btn" title="Add to Wishlist" onclick="toggleWishlist('${product.id}')">
            <i class="${isItemInWishlist(product.id) ? 'fas fa-heart' : 'far fa-heart'}" style="${isItemInWishlist(product.id) ? 'color: var(--accent-gold)' : ''}"></i>
          </button>
          <button class="card-action-btn" title="Quick View" onclick="openQuickView('${product.id}')">
            <i class="far fa-eye"></i>
          </button>
        </div>

        <button class="quick-view-overlay-btn" onclick="openQuickView('${product.id}')">
          <i class="fas fa-magnifying-glass" style="margin-right: 6px;"></i> Explore Piece
        </button>
      </div>

      <div class="product-details">
        <span class="product-category">${product.category}</span>
        <h3 class="product-title" onclick="openQuickView('${product.id}')" style="cursor: pointer;">${product.name}</h3>
        <p class="product-material-snippet">${product.material || 'Luxury Grade Fabrication'}</p>
        
        <div class="product-bottom-row">
          <div class="product-pricing">
            <span class="current-price">$${parseFloat(product.price).toLocaleString()}</span>
            ${product.original_price ? `<span class="original-price">$${parseFloat(product.original_price).toLocaleString()}</span>` : ''}
          </div>
          <button class="btn-card-add" onclick="quickAddToCart('${product.id}')">
            + Quick Add
          </button>
        </div>
      </div>
    </article>
  `).join('');
}

// Event Listeners for Filters, Search & Drawers
function initStorefrontListeners() {
  // Category Pills
  const categoryPills = document.querySelectorAll('.category-pill');
  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      categoryPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCategory = pill.getAttribute('data-category');
      renderStorefront();
    });
  });

  // Search Input
  const searchInput = document.getElementById('catalogSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.trim();
      renderStorefront();
    });
  }

  // Sort Select
  const sortSelect = document.getElementById('catalogSortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderStorefront();
    });
  }

  // Drawer Triggers
  const openCartBtn = document.getElementById('openCartBtn');
  const openWishlistBtn = document.getElementById('openWishlistBtn');
  const closeCartBtn = document.getElementById('closeCartBtn');
  const closeWishlistBtn = document.getElementById('closeWishlistBtn');
  const drawerOverlay = document.getElementById('drawerOverlay');

  if (openCartBtn) openCartBtn.addEventListener('click', openCartDrawer);
  if (openWishlistBtn) openWishlistBtn.addEventListener('click', openWishlistDrawer);
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeAllDrawers);
  if (closeWishlistBtn) closeWishlistBtn.addEventListener('click', closeAllDrawers);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeAllDrawers);

  // Quick View Modal Close
  const closeQuickViewBtn = document.getElementById('closeQuickViewBtn');
  const quickViewModal = document.getElementById('quickViewModal');
  if (closeQuickViewBtn) closeQuickViewBtn.addEventListener('click', closeQuickView);
  if (quickViewModal) {
    quickViewModal.addEventListener('click', (e) => {
      if (e.target === quickViewModal) closeQuickView();
    });
  }

  // Checkout Modal
  const checkoutBtn = document.getElementById('btnOpenCheckout');
  const checkoutModal = document.getElementById('checkoutModal');
  const closeCheckoutBtn = document.getElementById('closeCheckoutBtn');
  const checkoutForm = document.getElementById('checkoutForm');

  if (checkoutBtn) checkoutBtn.addEventListener('click', openCheckoutModal);
  if (closeCheckoutBtn) closeCheckoutBtn.addEventListener('click', closeCheckoutModal);
  if (checkoutForm) checkoutForm.addEventListener('submit', handleCheckoutSubmit);

  // Promo Code
  const applyPromoBtn = document.getElementById('btnApplyPromo');
  if (applyPromoBtn) {
    applyPromoBtn.addEventListener('click', applyPromoCode);
  }

  // Newsletter Form
  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('newsletterEmail');
      if (emailInput && emailInput.value) {
        await window.NexoraDB.subscribeNewsletter(emailInput.value);
        showToast('Welcome to Nexora Haute Couture Privé list', 'fa-envelope-open-text');
        emailInput.value = '';
      }
    });
  }

  // Navbar Scroll Shadow
  window.addEventListener('scroll', () => {
    const nav = document.querySelector('.navbar');
    if (window.scrollY > 40) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });
}

/* ==========================================================================
   CART ENGINE
   ========================================================================== */

function quickAddToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const defaultSize = (product.sizes && product.sizes.length > 0) ? product.sizes[0] : 'Standard';
  const defaultColor = (product.colors && product.colors.length > 0) ? product.colors[0] : 'Obsidian';

  addToCart(product, defaultSize, defaultColor, 1);
  showToast(`Added "${product.name}" to Atelier Bag`, 'fa-shopping-bag');
  openCartDrawer();
}

function addToCart(product, size, color, quantity = 1) {
  const existingIndex = cart.findIndex(item => 
    item.id === product.id && item.selectedSize === size && item.selectedColor === color
  );

  if (existingIndex >= 0) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      selectedSize: size,
      selectedColor: color,
      quantity: quantity
    });
  }

  saveCart();
  updateCartUI();
}

function updateCartItemQty(index, change) {
  if (cart[index]) {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) {
      cart.splice(index, 1);
    }
    saveCart();
    updateCartUI();
  }
}

function removeCartItem(index) {
  cart.splice(index, 1);
  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem('nexora_cart', JSON.stringify(cart));
}

function updateCartUI() {
  const countBadges = document.querySelectorAll('.cart-count-badge');
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  countBadges.forEach(b => b.textContent = totalCount);

  const cartList = document.getElementById('cartDrawerItems');
  const cartSubtotalEl = document.getElementById('cartSubtotal');
  const cartFooter = document.getElementById('cartDrawerFooter');

  if (!cartList) return;

  if (cart.length === 0) {
    cartList.innerHTML = `
      <div class="drawer-empty-state">
        <i class="fas fa-shopping-bag"></i>
        <h4 style="font-family: var(--font-display); font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.5rem;">Your Atelier Bag is Empty</h4>
        <p style="font-size: 0.8rem;">Explore the capsule collection and discover exceptional couture.</p>
      </div>
    `;
    if (cartFooter) cartFooter.style.display = 'none';
    return;
  }

  if (cartFooter) cartFooter.style.display = 'block';

  let subtotal = 0;
  cartList.innerHTML = cart.map((item, index) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    return `
      <div class="cart-item">
        <img src="${item.image}" class="cart-item-img" alt="${item.name}">
        <div class="cart-item-info">
          <div>
            <h4 class="cart-item-name">${item.name}</h4>
            <p class="cart-item-meta">${item.selectedSize} · ${item.selectedColor}</p>
          </div>
          <div class="cart-item-controls">
            <div class="qty-stepper">
              <button class="qty-btn" onclick="updateCartItemQty(${index}, -1)">−</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn" onclick="updateCartItemQty(${index}, 1)">+</button>
            </div>
            <span class="cart-item-price">$${itemTotal.toLocaleString()}</span>
            <button class="cart-item-remove" onclick="removeCartItem(${index})" title="Remove"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (discountPercent > 0) {
    const discountAmount = (subtotal * discountPercent) / 100;
    subtotal = subtotal - discountAmount;
  }

  if (cartSubtotalEl) {
    cartSubtotalEl.textContent = `$${subtotal.toLocaleString()}`;
  }
}

function applyPromoCode() {
  const codeInput = document.getElementById('promoCodeInput');
  if (!codeInput) return;

  const code = codeInput.value.trim().toUpperCase();
  if (code === 'NEXORA10' || code === 'VIPCOUTURE') {
    discountPercent = 10;
    showToast('VIP Privilege Applied: 10% Off Your Couture Selection', 'fa-percent');
    updateCartUI();
  } else {
    showToast('Invalid VIP code. Try "NEXORA10"', 'fa-times-circle');
  }
}

/* ==========================================================================
   WISHLIST ENGINE
   ========================================================================== */

function toggleWishlist(productId) {
  const index = wishlist.indexOf(productId);
  if (index >= 0) {
    wishlist.splice(index, 1);
    showToast('Removed piece from your Wishlist', 'fa-heart-broken');
  } else {
    wishlist.push(productId);
    showToast('Added piece to your Private Wishlist', 'fa-heart');
  }
  localStorage.setItem('nexora_wishlist', JSON.stringify(wishlist));
  updateWishlistUI();
  renderStorefront();
}

function isItemInWishlist(productId) {
  return wishlist.includes(productId);
}

function updateWishlistUI() {
  const countBadges = document.querySelectorAll('.wishlist-count-badge');
  countBadges.forEach(b => b.textContent = wishlist.length);

  const wishlistBody = document.getElementById('wishlistDrawerItems');
  if (!wishlistBody) return;

  if (wishlist.length === 0) {
    wishlistBody.innerHTML = `
      <div class="drawer-empty-state">
        <i class="far fa-heart"></i>
        <h4 style="font-family: var(--font-display); font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.5rem;">Your Wishlist is Empty</h4>
        <p style="font-size: 0.8rem;">Save your favorite couture garments to view them anytime.</p>
      </div>
    `;
    return;
  }

  const wishlistProducts = allProducts.filter(p => wishlist.includes(p.id));
  wishlistBody.innerHTML = wishlistProducts.map(p => `
    <div class="cart-item">
      <img src="${p.image}" class="cart-item-img" alt="${p.name}">
      <div class="cart-item-info">
        <div>
          <h4 class="cart-item-name">${p.name}</h4>
          <p class="cart-item-meta">${p.category}</p>
        </div>
        <div class="cart-item-controls">
          <span class="cart-item-price">$${parseFloat(p.price).toLocaleString()}</span>
          <button class="btn-card-add" onclick="quickAddToCart('${p.id}')">Add to Bag</button>
          <button class="cart-item-remove" onclick="toggleWishlist('${p.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   QUICK VIEW MODAL
   ========================================================================== */

function openQuickView(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  activeQuickViewProduct = product;
  const modal = document.getElementById('quickViewModal');

  // Populate data
  document.getElementById('qvMainImg').src = product.image;
  document.getElementById('qvCategory').textContent = product.category;
  document.getElementById('qvTitle').textContent = product.name;
  document.getElementById('qvPrice').textContent = `$${parseFloat(product.price).toLocaleString()}`;
  document.getElementById('qvDescription').textContent = product.description;
  document.getElementById('qvMaterial').textContent = product.material || '100% Fine Tailoring Fabrication';
  document.getElementById('qvStock').textContent = `${product.stock_quantity || 8} pieces remaining in atelier`;

  // Gallery Thumbs
  const thumbsContainer = document.getElementById('qvThumbs');
  const allImages = [product.image, ...(product.additional_images || [])];
  thumbsContainer.innerHTML = allImages.map((img, i) => `
    <img src="${img}" class="modal-thumb ${i === 0 ? 'active' : ''}" onclick="changeQuickViewImage('${img}', this)">
  `).join('');

  // Sizes
  const sizesContainer = document.getElementById('qvSizes');
  const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : ['XS', 'S', 'M', 'L'];
  selectedSize = sizes[0];
  sizesContainer.innerHTML = sizes.map((s, i) => `
    <button class="size-btn ${i === 0 ? 'active' : ''}" onclick="selectQuickViewSize('${s}', this)">${s}</button>
  `).join('');

  // Colors
  const colorsContainer = document.getElementById('qvColors');
  const colors = product.colors && product.colors.length > 0 ? product.colors : ['Obsidian Black', 'Champagne Gold'];
  selectedColor = colors[0];
  colorsContainer.innerHTML = colors.map((c, i) => `
    <button class="size-btn ${i === 0 ? 'active' : ''}" onclick="selectQuickViewColor('${c}', this)">${c}</button>
  `).join('');

  modal.classList.add('active');
}

function changeQuickViewImage(imgUrl, thumbEl) {
  document.getElementById('qvMainImg').src = imgUrl;
  document.querySelectorAll('.modal-thumb').forEach(t => t.classList.remove('active'));
  if (thumbEl) thumbEl.classList.add('active');
}

function selectQuickViewSize(size, btnEl) {
  selectedSize = size;
  document.querySelectorAll('#qvSizes .size-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
}

function selectQuickViewColor(color, btnEl) {
  selectedColor = color;
  document.querySelectorAll('#qvColors .size-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
}

function addQuickViewToCart() {
  if (!activeQuickViewProduct) return;
  addToCart(activeQuickViewProduct, selectedSize, selectedColor, 1);
  showToast(`Added ${activeQuickViewProduct.name} (${selectedSize} / ${selectedColor}) to Bag`, 'fa-shopping-bag');
  closeQuickView();
  openCartDrawer();
}

function closeQuickView() {
  const modal = document.getElementById('quickViewModal');
  if (modal) modal.classList.remove('active');
}

/* ==========================================================================
   CHECKOUT ENGINE
   ========================================================================== */

function openCheckoutModal() {
  if (cart.length === 0) {
    showToast('Your Atelier bag is empty', 'fa-info-circle');
    return;
  }
  closeAllDrawers();
  const modal = document.getElementById('checkoutModal');
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const finalTotal = discountPercent > 0 ? subtotal * (1 - discountPercent / 100) : subtotal;

  document.getElementById('checkoutItemsCount').textContent = `${cart.length} unique pieces`;
  document.getElementById('checkoutTotalAmount').textContent = `$${finalTotal.toLocaleString()}`;
  if (modal) modal.classList.add('active');
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkoutModal');
  if (modal) modal.classList.remove('active');
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('custName').value.trim();
  const email = document.getElementById('custEmail').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const city = document.getElementById('custCity').value.trim();

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalAmount = discountPercent > 0 ? subtotal * (1 - discountPercent / 100) : subtotal;

  const orderData = {
    id: `NX-ORD-${Date.now().toString().slice(-6)}`,
    customer_name: name,
    customer_email: email,
    customer_phone: phone,
    shipping_address: `${address}, ${city}`,
    items: cart,
    total_amount: totalAmount,
    status: 'Confirmed & In Atelier Tailoring',
    payment_method: 'Luxury Concierge Direct',
    created_at: new Date().toISOString()
  };

  const submitBtn = document.getElementById('btnSubmitOrder');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Securing Couture Reservation...';
  }

  await window.NexoraDB.createOrder(orderData);

  // Clear cart
  cart = [];
  saveCart();
  updateCartUI();

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Complete Luxury Order';
  }

  closeCheckoutModal();
  showToast(`Order ${orderData.id} placed! A concierge receipt has been sent to ${email}`, 'fa-gem');
}

/* ==========================================================================
   DRAWER CONTROL HELPERS
   ========================================================================== */

function openCartDrawer() {
  closeAllDrawers();
  document.getElementById('cartDrawer').classList.add('active');
  document.getElementById('drawerOverlay').classList.add('active');
}

function openWishlistDrawer() {
  closeAllDrawers();
  document.getElementById('wishlistDrawer').classList.add('active');
  document.getElementById('drawerOverlay').classList.add('active');
}

function closeAllDrawers() {
  document.querySelectorAll('.drawer-panel').forEach(d => d.classList.remove('active'));
  const overlay = document.getElementById('drawerOverlay');
  if (overlay) overlay.classList.remove('active');
}

/* ==========================================================================
   TOAST NOTIFICATION HELPER
   ========================================================================== */

function showToast(message, iconClass = 'fa-check-circle') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fas ${iconClass}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

window.renderStorefront = renderStorefront;
window.quickAddToCart = quickAddToCart;
window.openQuickView = openQuickView;
window.closeQuickView = closeQuickView;
window.toggleWishlist = toggleWishlist;
window.openCartDrawer = openCartDrawer;
window.openWishlistDrawer = openWishlistDrawer;
window.closeAllDrawers = closeAllDrawers;
window.updateCartItemQty = updateCartItemQty;
window.removeCartItem = removeCartItem;
window.changeQuickViewImage = changeQuickViewImage;
window.selectQuickViewSize = selectQuickViewSize;
window.selectQuickViewColor = selectQuickViewColor;
window.addQuickViewToCart = addQuickViewToCart;
window.openCheckoutModal = openCheckoutModal;
window.closeCheckoutModal = closeCheckoutModal;
window.showToast = showToast;
