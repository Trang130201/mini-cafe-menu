(() => {
  "use strict";

  /* ===== CẤU HÌNH & DỮ LIỆU ===== */
  // Tọa độ shop (ước lượng Vũng Tàu) — chỉnh lại nếu cần cho thật chuẩn
  const SHOP_LAT = 10.3477;
  const SHOP_LNG = 107.0810;

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

  /* ===== Helpers giá/tiền & khoảng cách ===== */
  const parseK = (s) => {
    if (typeof s === "number") return s;
    const m = String(s).toLowerCase().match(/(\d+)\s*k?/);
    return m ? Number(m[1]) : 0;
  };
  const fmtK = (n) => `${n}k`;

  // Haversine (km)
  const toRad = (deg) => (deg * Math.PI) / 180;
  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

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

  // Cart FAB & modal
  const cartFab = document.getElementById("cart-fab");
  const cartCountEl = document.getElementById("cart-count");
  const cartModal = document.getElementById("cart-modal");
  const cartItemsEl = document.getElementById("cart-items");
  const sumSubtotalEl = document.getElementById("sum-subtotal");
  const sumDiscountEl = document.getElementById("sum-discount");
  const sumShippingEl = document.getElementById("sum-shipping");
  const sumGrandEl = document.getElementById("sum-grand");
  const btnGetLocation = document.getElementById("btn-get-location");
  const btnCheckout = document.getElementById("btn-checkout");
  const distanceLine = document.getElementById("distance-line");

  /* ===== Topping wrappers (ẩn/hiện đúng phần) ===== */
  const addMatchaInput = optAddMatcha; // id="opt-add-matcha"
  const addStrawberryInput = optAddStrawberry; // id="opt-add-strawberry"
  const addMatchaWrap = addMatchaInput.closest("label");
  const addStrawberryWrap = addStrawberryInput.closest("label");

  function toggleToppingsForFlavor(flavor) {
    if (flavor === "matcha") {
      addMatchaWrap.style.display = "inline-flex";
      addStrawberryWrap.style.display = "none";
      if (addStrawberryInput.checked) addStrawberryInput.checked = false;
    } else if (flavor === "strawberry") {
      addMatchaWrap.style.display = "none";
      addStrawberryWrap.style.display = "inline-flex";
      if (addMatchaInput.checked) addMatchaInput.checked = false;
    } else {
      addMatchaWrap.style.display = "none";
      addStrawberryWrap.style.display = "none";
      addMatchaInput.checked = false;
      addStrawberryInput.checked = false;
    }
  }

  /* ===== State ===== */
  let currentProduct = null;
  let cart = [];
  let userLoc = null; // {lat, lng}

  /* ===== Menu render ===== */
  function createDrinkCard(item) {
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
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
    return card;
  }

  function renderMenu(list) {
    const frag = document.createDocumentFragment();
    list.forEach(item => frag.appendChild(createDrinkCard(item)));
    menuEl.innerHTML = "";
    menuEl.appendChild(frag);
  }

  /* ===== Product modal ===== */
  function openProductsModal(drink) {
    modalEl.querySelector(".modal__title").textContent = `Sản phẩm – ${drink.name}`;
    productListEl.innerHTML = drink.products
      .map((p, idx) => `
        <div class="product-card" data-idx="${idx}">
          <img class="product-card__img" src="${p.img}" alt="${p.name}" onerror="this.style.display='none'">
          <div class="product-card__name">${p.name}</div>
          <div class="product-card__meta">${p.size ? `${p.size} — ` : ""}${p.price}</div>
        </div>
      `).join("");

    pickProduct(drink.products[0]);
    resetOptions();

    // ẨN/HIỆN topping theo nhóm hương vị (quan trọng)
    toggleToppingsForFlavor(drink.flavor);

    updateTempTotal();

    modalEl.classList.remove("hidden");
    modalEl.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // Delegation: chọn sản phẩm trong modal
    productListEl.onclick = (e) => {
      const card = e.target.closest(".product-card");
      if (!card) return;
      const p = drink.products[Number(card.dataset.idx)];
      pickProduct(p);
      updateTempTotal();
    };
  }

  function closeProductsModal() {
    modalEl.classList.add("hidden");
    modalEl.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    productListEl.onclick = null;
  }

  modalEl.addEventListener("click", (e) => { if (e.target.dataset.close === "true") closeProductsModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modalEl.classList.contains("hidden")) closeProductsModal(); });

  function pickProduct(p) {
    currentProduct = p;
    pickedNameEl.textContent = p.name;
    pickedBaseEl.textContent = p.price;
  }

  function resetOptions() {
    optUpsize.checked = false;
    optAddMatcha.checked = false;
    optAddStrawberry.checked = false;
    sugarNodes().forEach(r => r.checked = r.value === "0");
  }

  function updateTempTotal() {
    if (!currentProduct) { totalEl.textContent = "0k"; return; }
    let total = parseK(currentProduct.price);
    if (optUpsize.checked) total += 10;
    if (optAddMatcha.checked) total += 5;
    if (optAddStrawberry.checked) total += 15;
    totalEl.textContent = fmtK(total);
  }

  [optUpsize, optAddMatcha, optAddStrawberry].forEach(el => el.addEventListener("change", updateTempTotal));
  sugarNodes().forEach(r => r.addEventListener("change", updateTempTotal));

  addToCartBtn.addEventListener("click", () => {
    if (!currentProduct) return;
    const item = {
      name: currentProduct.name,
      base: parseK(currentProduct.price),
      upsize: optUpsize.checked,
      addMatcha: optAddMatcha.checked,
      addStrawberry: optAddStrawberry.checked,
      sugar: sugarNodes().find(r => r.checked)?.value || "0"
    };
    let total = item.base;
    if (item.upsize) total += 10;
    if (item.addMatcha) total += 5;
    if (item.addStrawberry) total += 15;
    item.total = total;

    cart.push(item);
    updateCartBadge();
    closeProductsModal();
  });

  function updateCartBadge() {
    cartCountEl.textContent = String(cart.length);
  }

  /* ===== Cart modal ===== */
  function openCartModal() {
    renderCartDetail();
    cartModal.classList.remove("hidden");
    cartModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeCartModal() {
    cartModal.classList.add("hidden");
    cartModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  cartFab.addEventListener("click", openCartModal);
  cartModal.addEventListener("click", (e) => { if (e.target.dataset.close === "true") closeCartModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !cartModal.classList.contains("hidden")) closeCartModal(); });

  function renderCartDetail() {
    if (cart.length === 0) {
      cartItemsEl.innerHTML = `<li>Giỏ hàng trống</li>`;
    } else {
      cartItemsEl.innerHTML = cart.map((c, i) => {
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

    // Tính tạm
    const subtotal = cart.reduce((s, c) => s + c.total, 0);
    sumSubtotalEl.textContent = fmtK(subtotal);
    sumDiscountEl.textContent = "0k";
    sumShippingEl.textContent = "0k";
    sumGrandEl.textContent = fmtK(subtotal);

    // bind remove
    cartItemsEl.onclick = (e) => {
      if (!e.target.classList.contains("cart-remove")) return;
      const idx = Number(e.target.dataset.idx);
      cart.splice(idx, 1);
      updateCartBadge();
      renderCartDetail();
    };
  }

  /* ===== Location & Checkout ===== */
  btnGetLocation.addEventListener("click", () => {
    if (!("geolocation" in navigator)) {
      distanceLine.innerHTML = "📍 Trình duyệt không hỗ trợ định vị.";
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const km = haversineKm(userLoc.lat, userLoc.lng, SHOP_LAT, SHOP_LNG);
        distanceLine.innerHTML = `📍 Khoảng cách của bạn: <strong>${km.toFixed(2)} km</strong>`;
      },
      (err) => {
        distanceLine.innerHTML = `📍 Không lấy được vị trí (mã ${err.code}). Vui lòng bật quyền vị trí & thử lại.`;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  btnCheckout.addEventListener("click", () => {
    const subtotal = cart.reduce((s, c) => s + c.total, 0);

    // Discount: >=200k => -5%; >=300k => -5% & freeship
    let discount = 0;
    if (subtotal >= 200) {
      discount = Math.round(subtotal * 0.05);
    }

    // Shipping theo khoảng cách
    let shipping = 0;
    let km = null;
    if (userLoc) {
      km = haversineKm(userLoc.lat, userLoc.lng, SHOP_LAT, SHOP_LNG);
      if (km >= 1 && km <= 3) shipping = 0;
      else if (km > 3 && km < 6) shipping = 20;
      else if (km >= 6 && km <= 12) shipping = 40;
      else if (km !== null) shipping = 40; // >12km tạm tính 40k
    } else {
      distanceLine.innerHTML = `📍 Chưa có vị trí khách. Nhấn "Lấy vị trí của tôi" để tính ship chính xác.`;
    }

    // Nếu subtotal >= 300k => freeship
    if (subtotal >= 300) shipping = 0;

    const grand = Math.max(0, subtotal - discount) + shipping;

    sumSubtotalEl.textContent = fmtK(subtotal);
    sumDiscountEl.textContent = `- ${fmtK(discount)}`;
    sumShippingEl.textContent = fmtK(shipping);
    sumGrandEl.textContent = fmtK(grand);

    if (km !== null) {
      distanceLine.innerHTML = `📍 Khoảng cách của bạn: <strong>${km.toFixed(2)} km</strong> — phí ship: <strong>${fmtK(shipping)}</strong>`;
    }
  });

  /* ===== Init ===== */
  document.addEventListener("DOMContentLoaded", () => {
    renderMenu(drinks);
    updateCartBadge();
  });
})();
