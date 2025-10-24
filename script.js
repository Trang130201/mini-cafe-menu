(() => {
  "use strict";

  /* ===== CẤU HÌNH ===== */
  const SHOP_LAT = 10.3477;     // toạ độ shop (ước lượng) – chỉnh nếu cần
  const SHOP_LNG = 107.0810;

  /* ===== DỮ LIỆU MENU ===== */
  const drinks = [
    {
      name: "Matcha Latte",
      price: "40k",
      emoji: "🍵",
      photo: "images/matcha.png",
      flavor: "matcha",
      products: [
        { name: "Matcha Latte", img: "images/products/matcha_latte.png", size: "700ml", price: "40k" },
        { name: "Matcha Cold Whisk", img: "images/products/matcha_cold_whisk.png", size: "700ml", price: "50k" }
      ]
    },
    {
      name: "Strawberry Milk",
      price: "35k",
      emoji: "🍓",
      photo: "images/strawberry.png",
      flavor: "strawberry",
      products: [
        { name: "Strawberry Milk", img: "images/products/strawberry_milk.png", size: "700ml", price: "35k" },
        { name: "Strawberry Milk Shake", img: "images/products/strawberry_milk_shake.png", size: "700ml", price: "55k" }
      ]
    }
  ];

  /* ===== Helpers ===== */
  const parseK = (s) => {
    if (typeof s === "number") return s;
    const m = String(s).toLowerCase().match(/(\d+)\s*k?/);
    return m ? Number(m[1]) : 0;
  };
  const fmtK = (n) => `${n}k`;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 +
      Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    return 2*R*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  /* ===== DOM refs ===== */
  const menuEl = document.getElementById("menu");

  // Product modal
  const modalEl = document.getElementById("product-modal");
  const productListEl = document.getElementById("product-list");
  const pickedNameEl = document.getElementById("picked-name");
  const pickedBaseEl = document.getElementById("picked-base");
  const totalEl = document.getElementById("total-amount");

  const optUpsize = document.getElementById("opt-upsize");
  const optAddMatcha = document.getElementById("opt-add-matcha");
  const optAddStrawberry = document.getElementById("opt-add-strawberry");
  const sugarNodes = () => Array.from(document.querySelectorAll('input[name="sugar"]'));
  const addToCartBtn = document.getElementById("add-to-cart");

  // Cart button & modal
  const cartFab = document.getElementById("cart-fab");
  const cartCountEl = document.getElementById("cart-count");
  const cartModal = document.getElementById("cart-modal");
  const cartItemsEl = document.getElementById("cart-items");
  const promoBanner = document.getElementById("promo-banner");
  const sumSubtotalEl = document.getElementById("sum-subtotal");
  const sumDiscountEl = document.getElementById("sum-discount");
  const sumShippingEl = document.getElementById("sum-shipping");
  const sumGrandEl = document.getElementById("sum-grand");
  const btnGetLocation = document.getElementById("btn-get-location");
  const btnCheckout = document.getElementById("btn-checkout");
  const distanceLine = document.getElementById("distance-line");

  // Pay modal
  const payModal = document.getElementById("pay-modal");
  const payForm = document.getElementById("pay-form");
  const qrBox = document.getElementById("qr-box");
  const payConfirmBtn = document.getElementById("pay-confirm");
  const payResult = document.getElementById("pay-result");

  // Music
  const bgm = document.getElementById("bgm");
  const bgmToggle = document.getElementById("bgm-toggle");

  /* ===== Topping wrappers ===== */
  const addMatchaWrap = optAddMatcha.closest("label");
  const addStrawberryWrap = optAddStrawberry.closest("label");
  function toggleToppingsForFlavor(flavor){
    if (flavor === "matcha") {
      addMatchaWrap.style.display = "inline-flex";
      addStrawberryWrap.style.display = "none";
      optAddStrawberry.checked = false;
    } else if (flavor === "strawberry") {
      addMatchaWrap.style.display = "none";
      addStrawberryWrap.style.display = "inline-flex";
      optAddMatcha.checked = false;
    } else {
      addMatchaWrap.style.display = "none";
      addStrawberryWrap.style.display = "none";
      optAddMatcha.checked = false;
      optAddStrawberry.checked = false;
    }
  }

  /* ===== State ===== */
  let currentProduct = null;
  let cart = [];
  let userLoc = null; // {lat,lng}

  /* ===== Menu render ===== */
  function createDrinkCard(item){
    const card = document.createElement("div");
    card.className = "menu-item";
    card.dataset.flavor = item.flavor;
    card.tabIndex = 0;
    card.innerHTML = `
      <p class="title"><span class="icon-emoji">${item.emoji}</span><span>${item.name}</span></p>
      <div class="media">
        <img src="${item.photo}" alt="${item.name}" class="drink-photo" onerror="this.style.display='none'">
      </div>
      <p class="meta">${item.price}</p>
    `;
    const open = () => openProductsModal(item);
    card.addEventListener("click", open);
    card.addEventListener("keydown", e => { if (e.key==="Enter"||e.key===" "){e.preventDefault();open();} });
    return card;
  }
  function renderMenu(list){
    const frag = document.createDocumentFragment();
    list.forEach(item => frag.appendChild(createDrinkCard(item)));
    menuEl.innerHTML = "";
    menuEl.appendChild(frag);
  }

  /* ===== Product modal ===== */
  function openProductsModal(drink){
    modalEl.querySelector(".modal__title").textContent = `Sản phẩm – ${drink.name}`;
    productListEl.innerHTML = drink.products.map((p,idx)=>`
      <div class="product-card" data-idx="${idx}">
        <img class="product-card__img" src="${p.img}" alt="${p.name}" onerror="this.style.display='none'">
        <div class="product-card__name">${p.name}</div>
        <div class="product-card__meta">${p.size ? `${p.size} — ` : ""}${p.price}</div>
      </div>
    `).join("");

    pickProduct(drink.products[0]);
    resetOptions();
    toggleToppingsForFlavor(drink.flavor);
    updateTempTotal();

    modalEl.classList.remove("hidden");
    modalEl.setAttribute("aria-hidden","false");
    document.body.style.overflow = "hidden";

    productListEl.onclick = (e)=>{
      const card = e.target.closest(".product-card");
      if(!card) return;
      const p = drink.products[Number(card.dataset.idx)];
      pickProduct(p);
      updateTempTotal();
    };
  }
  function closeProductsModal(){
    modalEl.classList.add("hidden");
    modalEl.setAttribute("aria-hidden","true");
    document.body.style.overflow = "";
    productListEl.onclick = null;
  }
  modalEl.addEventListener("click", e => { if (e.target.dataset.close==="true") closeProductsModal(); });
  document.addEventListener("keydown", e => { if (e.key==="Escape" && !modalEl.classList.contains("hidden")) closeProductsModal(); });

  function pickProduct(p){
    currentProduct = p;
    pickedNameEl.textContent = p.name;
    pickedBaseEl.textContent = p.price;
  }
  function resetOptions(){
    optUpsize.checked = false;
    optAddMatcha.checked = false;
    optAddStrawberry.checked = false;
    sugarNodes().forEach(r => r.checked = r.value==="0");
  }
  function updateTempTotal(){
    if(!currentProduct){ totalEl.textContent = "0k"; return; }
    let t = parseK(currentProduct.price);
    if (optUpsize.checked) t += 10;
    if (optAddMatcha.checked) t += 5;
    if (optAddStrawberry.checked) t += 15;
    totalEl.textContent = fmtK(t);
  }
  [optUpsize,optAddMatcha,optAddStrawberry].forEach(el=>el.addEventListener("change",updateTempTotal));
  sugarNodes().forEach(r=>r.addEventListener("change",updateTempTotal));

  addToCartBtn.addEventListener("click",()=>{
    if(!currentProduct) return;
    let total = parseK(currentProduct.price);
    const item = {
      name: currentProduct.name,
      base: total,
      upsize: optUpsize.checked,
      addMatcha: optAddMatcha.checked,
      addStrawberry: optAddStrawberry.checked,
      sugar: sugarNodes().find(r=>r.checked)?.value || "0"
    };
    if (item.upsize) total += 10;
    if (item.addMatcha) total += 5;
    if (item.addStrawberry) total += 15;
    item.total = total;
    cart.push(item);
    updateCartBadge();
    closeProductsModal();
  });

  function updateCartBadge(){ cartCountEl.textContent = String(cart.length); }

  /* ===== Cart modal ===== */
  function openCartModal(){
    renderCartDetail();
    cartModal.classList.remove("hidden");
    cartModal.setAttribute("aria-hidden","false");
    document.body.style.overflow = "hidden";
  }
  function closeCartModal(){
    cartModal.classList.add("hidden");
    cartModal.setAttribute("aria-hidden","true");
    document.body.style.overflow = "";
  }
  cartFab.addEventListener("click", openCartModal);
  cartModal.addEventListener("click", e => { if (e.target.dataset.close==="true") closeCartModal(); });
  document.addEventListener("keydown", e => { if (e.key==="Escape" && !cartModal.classList.contains("hidden")) closeCartModal(); });

  function computeDiscount(subtotal){
    // ≥200k: -5%; (≥300k vẫn -5% + freeship tính ở shipping)
    return subtotal >= 200 ? Math.round(subtotal * 0.05) : 0;
  }
  function computeShipping(subtotal, km){
    // Ưu tiên chính sách freeship theo tổng
    if (subtotal >= 300) return 0;
    if (km == null) return 0; // chưa có vị trí: tạm 0, sẽ cập nhật sau
    if (km >= 1 && km <= 3) return 0;
    if (km > 3 && km < 6) return 20;
    if (km >= 6 && km <= 12) return 40;
    return 40; // >12km tạm thu 40k
  }

  function renderCartDetail(){
    if (cart.length === 0) {
      cartItemsEl.innerHTML = `<li>Giỏ hàng trống</li>`;
    } else {
      cartItemsEl.innerHTML = cart.map((c,i)=>{
        const opts = [
          c.upsize ? "Upsize" : null,
          c.addMatcha ? "Thêm matcha" : null,
          c.addStrawberry ? "Thêm dâu" : null,
          `Đường ${c.sugar}%`
        ].filter(Boolean).join(" • ");
        return `
          <li>
            <div>
              <div><strong>${c.name}</strong></div>
              <div class="item-meta">${opts}</div>
            </div>
            <div>
              <span class="item-total">${fmtK(c.total)}</span>
              <button class="cart-remove" data-idx="${i}" title="Xoá">×</button>
            </div>
          </li>
        `;
      }).join("");
    }

    // Subtotal + promo banner
    const subtotal = cart.reduce((s,c)=>s+c.total,0);
    sumSubtotalEl.textContent = fmtK(subtotal);
    promoBanner.classList.toggle("hidden", !(subtotal >= 200));

    // Tạm thời discount+shipping sẽ cập nhật khi người dùng bấm "Tiến tới thanh toán"
    sumDiscountEl.textContent = "0k";
    sumShippingEl.textContent = "0k";
    sumGrandEl.textContent = fmtK(subtotal);

    // Remove item
    cartItemsEl.onclick = (e)=>{
      if(!e.target.classList.contains("cart-remove")) return;
      const idx = Number(e.target.dataset.idx);
      cart.splice(idx,1);
      updateCartBadge();
      renderCartDetail();
    };
  }

  /* ===== Location & Checkout ===== */
  btnGetLocation.addEventListener("click", ()=>{
    if(!("geolocation" in navigator)){
      distanceLine.innerHTML = "📍 Trình duyệt không hỗ trợ định vị.";
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos=>{
        userLoc = {lat: pos.coords.latitude, lng: pos.coords.longitude};
        const km = haversineKm(userLoc.lat,userLoc.lng,SHOP_LAT,SHOP_LNG);
        distanceLine.innerHTML = `📍 Khoảng cách của bạn: <strong>${km.toFixed(2)} km</strong>`;
      },
      err=>{
        distanceLine.innerHTML = `📍 Không lấy được vị trí (mã ${err.code}). Vui lòng bật quyền vị trí & thử lại.`;
      },
      { enableHighAccuracy:true, timeout:10000 }
    );
  });

  // Bấm "Tiến tới thanh toán" → tính toán + mở modal phương thức thanh toán
  btnCheckout.addEventListener("click", ()=>{
    if (cart.length === 0) { alert("Giỏ hàng đang trống."); return; }

    const subtotal = cart.reduce((s,c)=>s+c.total,0);
    const discount = computeDiscount(subtotal);

    let km = null;
    if (userLoc) km = haversineKm(userLoc.lat,userLoc.lng,SHOP_LAT,SHOP_LNG);
    const shipping = computeShipping(subtotal, km);

    sumSubtotalEl.textContent = fmtK(subtotal);
    sumDiscountEl.textContent = discount ? `- ${fmtK(discount)}` : "0k";
    sumShippingEl.textContent = fmtK(shipping);
    sumGrandEl.textContent = fmtK(Math.max(0, subtotal - discount) + shipping);

    if (km !== null) {
      distanceLine.innerHTML = `📍 Khoảng cách của bạn: <strong>${km.toFixed(2)} km</strong>`;
    }

    // Mở modal chọn phương thức thanh toán
    openPayModal();
  });

  /* ===== Pay modal ===== */
  function openPayModal(){
    payResult.textContent = "";
    payModal.classList.remove("hidden");
    payModal.setAttribute("aria-hidden","false");
    document.body.style.overflow = "hidden";
    // mặc định ẩn QR
    qrBox.classList.add("hidden");
  }
  function closePayModal(){
    payModal.classList.add("hidden");
    payModal.setAttribute("aria-hidden","true");
    document.body.style.overflow = "";
  }
  payModal.addEventListener("click", e => { if (e.target.dataset.close==="true") closePayModal(); });
  document.addEventListener("keydown", e => { if (e.key==="Escape" && !payModal.classList.contains("hidden")) closePayModal(); });

  // Hiện QR nếu chọn QR
  payForm.addEventListener("change", e=>{
    const method = new FormData(payForm).get("pay");
    qrBox.classList.toggle("hidden", method !== "qr");
  });

  // Xác nhận thanh toán (mô phỏng)
  payConfirmBtn.addEventListener("click", ()=>{
    const method = new FormData(payForm).get("pay");
    const msg = {
      cash: "Bạn đã chọn thanh toán TIỀN MẶT. Đơn sẽ được xác nhận ngay!",
      bank: "Bạn đã chọn CHUYỂN KHOẢN. Vui lòng chuyển theo hướng dẫn. Cảm ơn!",
      qr: "Bạn đã chọn MÃ QR. Quét mã để thanh toán. Cảm ơn!"
    }[method] || "Đã chọn phương thức thanh toán.";
    payResult.textContent = msg;

    // Sau 1.2s đóng modal thanh toán
    setTimeout(()=>{ closePayModal(); closeCartModal(); }, 1200);
  });

  /* ===== Nhạc nền ===== */
  let bgmOn = false;
  const safePlay = async () => {
    try { await bgm.play(); bgmOn = true; bgmToggle.textContent = "⏸"; }
    catch { /* cần tương tác người dùng mới play được */ }
  };
  bgmToggle.addEventListener("click", async ()=>{
    if (!bgmOn) { await safePlay(); }
    else { bgm.pause(); bgmOn = false; bgmToggle.textContent = "♪"; }
  });
  // có thể auto-prepare sau lần click đầu (VD: mở giỏ)
  cartFab.addEventListener("click", safePlay, { once:true });

  /* ===== Init ===== */
  document.addEventListener("DOMContentLoaded", ()=>{
    renderMenu(drinks);
    updateCartBadge();
  });
})();
