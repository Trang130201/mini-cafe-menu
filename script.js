(() => {
  "use strict";

  /* ===================== DỮ LIỆU MENU ===================== */
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

  /* ===================== TIỆN ÍCH GIÁ ===================== */
  const parseK = (s) => {
    if (typeof s === "number") return s;
    const m = String(s).toLowerCase().match(/(\d+)\s*k?/);
    return m ? Number(m[1]) : 0;
  };
  const fmtK = (n) => `${n}k`;

  /* ===================== BIẾN CHUNG ===================== */
  const menuEl = document.getElementById("menu");
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
  const cartBox = document.getElementById("mini-cart");
  const cartItemsEl = document.getElementById("cart-items");
  const cartTotalEl = document.getElementById("cart-total");

  let currentProduct = null;
  let cart = [];

  /* ===================== MENU ===================== */
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

  /* ===================== MODAL ===================== */
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
    modalEl.classList.remove("hidden");
    modalEl.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    resetOptions();
    updateTotal();
  }

  function closeProductsModal() {
    modalEl.classList.add("hidden");
    modalEl.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  modalEl.addEventListener("click", (e) => {
    if (e.target.dataset.close === "true") closeProductsModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalEl.classList.contains("hidden")) closeProductsModal();
  });

  productListEl.addEventListener("click", (e) => {
    const card = e.target.closest(".product-card");
    if (!card) return;
    const title = modalEl.querySelector(".modal__title").textContent.replace("Sản phẩm – ", "");
    const drink = drinks.find(d => d.name === title);
    if (!drink) return;
    const p = drink.products[Number(card.dataset.idx)];
    pickProduct(p);
  });

  function pickProduct(p) {
    currentProduct = p;
    pickedNameEl.textContent = p.name;
    pickedBaseEl.textContent = p.price;
    updateTotal();
  }

  function resetOptions() {
    optUpsize.checked = false;
    optAddMatcha.checked = false;
    optAddStrawberry.checked = false;
    sugarNodes().forEach(r => r.checked = r.value === "0");
  }

  /* ===================== TÍNH GIÁ ===================== */
  function updateTotal() {
    if (!currentProduct) { totalEl.textContent = "0k"; return; }
    let total = parseK(currentProduct.price);
    if (optUpsize.checked) total += 10;
    if (optAddMatcha.checked) total += 5;
    if (optAddStrawberry.checked) total += 15;
    totalEl.textContent = fmtK(total);
  }

  [optUpsize, optAddMatcha, optAddStrawberry].forEach(el => el.addEventListener("change", updateTotal));
  sugarNodes().forEach(r => r.addEventListener("change", updateTotal));

  /* ===================== GIỎ HÀNG ===================== */
  function addToCart() {
    if (!currentProduct) return;
    const item = {
      name: currentProduct.name,
      price: parseK(currentProduct.price),
      upsize: optUpsize.checked,
      addMatcha: optAddMatcha.checked,
      addStrawberry: optAddStrawberry.checked,
      sugar: sugarNodes().find(r => r.checked)?.value || "0"
    };

    let total = item.price;
    if (item.upsize) total += 10;
    if (item.addMatcha) total += 5;
    if (item.addStrawberry) total += 15;
    item.total = total;

    cart.push(item);
    renderCart();
    closeProductsModal();
  }

  function renderCart() {
    if (cart.length === 0) {
      cartBox.classList.add("hidden");
      return;
    }
    cartBox.classList.remove("hidden");

    cartItemsEl.innerHTML = cart.map((c, i) => `
      <li>
        <span>${c.name} (${fmtK(c.total)})</span>
        <button class="cart-remove" data-idx="${i}">×</button>
      </li>
    `).join("");

    const totalSum = cart.reduce((s, c) => s + c.total, 0);
    cartTotalEl.textContent = fmtK(totalSum);
  }

  cartItemsEl.addEventListener("click", (e) => {
    if (e.target.classList.contains("cart-remove")) {
      const idx = Number(e.target.dataset.idx);
      cart.splice(idx, 1);
      renderCart();
    }
  });

  addToCartBtn.addEventListener("click", addToCart);

  /* ===================== INIT ===================== */
  document.addEventListener("DOMContentLoaded", () => {
    renderMenu(drinks);
  });
})();
