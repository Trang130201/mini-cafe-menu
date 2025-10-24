/* =========================================================
   Mini Café Menu - 2025 Update (hotfix autoplay + geolocation)
========================================================= */

// ---------- HẰNG SỐ ----------
const CURRENCY = "vi-VN";
const VND = "VND";
const SHOP_COORD = { lat: 10.776530, lng: 106.700981 }; // ví dụ: trung tâm Q1, HCM

const SHIPPING_TIERS = Object.freeze({
  FREE_MAX_KM: 3,
  MID_MIN_EX: 3,     // >3
  MID_MAX_EX: 6,     // <6
  MID_FEE: 20000,
  HIGH_MIN_IN: 6,    // >=6
  HIGH_MAX_IN: 12,   // <=12
  HIGH_FEE: 40000,
  FAR_FEE: 40000     // >12
});

const DISCOUNT_THRESHOLD = 200000;
const FREESHIP_THRESHOLD = 300000;
const TOPPING_PRICE = 10000;

// ---------- DỮ LIỆU SẢN PHẨM ----------
const PRODUCTS = [
  { id: "m-matcha-01", name: "Matcha Latte", price: 55000, type: "matcha", img: "images/products/matcha-latte.jpg", desc: "Matcha Nhật hòa quyện sữa, ngọt dịu." },
  { id: "m-straw-01", name: "Strawberry Soda", price: 45000, type: "strawberry", img: "images/products/strawberry-soda.jpg", desc: "Soda dâu tây mát lạnh, sảng khoái." },
  { id: "m-cof-01", name: "Cold Brew", price: 60000, type: "coffee", img: "images/products/cold-brew.jpg", desc: "Cà phê ủ lạnh 18h, hậu vị chocolate." },
  { id: "m-tea-01", name: "Peach Oolong Tea", price: 50000, type: "tea", img: "images/products/peach-oolong.jpg", desc: "Hương đào & ô long thơm dịu, thanh mát." }
];

// ---------- TRẠNG THÁI ----------
let cart = []; // {key,id,name,price,qty,type,img,toppings[]}
let userDistanceKm = null;
let currentPayment = "cash";

// ---------- TIỆN ÍCH ----------
const fmt = n => new Intl.NumberFormat(CURRENCY, { style: "currency", currency: VND }).format(n);
const findProduct = id => PRODUCTS.find(p => p.id === id);

function haversineKm(a, b){
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat/2);
  const s2 = Math.sin(dLng/2);
  const aa = s1*s1 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*s2*s2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
  return R * c;
}

function calcShipping(afterDiscount, distanceKm){
  if (afterDiscount >= FREESHIP_THRESHOLD) return 0;
  if (distanceKm == null || Number.isNaN(distanceKm)) return null;
  if (distanceKm <= SHIPPING_TIERS.FREE_MAX_KM) return 0;
  if (distanceKm > SHIPPING_TIERS.MID_MIN_EX && distanceKm < SHIPPING_TIERS.MID_MAX_EX) return SHIPPING_TIERS.MID_FEE;
  if (distanceKm >= SHIPPING_TIERS.HIGH_MIN_IN && distanceKm <= SHIPPING_TIERS.HIGH_MAX_IN) return SHIPPING_TIERS.HIGH_FEE;
  if (distanceKm > SHIPPING_TIERS.HIGH_MAX_IN) return SHIPPING_TIERS.FAR_FEE;
  return SHIPPING_TIERS.HIGH_FEE;
}

function computeTotals(){
  const subtotal = cart.reduce((sum, item) => {
    const toppingCost = (item.toppings?.length || 0) * TOPPING_PRICE;
    return sum + (item.price + toppingCost) * item.qty;
  }, 0);
  const discount = subtotal >= DISCOUNT_THRESHOLD ? Math.floor(subtotal * 0.05) : 0;
  const afterDiscount = subtotal - discount;
  const ship = calcShipping(afterDiscount, userDistanceKm);
  const total = afterDiscount + (ship ?? 0);
  return { subtotal, discount, ship, total };
}

// ---------- RENDER SẢN PHẨM ----------
function renderProducts(){
  const grid = document.getElementById("productGrid");
  if (!grid){ console.error("#productGrid không tồn tại"); return; }
  grid.innerHTML = "";
  PRODUCTS.forEach(p => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="thumb"><img src="${p.img}" alt="${p.name}" loading="lazy"></div>
      <div class="body">
        <h3>${p.name}</h3>
        <div class="price">${fmt(p.price)}</div>
        <p class="desc">${p.desc}</p>
        <fieldset class="toppings" data-product="${p.id}">
          <legend>Topping (mỗi loại +${fmt(TOPPING_PRICE)})</legend>
          <div class="top-row">
            <label class="check" data-top="matcha" ${p.type==="matcha" ? "" : "hidden"}>
              <input type="checkbox" value="matcha"> Thêm matcha
            </label>
            <label class="check" data-top="strawberry" ${p.type==="strawberry" ? "" : "hidden"}>
              <input type="checkbox" value="strawberry"> Thêm dâu
            </label>
          </div>
          <div class="qty-row">
            SL: <input type="number" min="1" step="1" value="1" aria-label="Số lượng">
            <button class="btn btn-primary add-btn">Thêm vào giỏ</button>
          </div>
        </fieldset>
      </div>
    `;
    const fieldset = card.querySelector("fieldset.toppings");
    const addBtn = fieldset.querySelector(".add-btn");
    addBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const qty = parseInt(fieldset.querySelector('input[type="number"]').value, 10) || 1;
      const chosen = Array.from(fieldset.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);
      addToCart(p, qty, chosen);
    });
    grid.appendChild(card);
  });
}

// ---------- GIỎ HÀNG ----------
function addToCart(product, qty, toppings){
  const key = product.id + "::" + (toppings.slice().sort().join("+") || "none");
  const existing = cart.find(it => it.key === key);
  if (existing) existing.qty += qty;
  else cart.push({ key, id:product.id, name:product.name, price:product.price, qty, type:product.type, img:product.img, toppings });
  syncCartUI();
}

function removeFromCart(key){ cart = cart.filter(it => it.key !== key); syncCartUI(); }
function changeQty(key, delta){
  const it = cart.find(x => x.key === key);
  if (!it) return;
  it.qty += delta;
  if (it.qty <= 0) removeFromCart(key);
  syncCartUI();
}

function syncCartUI(){
  const count = cart.reduce((s, it) => s + it.qty, 0);
  const cartCount = document.getElementById("cartCount");
  if (cartCount) cartCount.textContent = count;

  const wrap = document.getElementById("cartItems");
  if (!wrap) return;
  wrap.innerHTML = cart.length ? "" : `<p class="muted">Giỏ hàng trống.</p>`;

  cart.forEach(it => {
    const lineTopping = (it.toppings?.length)
      ? ` • Topping: ${it.toppings.map(t => t==="matcha"?"Matcha":"Dâu").join(", ")} (+${fmt(it.toppings.length*TOPPING_PRICE)})`
      : "";
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <img src="${it.img}" alt="${it.name}">
      <div>
        <h4>${it.name}</h4>
        <div class="muted">Đơn giá: ${fmt(it.price)}${lineTopping}</div>
        <div class="qty-actions">
          <button class="icon-btn" aria-label="Giảm" data-act="minus">−</button>
          <span>${it.qty}</span>
          <button class="icon-btn" aria-label="Tăng" data-act="plus">+</button>
          <button class="icon-btn" aria-label="Xóa" data-act="remove">🗑️</button>
        </div>
      </div>
      <div class="row-price">${fmt( (it.price + (it.toppings?.length||0)*TOPPING_PRICE) * it.qty )}</div>
    `;
    row.querySelector('[data-act="minus"]').addEventListener("click", () => changeQty(it.key, -1));
    row.querySelector('[data-act="plus"]').addEventListener("click", () => changeQty(it.key, +1));
    row.querySelector('[data-act="remove"]').addEventListener("click", () => removeFromCart(it.key));
    wrap.appendChild(row);
  });

  const { subtotal, discount, ship, total } = computeTotals();
  const elSubtotal = document.getElementById("subtotalText");
  const elDiscount = document.getElementById("discountText");
  const elShipping = document.getElementById("shippingText");
  const elTotal = document.getElementById("totalText");
  if (elSubtotal) elSubtotal.textContent = fmt(subtotal);
  if (elDiscount) elDiscount.textContent = `−${fmt(discount)}`;
  if (elShipping) elShipping.textContent = (ship==null ? "—" : fmt(ship));
  if (elTotal) elTotal.textContent = fmt(total);
}

// ---------- MODAL ----------
function openModal(el){ if (el) el.setAttribute("aria-hidden","false"); }
function closeModal(el){ if (el) el.setAttribute("aria-hidden","true"); }

function setupModals(){
  const cartFab = document.getElementById("cartFab");
  const cartModal = document.getElementById("cartModal");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const clearCartBtn = document.getElementById("clearCartBtn");

  if (cartFab) cartFab.addEventListener("click", () => openModal(cartModal));
  if (cartModal) cartModal.addEventListener("click", (e) => {
    if (e.target.matches('[data-close], .modal')) closeModal(cartModal);
  });
  if (checkoutBtn) checkoutBtn.addEventListener("click", () => {
    if (cart.length === 0){ alert("Giỏ hàng đang trống."); return; }
    openModal(document.getElementById("paymentModal"));
  });
  if (clearCartBtn) clearCartBtn.addEventListener("click", () => { cart = []; syncCartUI(); });

  // Payment
  const pm = document.getElementById("paymentModal");
  if (pm) pm.addEventListener("click", (e) => {
    if (e.target.matches('[data-close], .modal')) closeModal(pm);
  });

  const payForm = document.getElementById("paymentForm");
  const qrBlock = document.getElementById("qrBlock");
  if (payForm){
    payForm.addEventListener("change", (e) => {
      if (e.target.name === "payment"){
        currentPayment = e.target.value;
        const showQR = currentPayment === "qr";
        if (qrBlock) qrBlock.hidden = !showQR;
      }
    });
    payForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const { subtotal, discount, ship, total } = computeTotals();
      const payLabel = currentPayment==="cash" ? "Tiền mặt" : currentPayment==="bank" ? "Chuyển khoản" : "QR";
      alert(
`Đặt hàng thành công!
Phương thức: ${payLabel}
Tạm tính: ${fmt(subtotal)}
Giảm giá: -${fmt(discount)}
Phí ship: ${ship==null ? "—" : fmt(ship)}
Tổng: ${fmt(total)}
Cảm ơn bạn đã ủng hộ Mini Café!`
      );
      cart = [];
      syncCartUI();
      closeModal(pm);
      closeModal(cartModal);
    });
  }
}

// ---------- GEOLOCATION ----------
function setupGeolocation(){
  const locateBtn = document.getElementById("locateBtn");
  const distanceText = document.getElementById("distanceText");
  const shippingFeeText = document.getElementById("shippingFeeText");

  function doLocate(){
    if (!("geolocation" in navigator)){
      alert("Trình duyệt không hỗ trợ Geolocation.");
      return;
    }
    // Yêu cầu chạy qua https hoặc localhost
    if (location.protocol === "http:" && location.hostname !== "localhost"){
      console.warn("Geolocation có thể bị chặn trên HTTP.");
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const km = haversineKm(coords, SHOP_COORD);
        userDistanceKm = Math.round(km * 10) / 10;
        if (distanceText) distanceText.textContent = `${userDistanceKm} km`;

        const { subtotal, discount } = computeTotals();
        const shipTmp = calcShipping(subtotal - discount, userDistanceKm);
        if (shippingFeeText) shippingFeeText.textContent = (shipTmp==null ? "—" : fmt(shipTmp));
        syncCartUI();
      },
      (err) => {
        console.warn("Geolocation error:", err);
        alert("Không thể lấy vị trí. Hãy bật quyền định vị và thử lại.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  if (locateBtn) locateBtn.addEventListener("click", doLocate);
}

// ---------- AUDIO (TỰ PHÁT MUTED + BẬT TIẾNG KHI NHẤN) ----------
function setupAudio(){
  const audio = document.getElementById("bgm");
  const toggle = document.getElementById("audioToggle");
  const status = document.getElementById("audioStatus");
  if (!audio || !toggle || !status) return;

  let playing = false;
  let muted = true;

  function updateUI(){
    toggle.textContent = muted ? "🔈 Bật tiếng" : "🔇 Tắt tiếng";
    status.textContent = playing ? (muted ? "Đang phát (đang tắt tiếng)" : "Đang phát") : "Đang tắt";
    toggle.setAttribute("aria-pressed", String(!muted));
  }

  // Cố gắng tự phát (muted) để qua autoplay policy
  function tryAutoplayMuted(){
    audio.muted = true;
    audio.loop = true;
    audio.play().then(() => {
      playing = true; muted = true; updateUI();
    }).catch(err => {
      console.warn("Autoplay bị chặn:", err);
      playing = false; muted = true; updateUI();
    });
  }

  toggle.addEventListener("click", async () => {
    try{
      if (!playing){
        // nếu đang không phát, phát luôn và bật tiếng
        audio.muted = false;
        await audio.play();
        playing = true; muted = false;
      } else {
        // đang phát -> chuyển trạng thái mute/unmute
        audio.muted = !audio.muted;
        muted = audio.muted;
      }
      updateUI();
    }catch(e){
      console.warn(e);
      alert("Không thể phát nhạc. Vui lòng thử lại.");
    }
  });

  // chạy thử auto-play khi DOM sẵn sàng
  tryAutoplayMuted();
}

// ---------- KHỞI TẠO ----------
function init(){
  renderProducts();
  setupModals();
  setupGeolocation();
  setupAudio();
  syncCartUI();
}

document.addEventListener("DOMContentLoaded", init);
