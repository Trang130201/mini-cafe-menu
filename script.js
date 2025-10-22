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
      { name: "Matcha Latte", img: "images/products/matcha_latte.png" },
      { name: "Matcha Cold Whisk", img: "images/products/matcha_cold_whisk.png" }
    ]
  },
  {
    name: "Strawberry Milk",
    price: "35k",
    emoji: "🍓",
    photo: "images/strawberry.png",
    flavor: "strawberry",
    products: [
      { name: "Strawberry Milk", img: "images/products/strawberry_milk.png" },
      { name: "Strawberry Milk Shake", img: "images/products/strawberry_milk_shake.png" }
    ]
  }
];

/* ======= RENDER MENU ======= */
const menuEl = document.getElementById("menu");

function createDrinkCard(item) {
  const card = document.createElement("div");
  card.className = "menu-item";
  card.dataset.flavor = item.flavor;
  card.tabIndex = 0; // có thể focus bằng bàn phím

  card.innerHTML = `
    <p class="title"><span class="icon-emoji">${item.emoji}</span><span>${item.name}</span></p>
    <div class="media">
      <img src="${item.photo}" alt="${item.name}" class="drink-photo" onerror="this.style.display='none'">
    </div>
    <p class="meta">${item.price}</p>
  `;

  // mở modal khi click hoặc Enter/Space
  const open = () => openProductsModal(item);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });

  return card;
}

function renderMenu(list) {
  const frag = document.createDocumentFragment();
  list.forEach(item => frag.appendChild(createDrinkCard(item)));
  menuEl.innerHTML = "";
  menuEl.appendChild(frag);
}

/* ======= MODAL SẢN PHẨM ======= */
const modalEl = document.getElementById("product-modal");
const productListEl = document.getElementById("product-list");

function openProductsModal(drink) {
  // tiêu đề
  modalEl.querySelector(".modal__title").textContent = `Sản phẩm – ${drink.name}`;

  // render grid sản phẩm
  productListEl.innerHTML = drink.products.map(p => `
    <div class="product-card">
      <img class="product-card__img" src="${p.img}" alt="${p.name}"
           onerror="this.replaceWith(placeholderNode('${drink.emoji}'))">
      <div class="product-card__name">${p.name}</div>
    </div>
  `).join("");

  // hiển thị modal
  modalEl.classList.remove("hidden");
  modalEl.setAttribute("aria-hidden", "false");

  // khóa scroll nền (nhẹ)
  document.body.style.overflow = "hidden";
}

function closeProductsModal() {
  modalEl.classList.add("hidden");
  modalEl.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// Cho phép click overlay hoặc nút × để đóng
modalEl.addEventListener("click", (e) => {
  if (e.target.dataset.close === "true") closeProductsModal();
});

// ESC để đóng
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalEl.classList.contains("hidden")) {
    closeProductsModal();
  }
});

/* ======= Placeholder emoji nếu ảnh lỗi (modal) ======= */
function placeholderNode(emoji) {
  const span = document.createElement("span");
  span.className = "product-card__img";
  span.style.display = "flex";
  span.style.alignItems = "center";
  span.style.justifyContent = "center";
  span.style.fontSize = "2rem";
  span.style.background = "#fff";
  span.style.borderRadius = "10px";
  span.textContent = emoji;
  return span.outerHTML;
}

/* ======= KHỞI TẠO ======= */
document.addEventListener("DOMContentLoaded", () => {
  renderMenu(drinks);
});
